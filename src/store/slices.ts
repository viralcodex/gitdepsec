import { StateCreator } from "zustand";
import {
  AppStore,
  RepoState,
  FileState,
  ErrorState,
  GraphState,
  DiagramState,
  FixPlanState,
  UIState,
  SavedHistoryState,
} from "./types";
import {
  GroupedDependencies,
  EcosystemGraphMap,
  ManifestFileContentsApiResponse,
} from "@/constants/model";
import {
  deepMergeFixPlanData,
  hasFixPlanChanged,
  orderFixPlanData,
} from "@/lib/fixPlanUtils";

export const createRepoSlice: StateCreator<AppStore, [], [], RepoState> = (
  set
) => ({
  branches: [],
  selectedBranch: null,
  loadingBranches: false,
  hasMore: false,
  totalBranches: 0,
  page: 1,
  currentUrl: null,
  loadedRepoKey: null,
  setBranches: (branches) => set({ branches }),
  setSelectedBranch: (branch) => set({ selectedBranch: branch }),
  setLoadingBranches: (loading) => set({ loadingBranches: loading }),
  loadNextPage: () =>
    set((s) => {
      if (s.hasMore && !s.loadingBranches) {
        return { page: s.page + 1 };
      }
      return {};
    }),
  setHasMore: (hasMore) => set({ hasMore }),
  setTotalBranches: (total) => set({ totalBranches: total }),
  setPage: (page) => set({ page }),
  setCurrentUrl: (url) => set({ currentUrl: url }),
  setLoadedRepoKey: (key) => set({ loadedRepoKey: key }),
  resetRepoState: () =>
    set({
      branches: [],
      selectedBranch: null,
      loadingBranches: false,
      hasMore: false,
      totalBranches: 0,
      page: 1,
      currentUrl: null,
      loadedRepoKey: null,
    }),
});

export const createFileSlice: StateCreator<AppStore, [], [], FileState> = (
  set
) => ({
  newFileName: "",
  uploaded: false,
  setNewFileName: (name) => set({ newFileName: name }),
  setUploaded: (uploaded) => set({ uploaded }),
  setFileUploadState: (name, uploaded) => set({ newFileName: name, uploaded }),
  resetFileState: () => set({ newFileName: "", uploaded: false }),
});

export const createErrorSlice: StateCreator<AppStore, [], [], ErrorState> = (
  set
) => ({
  error: null,
  manifestError: [],
  branchError: null,
  fixPlanError: {},
  setError: (error) => set({ error }),
  setManifestError: (manifestError) =>
    set((s) => ({
      manifestError: [...(s.manifestError || []), ...(manifestError || [])],
    })),
  setBranchError: (branchError) => set({ branchError }),
  setFixPlanError: (fixPlanError) => set({ fixPlanError }),
  resetErrorState: () =>
    set({
      error: null,
      manifestError: [],
      branchError: null,
      fixPlanError: {},
    }),
});

export const createGraphSlice: StateCreator<AppStore, [], [], GraphState> = (
  set
) => ({
  dependencies: {} as GroupedDependencies,
  graphData: {} as EcosystemGraphMap,
  manifestData: {} as ManifestFileContentsApiResponse,
  loading: false,
  graphRepoKey: null,
  setDependencies: (deps) => set({ dependencies: deps }),
  setGraphData: (data, graphRepoKey) =>
    set({ graphData: data, graphRepoKey: graphRepoKey || null }),
  setManifestData: (data) => set({ manifestData: data }),
  setLoading: (loading) => set({ loading }),
  resetGraphState: () =>
    set({
      dependencies: {} as GroupedDependencies,
      graphData: null as unknown as EcosystemGraphMap,
      manifestData: {} as ManifestFileContentsApiResponse,
      loading: true,
      graphRepoKey: null,
    }),
});

export const createDiagramSlice: StateCreator<
  AppStore,
  [],
  [],
  DiagramState
> = (set) => ({
  selectedNode: null,
  isDiagramExpanded: false,
  setIsDiagramExpanded: (expanded) => set({ isDiagramExpanded: expanded }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  resetDiagramState: () =>
    set({ selectedNode: null, isDiagramExpanded: false }),
});

export const createFixPlanSlice: StateCreator<
  AppStore,
  [],
  [],
  FixPlanState
> = (set) => ({
  fixPlansByRepo: {},
  currentFixPlanRepoKey: null,
  partialFixPlan: {},
  isFixPlanLoading: false,
  currentFixPlanPhase: null,
  currentFixPlanStep: null,
  fixPlanProgress: 0,
  ecosystemProgress: {},
  selectedEcosystem: null,

  setCurrentFixPlanRepoKey: (repoKey) =>
    set({ currentFixPlanRepoKey: repoKey }),

  setGlobalFixPlan: (plan, repoKey) =>
    set((state) => {
      const key = repoKey || state.currentFixPlanRepoKey;
      if (!key) return state;

      return {
        fixPlansByRepo: {
          ...state.fixPlansByRepo,
          [key]: {
            ...state.fixPlansByRepo[key],
            globalFixPlan: plan,
            isFixPlanGenerated: Boolean(plan?.trim()),
            timestamp: Date.now(),
          },
        },
      };
    }),

  setEcosystemFixPlan: (ecosystem, plan, repoKey) =>
    set((state) => {
      const key = repoKey || state.currentFixPlanRepoKey;
      if (!key) return state;

      const currentEntry = state.fixPlansByRepo[key] || {};
      const ecosystemFixPlans = currentEntry.ecosystemFixPlans || {};

      return {
        fixPlansByRepo: {
          ...state.fixPlansByRepo,
          [key]: {
            ...currentEntry,
            ecosystemFixPlans: {
              ...ecosystemFixPlans,
              [ecosystem]: plan,
            },
            ecosystemPartialFixPlans:
              currentEntry.ecosystemPartialFixPlans || {},
            hasMultipleEcosystems:
              Object.keys({ ...ecosystemFixPlans, [ecosystem]: plan }).length >
              1,
            isFixPlanGenerated: true,
            timestamp: Date.now(),
          },
        },
      };
    }),

  updatePartialFixPlan: (tabData, ecosystem) =>
    set((state) => {
      if (!tabData || Object.keys(tabData).length === 0) return state;

      if (ecosystem) {
        const key = state.currentFixPlanRepoKey;
        if (!key) return state;

        const currentEntry = state.fixPlansByRepo[key] || {};
        const ecosystemPartialFixPlans =
          currentEntry.ecosystemPartialFixPlans || {};
        const currentPlan = ecosystemPartialFixPlans[ecosystem] || {};
        const merged = deepMergeFixPlanData(currentPlan, tabData);

        if (!hasFixPlanChanged(currentPlan, merged)) return state;

        return {
          fixPlansByRepo: {
            ...state.fixPlansByRepo,
            [key]: {
              ...currentEntry,
              ecosystemPartialFixPlans: {
                ...ecosystemPartialFixPlans,
                [ecosystem]: orderFixPlanData(merged),
              },
            },
          },
        };
      }
      // Global partial fix plan (backward compatibility)
      const merged = deepMergeFixPlanData(state.partialFixPlan, tabData);
      if (!hasFixPlanChanged(state.partialFixPlan, merged)) return state;

      return { partialFixPlan: orderFixPlanData(merged) };
    }),

  clearPartialFixPlan: (ecosystem) =>
    set((state) => {
      if (!ecosystem) return { partialFixPlan: {} };

      const key = state.currentFixPlanRepoKey;
      if (!key) return state;

      const currentEntry = state.fixPlansByRepo[key] || {};
      const ecosystemPartialFixPlans =
        currentEntry.ecosystemPartialFixPlans || {};
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [ecosystem]: _, ...rest } = ecosystemPartialFixPlans;

      return {
        fixPlansByRepo: {
          ...state.fixPlansByRepo,
          [key]: { ...currentEntry, ecosystemPartialFixPlans: rest },
        },
      };
    }),

  setIsFixPlanLoading: (loading) => set({ isFixPlanLoading: loading }),

  setCurrentFixPlanPhase: (phase, ecosystem) =>
    set((state) =>
      ecosystem
        ? {
            ecosystemProgress: {
              ...state.ecosystemProgress,
              [ecosystem]: {
                phase,
                progress: state.ecosystemProgress[ecosystem]?.progress || 0,
              },
            },
          }
        : { currentFixPlanPhase: phase }
    ),

  setCurrentFixPlanStep: (step) => set({ currentFixPlanStep: step }),

  setFixPlanProgress: (progress, ecosystem) =>
    set((state) =>
      ecosystem
        ? {
            ecosystemProgress: {
              ...state.ecosystemProgress,
              [ecosystem]: {
                phase: state.ecosystemProgress[ecosystem]?.phase || null,
                progress,
              },
            },
          }
        : { fixPlanProgress: progress }
    ),

  setSelectedEcosystem: (ecosystem) => set({ selectedEcosystem: ecosystem }),

  resetFixPlanState: () =>
    set((state) => {
      const key = state.currentFixPlanRepoKey;
      const baseReset = {
        partialFixPlan: {},
        isFixPlanLoading: false,
        currentFixPlanPhase: null,
        currentFixPlanStep: null,
        fixPlanProgress: 0,
        ecosystemProgress: {},
        selectedEcosystem: null,
      };

      if (!key) return baseReset;

      return {
        ...baseReset,
        fixPlansByRepo: {
          ...state.fixPlansByRepo,
          [key]: {
            ...(state.fixPlansByRepo[key] || {}),
            ecosystemFixPlans: {},
            ecosystemPartialFixPlans: {},
          },
        },
      };
    }),
});

export const createUISlice: StateCreator<AppStore, [], [], UIState> = (
  set
) => ({
  fileHeaderOpen: false,
  isFixPlanDialogOpen: false,
  isSavedHistorySidebarOpen: false,
  isEcosystemSidebarOpen: true,
  setFileHeaderOpen: (open) => set({ fileHeaderOpen: open }),
  setFixPlanDialogOpen: (open) => set({ isFixPlanDialogOpen: open }),
  setSavedHistorySidebarOpen: (open) =>
    set({ isSavedHistorySidebarOpen: open }),
  setEcosystemSidebarOpen: (open) => set({ isEcosystemSidebarOpen: open }),
  resetUIState: () =>
    set({
      fileHeaderOpen: false,
      isFixPlanDialogOpen: false,
      isSavedHistorySidebarOpen: false,
      isEcosystemSidebarOpen: true,
    }),
});

export const createSavedHistorySlice: StateCreator<
  AppStore,
  [],
  [],
  SavedHistoryState
> = (set) => ({
  savedHistoryItems: {},
  setSavedHistoryItems: (item) =>
    set((s) => ({
      savedHistoryItems: { ...s.savedHistoryItems, ...item },
    })),
  resetSavedHistoryState: () => set({ savedHistoryItems: {} }),
});
