/**
 * DataForSEO per-endpoint cost constants (USD).
 * Based on https://dataforseo.com/prices
 */

// SERP API costs per keyword
export const DFS_SERP_COST_PER_KEYWORD = 0.003

// Keywords Data API costs per keyword in batch
export const DFS_SEARCH_VOLUME_COST_PER_KEYWORD = 0.002

// Labs API costs: base + per-row
export const DFS_LABS_BASE_COST = 0.01
export const DFS_LABS_PER_ROW = 0.0001

// On-Page API costs
export const DFS_ONPAGE_BASE_PER_PAGE = 0.000125
export const DFS_INSTANT_PAGE_COST = 0.002

// User data endpoint is free
export const DFS_USER_DATA_COST = 0

/**
 * Estimate SERP check cost based on keyword count.
 */
export function estimateSerpCost(keywordCount: number): number {
  return keywordCount * DFS_SERP_COST_PER_KEYWORD
}

/**
 * Estimate search volume check cost.
 */
export function estimateSearchVolumeCost(keywordCount: number): number {
  return keywordCount * DFS_SEARCH_VOLUME_COST_PER_KEYWORD
}

/**
 * Estimate Labs API call cost (domain overview, ranked keywords, etc.).
 */
export function estimateLabsCallCost(rowCount: number = 0): number {
  return DFS_LABS_BASE_COST + (rowCount * DFS_LABS_PER_ROW)
}

/**
 * Estimate instant page audit cost.
 */
export function estimateInstantPageCost(): number {
  return DFS_INSTANT_PAGE_COST
}
