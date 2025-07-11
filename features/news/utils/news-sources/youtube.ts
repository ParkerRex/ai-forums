import { NewsSource, RawItem } from "./types";
import { fetchFromExa } from "./base";

export async function fetchItems(source: NewsSource): Promise<RawItem[]> {
  // For YouTube channels, we'll use Exa's search API
  // In future phases, we could add YouTube API integration
  return fetchFromExa(source);
}