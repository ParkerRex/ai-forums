import { fetchFromExa } from "./base";
import type { NewsSource, RawItem } from "./types";

export async function fetchItems(source: NewsSource): Promise<RawItem[]> {
  // For blog sites, we'll use Exa's search API with domain filtering
  return fetchFromExa(source);
}
