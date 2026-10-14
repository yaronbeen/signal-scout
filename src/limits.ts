export const searchDepths = [5, 10, 20, 50, 100, 250] as const;

export function isSearchDepth(value: unknown): value is number {
  return typeof value === 'number' && searchDepths.some(depth => depth === value);
}

// Two query types per topic, ten results per page. Keep the entire request
// below 50 upstream calls (including the account-zone lookup).
export function searchPagesPerQuery(depth: number, keywordCount: number): number {
  return Math.min(Math.ceil(depth / 20), Math.floor(48 / (2 * keywordCount)));
}
