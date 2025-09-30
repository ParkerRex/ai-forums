import * as blog from "./blog";
import * as discord from "./discord";
import * as podcast from "./podcast";
import * as rss from "./rss";
import type { NewsSource, RawItem, SourceType } from "./types";
import * as website from "./website";
import * as xTwitter from "./x-twitter";
import * as youtube from "./youtube";

const fetchers: Record<SourceType, (source: NewsSource) => Promise<RawItem[]>> = {
  rss: rss.fetchItems,
  youtube: youtube.fetchItems,
  x: xTwitter.fetchItems,
  podcast: podcast.fetchItems,
  blog: blog.fetchItems,
  website: website.fetchItems,
  discord: discord.fetchItems,
};

export async function fetchFromSource(source: NewsSource): Promise<RawItem[]> {
  const fetcher = fetchers[source.type];
  if (!fetcher) {
    throw new Error(`Unsupported source type: ${source.type}`);
  }
  return fetcher(source);
}

export * from "./types";
