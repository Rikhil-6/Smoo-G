export interface ResearchResult {
  title: string;
  snippet: string;
  url: string;
}

/**
 * Fetch research snippets for a debate topic via Bright Data SERP/scraper API.
 * Falls back to mock data when BRIGHTDATA_API_KEY is not configured.
 */
export async function fetchResearch(
  query: string,
  side: "pro" | "con",
): Promise<ResearchResult[]> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  const browserWss = process.env.BRIGHTDATA_PLAYWRIGHT_WSS;
  const zone = process.env.BRIGHTDATA_ZONE ?? "serp_api1";

  if (!apiKey) {
    if (browserWss) {
      const browserResults = await fetchResearchViaBrowserWss(query, side, browserWss);
      if (browserResults.length > 0) {
        return browserResults;
      }
    }
    return mockResearch(query, side, Boolean(browserWss));
  }

  const searchQuery =
    side === "pro"
      ? `${query} benefits evidence supporting`
      : `${query} risks evidence against`;

  try {
    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        zone,
        url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=5`,
        format: "raw",
      }),
    });

    if (!response.ok) {
      console.error("Bright Data error:", await response.text());
      return mockResearch(query, side, Boolean(browserWss));
    }

    const html = await response.text();
    return parseSearchResults(html).slice(0, 5);
  } catch (error) {
    console.error("Bright Data fetch failed:", error);
    return mockResearch(query, side, Boolean(browserWss));
  }
}

async function fetchResearchViaBrowserWss(
  query: string,
  side: "pro" | "con",
  browserWss: string,
): Promise<ResearchResult[]> {
  const searchQuery =
    side === "pro"
      ? `${query} benefits evidence supporting`
      : `${query} risks evidence against`;

  try {
    const playwright = await import("playwright-core");
    const browser = await playwright.chromium.connectOverCDP(browserWss, {
      timeout: 30_000,
    });

    const context = browser.contexts()[0] ?? await browser.newContext();
    const page = await context.newPage();
    await page.goto(
      `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&ia=web`,
      { waitUntil: "domcontentloaded", timeout: 30_000 },
    );

    const items = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href^='http']"));
      const rows: Array<{ title: string; url: string; snippet: string }> = [];

      for (const link of links) {
        const url = link.href;
        const title = (link.textContent || "").replace(/\s+/g, " ").trim();
        if (!title || title.length < 15) continue;
        if (url.includes("duckduckgo.com")) continue;

        const container = link.closest("article, div, li");
        const snippet = (container?.textContent || "")
          .replace(/\s+/g, " ")
          .replace(title, "")
          .trim()
          .slice(0, 220);

        rows.push({
          title,
          url,
          snippet: snippet || `Retrieved via BrightData browser search for "${title}"`,
        });
      }

      return rows;
    });

    await page.close();
    await browser.close();

    const deduped = dedupeResearch(items).slice(0, 6);
    return deduped.map((item) => ({
      title: item.title,
      url: item.url,
      snippet: item.snippet,
    }));
  } catch (error) {
    console.error("Bright Data browser WSS retrieval failed:", error);
    return [];
  }
}

function dedupeResearch(
  rows: Array<{ title: string; url: string; snippet: string }>,
): Array<{ title: string; url: string; snippet: string }> {
  const seen = new Set<string>();
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  for (const row of rows) {
    try {
      const normalized = new URL(row.url);
      const key = `${normalized.hostname}${normalized.pathname}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(row);
    } catch {
      continue;
    }
  }

  return results;
}

function parseSearchResults(html: string): ResearchResult[] {
  const results: ResearchResult[] = [];
  const linkRegex =
    /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([^<]{10,120})<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null && results.length < 5) {
    const url = match[1];
    if (url.includes("google.com")) continue;
    results.push({
      url,
      title: match[2].trim(),
      snippet: `Source related to ${match[2].trim()}`,
    });
  }

  return results.length > 0 ? results : [];
}

function mockResearch(
  query: string,
  side: "pro" | "con",
  brightDataBrowserReady = false,
): ResearchResult[] {
  const stance = side === "pro" ? "in favor of" : "against";
  const sourceLabel = brightDataBrowserReady
    ? "BrightData browser endpoint configured; Playwright capture pending"
    : "Mock research fallback";
  return [
    {
      title: `Recent analysis ${stance} ${query}`,
      snippet: `${sourceLabel}. A 2025 meta-review highlights key arguments ${stance} the proposition, citing longitudinal studies and expert consensus.`,
      url: "https://example.com/research-1",
    },
    {
      title: `Policy brief: ${query}`,
      snippet: `Government and industry reports outline trade-offs, with data points useful for the ${side} position.`,
      url: "https://example.com/research-2",
    },
    {
      title: `Expert commentary on ${query}`,
      snippet: `Subject-matter experts weigh evidence quality, causality, and implementation challenges.`,
      url: "https://example.com/research-3",
    },
  ];
}
