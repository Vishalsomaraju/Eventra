import { PlanBudget, PlanBudgetItem } from '../types/plan';

export interface RawBudgetItemInput {
  category: string;
  percentage: number;
  description: string;
}

export const DEFAULT_BUDGET_DISCLAIMER =
  'Estimated allocation breakdown for planning guidance only. Actual vendor quotations and seasonal pricing may vary.';

/**
 * Reconciles category budget allocations with exact integer paise arithmetic.
 * Ensures:
 * 1. All allocations are nonnegative finite numbers.
 * 2. Sum of allocated amounts equals budgetInr exactly to the paise.
 * 3. Remainder paise from floor divisions are cleanly absorbed into the final category.
 * 4. Percentage shares are normalized cleanly if they do not already sum to 100.
 */
export function reconcileBudgetAllocations(
  rawCategories: RawBudgetItemInput[],
  budgetInr: number
): PlanBudgetItem[] {
  if (rawCategories.length === 0) {
    return [];
  }

  // Ensure non-negative finite budget in integer paise
  const safeBudgetInr = Math.max(0, Number.isFinite(budgetInr) ? budgetInr : 0);
  const totalPaise = Math.round(safeBudgetInr * 100);

  // Normalize percentages: sanitize non-finite or negative percentages to 0
  const validPercentages = rawCategories.map((c) =>
    Number.isFinite(c.percentage) && c.percentage > 0 ? c.percentage : 0
  );
  const totalPercentage = validPercentages.reduce((sum, p) => sum + p, 0);

  let allocatedPaiseSum = 0;
  const categories: PlanBudgetItem[] = [];

  for (let i = 0; i < rawCategories.length; i++) {
    const c = rawCategories[i]!;
    const isLast = i === rawCategories.length - 1;
    const catPercent = validPercentages[i]!;

    // Normalized display percentage
    const normalizedPercentage =
      totalPercentage === 100
        ? catPercent
        : totalPercentage > 0
          ? Math.round((catPercent / totalPercentage) * 1000) / 10
          : Math.round((100 / rawCategories.length) * 10) / 10;

    let catPaise = 0;
    if (isLast) {
      // Allocate exact remaining paise to the final category (absorbs integer rounding)
      catPaise = Math.max(0, totalPaise - allocatedPaiseSum);
    } else {
      const rawShare = totalPercentage > 0 ? catPercent / totalPercentage : 1 / rawCategories.length;
      const targetPaise = Math.floor(totalPaise * rawShare);
      catPaise = Math.min(targetPaise, Math.max(0, totalPaise - allocatedPaiseSum));
      allocatedPaiseSum += catPaise;
    }

    categories.push({
      category: c.category.slice(0, 80),
      allocatedInr: catPaise / 100,
      percentage: normalizedPercentage,
      description: c.description.slice(0, 250),
    });
  }

  return categories;
}

/**
 * Builds a standardized PlanBudget object with reconciled integer-paise allocations
 * and standard disclaimer.
 */
export function buildPlanBudget(
  rawCategories: RawBudgetItemInput[],
  budgetInr: number,
  disclaimer: string = DEFAULT_BUDGET_DISCLAIMER
): PlanBudget {
  const categories = reconcileBudgetAllocations(rawCategories, budgetInr);
  return {
    totalBudgetInr: budgetInr,
    currency: 'INR',
    disclaimer,
    categories,
  };
}
