import { fetchFromExa } from "./base";
import type { NewsSource, RawItem } from "./types";

export async function fetchItems(source: NewsSource): Promise<RawItem[]> {
  // For website sources, we'll use Exa's search API with domain filtering
  return fetchFromExa(source);
}
