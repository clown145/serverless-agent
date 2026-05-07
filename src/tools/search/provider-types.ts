import type { SearchProviderType } from "../../storage/repositories/search-types";
import type { WebSearchInput } from "./schema";

export type SearchResultItem = {
  title: string;
  url: string;
  content?: string;
  score?: number;
  rawContent?: string | null;
  favicon?: string;
};

export type SearchResponse = {
  provider: SearchProviderType;
  query: string;
  answer?: string;
  results: SearchResultItem[];
  responseTime?: number;
  requestId?: string;
  usage?: unknown;
};

export interface SearchProvider {
  readonly name: SearchProviderType;
  search(input: WebSearchInput): Promise<SearchResponse>;
}
