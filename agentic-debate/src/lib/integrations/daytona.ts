export interface DaytonaRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

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
    throw new Error(`Daytona error: ${errorText}`);
  }

  return (await response.json()) as DaytonaRunResult;
}

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
