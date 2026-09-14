// Shared EPR reference data and helpers used by the dashboard, the company
// details page, and the estimator. Keep the rate matrix in sync with the
// target_rates table in Supabase.

export const COMPANY_TYPES = [
  'Water Bottler',
  'Snack/Chips Manufacturer',
  'Tea Estate',
  'FMCG',
  'Other',
] as const;

// Plain-language category options for the pickers.
export const CATEGORIES = [
  { value: 'category_1_rigid', label: 'Category I, rigid (bottles, jars, containers)' },
  { value: 'category_2_flexible', label: 'Category II, flexible (films, pouches, sachets)' },
  { value: 'category_3_multilayered', label: 'Category III, multilayered (foil-laminated packs)' },
] as const;

export const FINANCIAL_YEARS = ['FY 2025-26', 'FY 2026-27', 'FY 2027-28'] as const;

// Recycling target percentage by financial year and category. Confirmed for
// these years. Add earlier years only after checking the gazette.
const RATES: Record<string, Record<string, number>> = {
  'FY 2025-26': { category_1_rigid: 0.6, category_2_flexible: 0.4, category_3_multilayered: 0.4 },
  'FY 2026-27': { category_1_rigid: 0.7, category_2_flexible: 0.5, category_3_multilayered: 0.5 },
  'FY 2027-28': { category_1_rigid: 0.8, category_2_flexible: 0.6, category_3_multilayered: 0.6 },
};

// Indicative credit price range in INR per kg. Replace with your own indexed
// pricing before showing clients. Always label it indicative.
export const INDICATIVE_RATE_LOW = 25;
export const INDICATIVE_RATE_HIGH = 40;

export function targetPercent(fy: string, category: string | null | undefined): number | null {
  if (!category) return null;
  return RATES[fy]?.[category] ?? null;
}

export function categoryLabel(value: string | null | undefined): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? 'Not set';
}

export function inr(n: number): string {
  return '\u20B9' + Math.round(n).toLocaleString('en-IN');
}
