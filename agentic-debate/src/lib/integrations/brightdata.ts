export interface ResearchResult {
  title: string;
  snippet: string;
  url: string;
}

export async function fetchResearch(
  query: string,
  side: "pro" | "con",
): Promise<ResearchResult[]> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  const zone = process.env.BRIGHTDATA_ZONE ?? "serp_api1";

  if (!apiKey) {
    return mockResearch(query, side);
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
      return mockResearch(query, side);
    }

    const html = await response.text();
    return parseSearchResults(html).slice(0, 5);
  } catch (error) {
    console.error("Bright Data fetch failed:", error);
    return mockResearch(query, side);
  }
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

function mockResearch(query: string, side: "pro" | "con"): ResearchResult[] {
  const stance = side === "pro" ? "in favor of" : "against";
  return [
    {
      title: `Recent analysis ${stance} ${query}`,
      snippet: `A 2025 meta-review highlights key arguments ${stance} the proposition, citing longitudinal studies and expert consensus.`,
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
