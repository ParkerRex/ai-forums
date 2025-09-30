export type SourceType = "rss" | "youtube" | "podcast" | "blog" | "x" | "website" | "discord";

export interface NewsSource {
  type: SourceType;
  url: string;
  name: string;
}

export interface DiscordNewsSource extends NewsSource {
  type: "discord";
  guildId: string;
  channels?: string[];
}

export interface RawItem {
  title: string;
  url: string;
  publishedDate?: string;
  text?: string;
}

export interface NewsItem extends RawItem {
  author?: string;
  summary?: string;
  source: string;
}
