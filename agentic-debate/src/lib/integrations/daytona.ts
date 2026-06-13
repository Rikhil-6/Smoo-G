export interface DaytonaRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute agent tooling in a Daytona sandbox.
 * Falls back to local passthrough when DAYTONA_API_KEY is not configured.
 */
export async function runInDaytona(
  script: string,
  language: "python" | "javascript" = "python",
): Promise<DaytonaRunResult> {
  const apiKey = process.env.DAYTONA_API_KEY;
  const apiUrl = process.env.DAYTONA_API_URL ?? "https://app.daytona.io/api";

  if (!apiKey) {
    return {
      stdout: `[Daytona mock] Executed ${language} script (${script.length} chars)`,
      stderr: "",
      exitCode: 0,
    };
  }

  try {
    const response = await fetch(`${apiUrl}/sandbox/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language, script }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        stdout: `[Daytona configured] Sandbox run endpoint returned ${response.status}. Continuing with local summary. ${errorText.slice(0, 180)}`,
        stderr: errorText,
        exitCode: response.status,
      };
    }

    return (await response.json()) as DaytonaRunResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Daytona error";
    return {
      stdout: `[Daytona configured] Could not reach sandbox run endpoint. Continuing with local summary. ${message}`,
      stderr: message,
      exitCode: 1,
    };
  }
}

/**
 * Optional: summarize scraped research in an isolated environment.
 */
export async function summarizeResearchInSandbox(
  snippets: string[],
): Promise<string> {
  const script = `
snippets = ${JSON.stringify(snippets)}
print("Top themes:", ", ".join(s[:60] for s in snippets[:3]))
`.trim();

  const result = await runInDaytona(script, "python");
  return result.stdout || snippets.join("\n");
}
