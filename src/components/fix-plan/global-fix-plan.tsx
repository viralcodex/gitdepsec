import React, { useMemo } from "react";
import { UnifiedFixPlan } from "../../constants/model";
import UnifiedFixPlanComponent from "./unified-fix-plan";
import { useFixPlanState } from "@/store/app-store";

interface GlobalFixPlanProps {
  globalFixPlan?: string;
  isFixPlanLoading?: boolean;
  ecosystem?: string; // Optional ecosystem for multi-ecosystem support
}

const GlobalFixPlan = (props: GlobalFixPlanProps) => {
  const { globalFixPlan, isFixPlanLoading, ecosystem } = props;
  // Access appropriate partial fix plan from store
  const { partialFixPlan, ecosystemPartialFixPlans } = useFixPlanState();
  const partialFixPlanData = ecosystem 
    ? ecosystemPartialFixPlans[ecosystem] 
    : partialFixPlan;

  // Parse the unified fix plan from JSON string
  const parsedFixPlan = useMemo<UnifiedFixPlan | null>(() => {
    if (!globalFixPlan) return null;

    try {
      // Check if it's already an object or needs parsing
      if (typeof globalFixPlan === "string") {
        // Clean up markdown formatting if present
        let cleanedData = globalFixPlan;

        // Remove markdown code fences if present
        if (cleanedData.includes("```json")) {
          cleanedData = cleanedData
            .replace(/```json\s*/g, "")
            .replace(/\s*```/g, "");
        }
        // Try parsing once
        let parsed = JSON.parse(cleanedData);
        // If the result is still a string, parse again (double-encoded JSON)
        if (typeof parsed === "string") {
          // Clean markdown formatting again if needed
          if (parsed.includes("```json")) {
            parsed = parsed.replace(/```json\s*/g, "").replace(/\s*```/g, "");
          }
          parsed = JSON.parse(parsed);
        }
        return parsed as UnifiedFixPlan;
      }
      return globalFixPlan as UnifiedFixPlan;
    } catch (error) {
      console.error("Error parsing globalFixPlan:", error);
      return null;
    }
  }, [globalFixPlan]);

  return (
    <UnifiedFixPlanComponent
      fixPlan={parsedFixPlan}
      partialFixPlan={partialFixPlanData}
      isLoading={isFixPlanLoading || false}
    />
  );
};

export default GlobalFixPlan;
