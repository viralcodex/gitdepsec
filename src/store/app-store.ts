import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { useShallow } from "zustand/shallow";
import { AppStore } from "./types";
import {
  createRepoSlice,
  createFileSlice,
  createErrorSlice,
  createGraphSlice,
  createDiagramSlice,
  createFixPlanSlice,
  createUISlice,
  createSavedHistorySlice,
} from "./slices";
import { EMPTY_OBJECT, EMPTY_ECOSYSTEM_PARTIAL, EMPTY_ECOSYSTEM_FIXES, EMPTY_ECOSYSTEM_PROGRESS } from "@/constants/constants";
export const store = create<AppStore>()(
  devtools(
    persist(
      (...a) => ({
        ...createRepoSlice(...a),
        ...createFileSlice(...a),
        ...createErrorSlice(...a),
        ...createGraphSlice(...a),
        ...createDiagramSlice(...a),
        ...createFixPlanSlice(...a),
        ...createUISlice(...a),
        ...createSavedHistorySlice(...a),
        
        // Global actions
        clearForm: () => {
          const state = store.getState();
          state.resetRepoState();
          state.resetErrorState();
        },
        resetNavigationState: () => {
          const state = store.getState();
          state.resetFileState();
          state.resetUIState();
        },
      }),
      {
        name: "gitdepsec_storage",
        partialize: (state) => ({
          branches: state.branches,
          selectedBranch: state.selectedBranch,
          loadedRepoKey: state.loadedRepoKey,
          hasMore: state.hasMore,
          totalBranches: state.totalBranches,
          currentUrl: state.currentUrl,
          savedHistoryItems: state.savedHistoryItems,
          fixPlansByRepo: state.fixPlansByRepo,
          currentFixPlanRepoKey: state.currentFixPlanRepoKey,
          // Ecosystem-specific progress state (top-level)
          ecosystemProgress: state.ecosystemProgress,
          selectedEcosystem: state.selectedEcosystem,
        }),
      },
    ),
    { name: "GitDepSec" },
  ),
);

// Selector helper to reduce boilerplate
function createSelector<T>(selector: (state: AppStore) => T) {
  return () => store(useShallow(selector));
}

// Selectors
export const useRepoState = createSelector((s) => ({
  branches: s.branches,
  selectedBranch: s.selectedBranch,
  loadingBranches: s.loadingBranches,
  hasMore: s.hasMore,
  totalBranches: s.totalBranches,
  page: s.page,
  currentUrl: s.currentUrl,
  loadedRepoKey: s.loadedRepoKey,
  setBranches: s.setBranches,
  setSelectedBranch: s.setSelectedBranch,
  setLoadingBranches: s.setLoadingBranches,
  loadNextPage: s.loadNextPage,
  setHasMore: s.setHasMore,
  setTotalBranches: s.setTotalBranches,
  setPage: s.setPage,
  setCurrentUrl: s.setCurrentUrl,
  setLoadedRepoKey: s.setLoadedRepoKey,
  resetRepoState: s.resetRepoState,
}));

export const useFileState = createSelector((s) => ({
  newFileName: s.newFileName,
  uploaded: s.uploaded,
  setNewFileName: s.setNewFileName,
  setUploaded: s.setUploaded,
  setFileUploadState: s.setFileUploadState,
  resetFileState: s.resetFileState,
}));

export const useErrorState = createSelector((s) => ({
  error: s.error,
  manifestError: s.manifestError,
  branchError: s.branchError,
  fixPlanError: s.fixPlanError,
  setError: s.setError,
  setManifestError: s.setManifestError,
  setBranchError: s.setBranchError,
  setFixPlanError: s.setFixPlanError,
  resetErrorState: s.resetErrorState,
}));

export const useGraphState = createSelector((s) => ({
  dependencies: s.dependencies,
  graphData: s.graphData,
  manifestData: s.manifestData,
  loading: s.loading,
  graphRepoKey: s.graphRepoKey,
  setDependencies: s.setDependencies,
  setGraphData: s.setGraphData,
  setManifestData: s.setManifestData,
  setLoading: s.setLoading,
  resetGraphState: s.resetGraphState,
}));

export const useDiagramState = createSelector((s) => ({
  selectedNode: s.selectedNode,
  isDiagramExpanded: s.isDiagramExpanded,
  setIsDiagramExpanded: s.setIsDiagramExpanded,
  setSelectedNode: s.setSelectedNode,
  resetDiagramState: s.resetDiagramState,
}));

export const useFixPlanState = createSelector((s) => {
  const repoKey = s.currentFixPlanRepoKey;
  const repoData = repoKey ? s.fixPlansByRepo[repoKey] : null;

  return {
    globalFixPlan: repoData?.globalFixPlan || "",
    partialFixPlan: s.partialFixPlan || EMPTY_OBJECT,
    ecosystemPartialFixPlans:
      repoData?.ecosystemPartialFixPlans || EMPTY_ECOSYSTEM_PARTIAL,
    ecosystemFixPlans: repoData?.ecosystemFixPlans || EMPTY_ECOSYSTEM_FIXES,
    hasMultipleEcosystems: repoData?.hasMultipleEcosystems || false,
    selectedEcosystem: s.selectedEcosystem,
    isFixPlanLoading: s.isFixPlanLoading,
    isFixPlanGenerated: repoData?.isFixPlanGenerated || false,
    currentFixPlanPhase: s.currentFixPlanPhase,
    currentFixPlanStep: s.currentFixPlanStep,
    fixPlanProgress: s.fixPlanProgress,
    ecosystemProgress: s.ecosystemProgress || EMPTY_ECOSYSTEM_PROGRESS,
    currentFixPlanRepoKey: s.currentFixPlanRepoKey,
    fixPlansByRepo: s.fixPlansByRepo,

    
    setGlobalFixPlan: s.setGlobalFixPlan,
    setEcosystemFixPlan: s.setEcosystemFixPlan,
    setCurrentFixPlanRepoKey: s.setCurrentFixPlanRepoKey,
    updatePartialFixPlan: s.updatePartialFixPlan,
    clearPartialFixPlan: s.clearPartialFixPlan,
    setIsFixPlanLoading: s.setIsFixPlanLoading,
    setCurrentFixPlanPhase: s.setCurrentFixPlanPhase,
    setCurrentFixPlanStep: s.setCurrentFixPlanStep,
    setFixPlanProgress: s.setFixPlanProgress,
    setSelectedEcosystem: s.setSelectedEcosystem,
    resetFixPlanState: s.resetFixPlanState,
  };
});

export const useFixPlanProgress = createSelector((s) => ({
  currentPhase: s.currentFixPlanPhase,
  currentStep: s.currentFixPlanStep,
  progress: s.fixPlanProgress,
  isLoading: s.isFixPlanLoading,
}));

export const useFixPlanData = createSelector((s) => {
  const repoKey = s.currentFixPlanRepoKey;
  const repoData = repoKey ? s.fixPlansByRepo[repoKey] : null;

  return {
    globalFixPlan: repoData?.globalFixPlan || "",
    ecosystemFixPlans: repoData?.ecosystemFixPlans || {},
    partialFixPlan: s.partialFixPlan || EMPTY_OBJECT,
    isGenerated: repoData?.isFixPlanGenerated || false,
  };
});

export const useUIState = createSelector((s) => ({
  fileHeaderOpen: s.fileHeaderOpen,
  isFixPlanDialogOpen: s.isFixPlanDialogOpen,
  isSavedHistorySidebarOpen: s.isSavedHistorySidebarOpen,
  isEcosystemSidebarOpen: s.isEcosystemSidebarOpen,
  setFileHeaderOpen: s.setFileHeaderOpen,
  setFixPlanDialogOpen: s.setFixPlanDialogOpen,
  setSavedHistorySidebarOpen: s.setSavedHistorySidebarOpen,
  setEcosystemSidebarOpen: s.setEcosystemSidebarOpen,
  resetUIState: s.resetUIState,
}));

export const useSavedHistoryState = createSelector((s) => ({
  savedHistoryItems: s.savedHistoryItems,
  setSavedHistoryItems: s.setSavedHistoryItems,
  resetSavedHistoryState: s.resetSavedHistoryState,
}));

export const useAppActions = createSelector((s) => ({
  clearForm: s.clearForm,
  resetNavigationState: s.resetNavigationState,
}));