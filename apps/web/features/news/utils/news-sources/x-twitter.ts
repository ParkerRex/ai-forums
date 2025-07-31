import { NewsSource, RawItem } from "./types";
import { fetchFromExa } from "./base";

export async function fetchItems(source: NewsSource): Promise<RawItem[]> {
  // For X/Twitter accounts, we'll use Exa's search API
  // In future phases, we could add X API integration
  return fetchFromExa(source);
}