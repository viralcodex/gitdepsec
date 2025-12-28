import {
  FixPlanSSEMessage,
  GlobalFixPlanSSEMessage,
  FixOptimisationPlanSSEMessage,
  ConflictResolutionPlanSSEMessage,
  StrategyRecommendationSSEMessage,
} from "@/constants/model";
import { getFixPlanSSE } from "@/lib/api";
import {
  store,
  useErrorState,
  useFixPlanState,
  useUIState,
} from "@/store/app-store";
import { useCallback } from "react";
import toast from "react-hot-toast";

export const useFixPlanGeneration = ({
  username,
  repo,
  branch,
}: {
  username: string;
  repo: string;
  branch: string;
}) => {
  const {
    setFixPlan,
    setGlobalFixPlan,
    setFixOptimizationPlan,
    setConflictResolutionPlan,
    setStrategyPlan,
    setIsFixPlanLoading,
    setIsFixPlanGenerated,
    resetFixPlanState,
  } = useFixPlanState();
  const { setError, setFixPlanError } = useErrorState();
  const { setFixPlanDialogOpen } = useUIState();
  const onMessage = useCallback(
    (message: FixPlanSSEMessage) => {
      if (
        message &&
        message.dependencyName &&
        message.dependencyVersion &&
        message.fixPlan
      ) {
        const key = `${message.dependencyName}@${message.dependencyVersion}`;

        setFixPlan((prev) => {
          const fixPlanString =
            typeof message.fixPlan === "object"
              ? JSON.stringify(message.fixPlan, null, 2)
              : String(message.fixPlan);

          return {
            ...prev,
            [key]: fixPlanString,
          };
        });
      } else {
        console.warn("Invalid message structure received:", message);
      }
    },
    [setFixPlan]
  );

  const onError = useCallback(
    (error: string) => {
      toast.dismiss();

      const errorParts = error.split(" ");
      let dependencyKey = "";

      for (const part of errorParts) {
        if (part.includes("@") && part.length > 3) {
          dependencyKey = part;
          break;
        }
      }

      if (dependencyKey) {
        // console.log("Error for dependency:", dependencyKey, error);
        const currentErrors = store.getState().fixPlanError || {};
        setFixPlanError({
          ...currentErrors,
          [dependencyKey]: error,
        });
      } else {
        // console.log("General error (no specific dependency):", error);
      }
    },
    [setFixPlanError]
  );

  const onComplete = useCallback(() => {
    toast.dismiss();
    toast.success("Fix plan generation completed!");
    setIsFixPlanGenerated(true);
    setIsFixPlanLoading(false);
  }, [setIsFixPlanGenerated, setIsFixPlanLoading]);

  const onGlobalFixPlanMessage = useCallback(
    (message: GlobalFixPlanSSEMessage) => {
      if (message && message.globalFixPlan) {
        const globalPlan =
          typeof message.globalFixPlan === "object"
            ? JSON.stringify(message.globalFixPlan, null, 2)
            : String(message.globalFixPlan);

        setGlobalFixPlan(globalPlan);
      } else {
        console.warn(
          "Invalid global fix plan message structure received:",
          message
        );
      }
    },
    [setGlobalFixPlan]
  );

  const onFixOptimizationMessage = useCallback(
    (message: FixOptimisationPlanSSEMessage) => {
      if (message && message.optimisedPlan) {
        const fixOptPlan =
          typeof message.optimisedPlan === "object"
            ? JSON.stringify(message.optimisedPlan, null, 2)
            : String(message.optimisedPlan);

        setFixOptimizationPlan(fixOptPlan);
      } else {
        console.warn(
          "Invalid fix optimization plan message structure received:",
          message
        );
      }
    },
    [setFixOptimizationPlan]
  );

  const onConflictResolutionMessage = useCallback(
    (message: ConflictResolutionPlanSSEMessage) => {
      if (message && message.conflictResolutionPlan) {
        const conflictPlan =
          typeof message.conflictResolutionPlan === "object"
            ? JSON.stringify(message.conflictResolutionPlan, null, 2)
            : String(message.conflictResolutionPlan);

        setConflictResolutionPlan(conflictPlan);
      } else {
        console.warn(
          "Invalid conflict resolution plan message structure received:",
          message
        );
      }
    },
    [setConflictResolutionPlan]
  );

  const onStrategyRecommendationMessage = useCallback(
    (message: StrategyRecommendationSSEMessage) => {
      if (message && message.finalStrategy) {
        const strategyRec =
          typeof message.finalStrategy === "object"
            ? JSON.stringify(message.finalStrategy, null, 2)
            : String(message.finalStrategy);

        setStrategyPlan(strategyRec);
      } else {
        console.warn(
          "Invalid strategy recommendation message structure received:",
          message
        );
      }
    },
    [setStrategyPlan]
  );

  const generateFixPlan = useCallback(
    async (regenerateFixPlan: boolean = false) => {
      const state = store.getState();
      const graphData = state.graphData;
      const isFixPlanLoading = state.isFixPlanLoading;
      const fixPlan = state.fixPlan;
      const selectedBranch = state.selectedBranch;
      
      if (!graphData || Object.keys(graphData).length === 0) {
        setError("No graph data available to generate fix plan.");
        return;
      }
      
      setFixPlanDialogOpen(true);
      
      if (isFixPlanLoading) return; // Prevent multiple simultaneous calls
      
      setFixPlanError({});
      
      // Check if fix plan already exists
      if (Object.keys(fixPlan).length > 0 && !regenerateFixPlan) {
        setFixPlanDialogOpen(true);
        return;
      }
      
      resetFixPlanState();
      setIsFixPlanLoading(true);
      setError("");
      
      try {
        await getFixPlanSSE(
          username,
          repo,
          selectedBranch ?? branch,
          onMessage,
          onError,
          onComplete,
          onGlobalFixPlanMessage,
          onFixOptimizationMessage,
          onConflictResolutionMessage,
          onStrategyRecommendationMessage
        );
      } catch (error) {
        console.error("Error generating fix plan:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An error occurred while generating the fix plan.";
        toast.error(errorMessage);
        setError(errorMessage);
        resetFixPlanState();
      }
    },
    [
      username,
      repo,
      branch,
      setError,
      setFixPlanDialogOpen,
      setFixPlanError,
      resetFixPlanState,
      setIsFixPlanLoading,
      onMessage,
      onError,
      onComplete,
      onGlobalFixPlanMessage,
      onFixOptimizationMessage,
      onConflictResolutionMessage,
      onStrategyRecommendationMessage,
    ]
  );

  return { generateFixPlan };
};

export default useFixPlanGeneration;
