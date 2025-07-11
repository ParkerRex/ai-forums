import { NewsSource, RawItem } from "./types";
import { fetchFromExa } from "./base";

export async function fetchItems(source: NewsSource): Promise<RawItem[]> {
  // For RSS feeds, we'll use Exa's search API with domain filtering
  // In future phases, we could add proper RSS parsing
  return fetchFromExa(source);
}