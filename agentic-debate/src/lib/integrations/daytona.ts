export interface DaytonaRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  sandboxId?: string;
}

export interface DaytonaSandboxInfo {
  id: string;
  label: string;
  mode: "live" | "mock";
}

const sandboxByLabel = new Map<string, string>();
const createInFlightByLabel = new Map<string, Promise<DaytonaSandboxInfo>>();

function daytonaApiUrl(): string {
  return process.env.DAYTONA_API_URL ?? "https://app.daytona.io/api";
}

function daytonaProxyUrl(): string {
  return process.env.DAYTONA_PROXY_URL ?? "https://proxy.app.daytona.io";
}

function daytonaApiKey(): string | undefined {
  return process.env.DAYTONA_API_KEY;
}

function buildExecCommand(
  script: string,
  language: "python" | "javascript",
): string {
  const encoded = Buffer.from(script, "utf8").toString("base64");
  if (language === "python") {
    return `python3 -c "import base64; exec(base64.b64decode('${encoded}').decode('utf-8'))"`;
  }
  return `node -e "eval(Buffer.from('${encoded}','base64').toString('utf8'))"`;
}

async function createSandbox(label: string): Promise<DaytonaSandboxInfo> {
  const apiKey = daytonaApiKey();
  if (!apiKey) {
    const mockId = `mock-${label}`;
    sandboxByLabel.set(label, mockId);
    return { id: mockId, label, mode: "mock" };
  }

  const cached = sandboxByLabel.get(label);
  if (cached) {
    return { id: cached, label, mode: "live" };
  }

  const existingCreate = createInFlightByLabel.get(label);
  if (existingCreate) return existingCreate;

  const createPromise = (async () => {
    const response = await fetch(`${daytonaApiUrl()}/sandbox`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: process.env.DAYTONA_SANDBOX_LANGUAGE ?? "python",
        autoStopInterval: Number(process.env.DAYTONA_AUTO_STOP_MINUTES ?? 10),
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`sandbox create failed (${response.status}): ${details.slice(0, 180)}`);
    }

    const data = (await response.json()) as { id?: string; sandboxId?: string };
    const sandboxId = data.id ?? data.sandboxId;
    if (!sandboxId) {
      throw new Error("sandbox create response did not include id");
    }

    sandboxByLabel.set(label, sandboxId);
    return { id: sandboxId, label, mode: "live" as const };
  })();

  createInFlightByLabel.set(label, createPromise);
  try {
    return await createPromise;
  } finally {
    createInFlightByLabel.delete(label);
  }
}

/**
 * Pre-create Daytona sandboxes per agent to keep execution isolated.
 */
export async function provisionDaytonaSandboxes(
  labels: string[],
): Promise<DaytonaSandboxInfo[]> {
  const uniqueLabels = Array.from(new Set(labels.filter(Boolean)));
  const results: DaytonaSandboxInfo[] = [];

  for (const label of uniqueLabels) {
    try {
      results.push(await createSandbox(label));
    } catch {
      results.push({ id: `mock-${label}`, label, mode: "mock" });
    }
  }

  return results;
}

/**
 * Execute agent tooling in a Daytona sandbox.
 * Uses a live sandbox when DAYTONA_API_KEY is configured, otherwise mock mode.
 */
export async function runInDaytona(
  script: string,
  language: "python" | "javascript" = "python",
  sandboxLabel = "default",
): Promise<DaytonaRunResult> {
  const apiKey = daytonaApiKey();

  if (!apiKey) {
    return {
      stdout: `[Daytona mock] Executed ${language} script (${script.length} chars)`,
      stderr: "",
      exitCode: 0,
      sandboxId: `mock-${sandboxLabel}`,
    };
  }

  try {
    const sandbox = await createSandbox(sandboxLabel);
    const command = buildExecCommand(script, language);
    const response = await fetch(
      `${daytonaProxyUrl()}/toolbox/${sandbox.id}/process/execute`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        stdout: "",
        stderr: errorText,
        exitCode: response.status,
        sandboxId: sandbox.id,
      };
    }

    const payload = (await response.json()) as {
      result?: string;
      stdout?: string;
      stderr?: string;
      exitCode?: number;
      exit_code?: number;
    };

    return {
      stdout: payload.stdout ?? payload.result ?? "",
      stderr: payload.stderr ?? "",
      exitCode: payload.exitCode ?? payload.exit_code ?? 0,
      sandboxId: sandbox.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Daytona error";
    return {
      stdout: "",
      stderr: `[Daytona] execution failed: ${message}`,
      exitCode: 1,
      sandboxId: sandboxByLabel.get(sandboxLabel),
    };
  }
}

/**
 * Summarize scraped research in an isolated sandbox.
 */
export async function summarizeResearchInSandbox(
  snippets: string[],
  sandboxLabel = "summary",
): Promise<string> {
  const script = `
snippets = ${JSON.stringify(snippets)}
print("Top themes:", ", ".join(s[:80] for s in snippets[:4]))
`.trim();

  const result = await runInDaytona(script, "python", sandboxLabel);
  return result.stdout || snippets.join("\n");
}
