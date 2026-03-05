import { FIX_PLAN_PROPERTY_ORDER, PHASE_STEP_MAP } from "@/constants/constants";
import { EcosystemFixPlansSSEMessage } from "@/constants/model";
import { getFixPlanSSE } from "@/lib/api";
import { store, useErrorState, useFixPlanState, useUIState } from "@/store/app-store";
import { useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";

export const useFixPlanGeneration = ({
  username,
  repo,
  branch,
}: {
  username: string;
  repo: string;
  branch?: string;
}) => {
  const {
    setEcosystemFixPlan,
    setCurrentFixPlanRepoKey,
    updatePartialFixPlan,
    setIsFixPlanLoading,
    setCurrentFixPlanPhase,
    setCurrentFixPlanStep,
    setFixPlanProgress,
    resetFixPlanState,
  } = useFixPlanState();
  const { setError, setFixPlanError } = useErrorState();
  const { setFixPlanDialogOpen } = useUIState();

  // Ref to store EventSource for cleanup
  const eventSourceRef = useRef<EventSource | null>(null);

  // Set the current repo key when component mounts or repo changes
  useEffect(() => {
    const repoKey = `${username}/${repo}/${branch}`;
    setCurrentFixPlanRepoKey(repoKey);
  }, [username, repo, branch, setCurrentFixPlanRepoKey]);

  // Cleanup EventSource on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        console.log("Cleaning up SSE connection");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Helper to order and update partial fix plan
  const updateOrderedPartialPlan = useCallback(
    (plan: Record<string, unknown>, ecosystem: string) => {
      const orderedUpdate: Record<string, unknown> = {};
      FIX_PLAN_PROPERTY_ORDER.forEach((key) => {
        if (plan[key]) orderedUpdate[key] = plan[key];
      });
      if (Object.keys(orderedUpdate).length > 0) {
        updatePartialFixPlan(orderedUpdate, ecosystem);
      }
    },
    [updatePartialFixPlan],
  );

  const onError = useCallback(
    (error: string, isCritical?: boolean) => {
      toast.dismiss();

      // For critical errors (like complete fix plan failure), stop loading
      if (isCritical) {
        toast.error(error || "Fix plan generation failed");
        setIsFixPlanLoading(false);
        const currentErrors = store.getState().fixPlanError || {};
        setFixPlanError({
          ...currentErrors,
          _global: error,
        });
        return;
      }

      const errorParts = error.split(" ");
      let dependencyKey = "";

      for (const part of errorParts) {
        if (part.includes("@") && part.length > 3) {
          dependencyKey = part;
          break;
        }
      }

      if (dependencyKey) {
        const currentErrors = store.getState().fixPlanError || {};
        setFixPlanError({
          ...currentErrors,
          [dependencyKey]: error,
        });
      }
    },
    [setFixPlanError, setIsFixPlanLoading],
  );

  const onComplete = useCallback(() => {
    toast.dismiss();
    toast.success("Fix plan generation completed!");
    setIsFixPlanLoading(false);
  }, [setIsFixPlanLoading]);

  const onEcosystemFixPlansMessage = useCallback(
    (message: EcosystemFixPlansSSEMessage) => {
      if (!message?.ecosystemFixPlans) return;

      Object.entries(message.ecosystemFixPlans).forEach(([ecosystem, plan]) => {
        setEcosystemFixPlan(ecosystem, JSON.stringify(plan, null, 2));
        updateOrderedPartialPlan(plan, ecosystem);
      });
    },
    [setEcosystemFixPlan, updateOrderedPartialPlan],
  );

  const onProgress = useCallback(
    (data: { step?: string; progress?: string | number; data?: Record<string, unknown> }) => {
      const ecosystem = data.data?.ecosystem as string | undefined;

      if (data.step && PHASE_STEP_MAP[data.step]) {
        setCurrentFixPlanPhase(PHASE_STEP_MAP[data.step], ecosystem);
      }

      if (typeof data.progress === "string") {
        setCurrentFixPlanStep(data.progress);
      }

      if (data.data?.progress && typeof data.data.progress === "number") {
        setFixPlanProgress(data.data.progress, ecosystem);
      }

      // Extract and update tab-specific data as it arrives
      if (data.data) {
        const partialUpdate: Record<string, unknown> = {};

        FIX_PLAN_PROPERTY_ORDER.forEach((key) => {
          if (data.data![key]) partialUpdate[key] = data.data![key];
        });

        // Handle smart_actions specially - merge into dependency_intelligence
        if (data.data.smart_actions) {
          const depIntel = (partialUpdate.dependency_intelligence as Record<string, unknown>) || {};
          depIntel.smart_actions = data.data.smart_actions;
          partialUpdate.dependency_intelligence = depIntel;
        }

        if (ecosystem && Object.keys(partialUpdate).length > 0) {
          updatePartialFixPlan(partialUpdate, ecosystem);
        }
      }
    },
    [setCurrentFixPlanPhase, setCurrentFixPlanStep, setFixPlanProgress, updatePartialFixPlan],
  );

  const generateFixPlan = useCallback(
    async (regenerateFixPlan: boolean = false) => {
      const state = store.getState();
      const { graphData, isFixPlanLoading, selectedBranch, currentFixPlanRepoKey } = state;
      const repoData = currentFixPlanRepoKey ? state.fixPlansByRepo[currentFixPlanRepoKey] : null;
      const hasExistingFixPlan = Boolean(
        Object.keys(repoData?.ecosystemFixPlans || {}).length,
      );

      setFixPlanDialogOpen(true);

      // Prevent multiple simultaneous calls
      if (isFixPlanLoading) return;

      if (!graphData || Object.keys(graphData).length === 0) {
        setError("No graph data available to generate fix plan.");
        setFixPlanError({
          _global: "No graph data available to generate fix plan.",
        })
        return;
      }

      // Open existing fix plan without regenerating
      if (!regenerateFixPlan && hasExistingFixPlan) {
        setFixPlanDialogOpen(true);
        return;
      }

      setFixPlanError({});
      // Clear old data and reset state BEFORE setting loading
      // This ensures skeleton shows immediately
      resetFixPlanState();
      setError("");
      setIsFixPlanLoading(true);

      try {
        // Close existing EventSource if any
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        // Store new EventSource for cleanup
        eventSourceRef.current = await getFixPlanSSE(
          username,
          repo,
          selectedBranch ?? branch!,
          onError,
          onComplete,
          onEcosystemFixPlansMessage,
          onProgress,
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

        // Close EventSource only on error
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      }
    },
    [
      setFixPlanDialogOpen,
      setFixPlanError,
      resetFixPlanState,
      setIsFixPlanLoading,
      setError,
      username,
      repo,
      branch,
      onError,
      onComplete,
      onEcosystemFixPlansMessage,
      onProgress,
    ],
  );

  return { generateFixPlan };
};

export default useFixPlanGeneration;
