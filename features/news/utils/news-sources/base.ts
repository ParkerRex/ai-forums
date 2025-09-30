import type { NewsSource, RawItem } from "./types";

export async function fetchFromExa(source: NewsSource, numResults: number = 5): Promise<RawItem[]> {
  const requestBody: {
    query: string;
    numResults: number;
    includeDomains?: string[];
  } = {
    query: `${source.name} latest updates`,
    numResults,
  };

  // Extract domain for website sources
  if (source.type === "website" || source.type === "blog") {
    try {
      const host = new URL(source.url).hostname;
      if (host) {
        requestBody.includeDomains = [host];
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  const response = await fetch("/api/news", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch news from ${source.name}`);
  }

  const data = await response.json();
  const results: RawItem[] = [];

  for (const item of data.results || []) {
    results.push({
      title: item.title,
      url: item.url,
      publishedDate: item.publishedDate,
      text: item.text || item.summary,
    });
  }

  return results;
}
