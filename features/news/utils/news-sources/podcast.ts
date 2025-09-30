import { fetchFromExa } from "./base";
import type { NewsSource, RawItem } from "./types";

export async function fetchItems(source: NewsSource): Promise<RawItem[]> {
  // For podcasts, we'll use Exa's search API
  // In future phases, we could add podcast RSS parsing
  return fetchFromExa(source);
}
