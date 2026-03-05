import React, { useMemo } from "react";
import { UnifiedFixPlan } from "../../constants/model";
import UnifiedFixPlanComponent from "./unified-fix-plan";
import { useFixPlanState } from "@/store/app-store";

interface GlobalFixPlanProps {
  fixPlan?: string;
  isFixPlanLoading?: boolean;
  ecosystem: string;
}

const GlobalFixPlan = (props: GlobalFixPlanProps) => {
  const { fixPlan, isFixPlanLoading, ecosystem } = props;
  const { ecosystemPartialFixPlans } = useFixPlanState();
  const partialFixPlanData = ecosystemPartialFixPlans[ecosystem];

  // Parse the unified fix plan from JSON string
  const parsedFixPlan = useMemo<UnifiedFixPlan | null>(() => {
    if (!fixPlan) return null;

    try {
      // Check if it's already an object or needs parsing
      if (typeof fixPlan === "string") {
        // Clean up markdown formatting if present
        let cleanedData = fixPlan;

        // Remove markdown code fences if present
        if (cleanedData.includes("```json")) {
          cleanedData = cleanedData.replace(/```json\s*/g, "").replace(/\s*```/g, "");
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
      return fixPlan as UnifiedFixPlan;
    } catch (error) {
      console.error("Error parsing fixPlan:", error);
      return null;
    }
  }, [fixPlan]);

  return (
    <UnifiedFixPlanComponent
      fixPlan={parsedFixPlan}
      partialFixPlan={partialFixPlanData}
      isLoading={isFixPlanLoading || false}
    />
  );
};

export default GlobalFixPlan;
