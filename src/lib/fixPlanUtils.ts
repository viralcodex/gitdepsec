import { FIX_PLAN_PROPERTY_ORDER } from "@/constants/constants";

/**
 * Utility functions for fix plan data manipulation
 */

/**
 * Orders fix plan data according to FIX_PLAN_PROPERTY_ORDER
 * @param data - Unordered fix plan data
 * @returns Ordered fix plan data
 */
export function orderFixPlanData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  FIX_PLAN_PROPERTY_ORDER.forEach((key) => {
    if (data[key] !== undefined) {
      ordered[key] = data[key];
    }
  });
  return ordered;
}

/**
 * Deep merges two objects, with special handling for nested objects
 * @param target - Target object
 * @param source - Source object to merge
 * @returns Merged object
 */
export function deepMergeFixPlanData(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    const targetValue = result[key];

    // Deep merge for objects, otherwise replace
    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key] = {
        ...(targetValue as Record<string, unknown>),
        ...(sourceValue as Record<string, unknown>),
      };
    } else {
      result[key] = sourceValue;
    }
  });

  return result;
}

/**
 * Checks if two fix plan objects have changed
 * @param oldData - Old fix plan data
 * @param newData - New fix plan data
 * @returns True if data has changed
 */
export function hasFixPlanChanged(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
): boolean {
  return FIX_PLAN_PROPERTY_ORDER.some((key) => {
    const oldVal = oldData[key];
    const newVal = newData[key];
    // Use JSON comparison for deep equality check
    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
  });
}
