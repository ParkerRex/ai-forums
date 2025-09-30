import { fetchFromExa } from "./base";
import type { NewsSource, RawItem } from "./types";

export async function fetchItems(source: NewsSource): Promise<RawItem[]> {
  // For YouTube channels, we'll use Exa's search API
  // In future phases, we could add YouTube API integration
  return fetchFromExa(source);
}
