import {
    EcosystemGraphMap,
    GraphNode,
    GroupedDependencies,
    ManifestFileContentsApiResponse,
} from "@/constants/model";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { useShallow } from "zustand/shallow";

interface RepoState {
    branches: string[];
    selectedBranch: string | null;
    loadingBranches: boolean;
    hasMore: boolean;
    totalBranches: number;
    page: number;
    currentUrl: string | null;
    loadedRepoKey: string | null; // Format: "owner/repo" - tracks which repo's branches are cached
    setBranches: (branches: string[]) => void;
    setSelectedBranch: (branch: string | null) => void;
    setLoadingBranches: (loading: boolean) => void;
    loadNextPage: () => void;
    setHasMore: (hasMore: boolean) => void;
    setTotalBranches: (total: number) => void;
    setPage: (page: number) => void;
    setCurrentUrl: (url: string | null) => void;
    setLoadedRepoKey: (key: string | null) => void;
    resetRepoState: () => void;
}

interface FileState {
  newFileName: string;
  uploaded: boolean;
  setNewFileName: (name: string) => void;
  setUploaded: (uploaded: boolean) => void;
  resetFileState: () => void;
}

interface ErrorState {
  error: string | null;
  manifestError: string[];
  branchError: string | null;
  fixPlanError: Record<string, string> | null;
  setError: (error: string | null) => void;
  setManifestError: (error: string[] | null) => void;
  setBranchError: (error: string | null) => void;
  setFixPlanError: (error: Record<string, string>) => void;
  resetErrorState: () => void;
}

interface GraphState {
  dependencies: GroupedDependencies;
  graphData: EcosystemGraphMap;
  manifestData: ManifestFileContentsApiResponse;
  loading: boolean;
  setDependencies: (deps: GroupedDependencies) => void;
  setGraphData: (data: EcosystemGraphMap) => void;
  setManifestData: (data: ManifestFileContentsApiResponse) => void;
  setLoading: (loading: boolean) => void;
  resetGraphState: () => void;
}

interface DiagramState {
  selectedNode: GraphNode | null;
  isDiagramExpanded: boolean;
  setIsDiagramExpanded: (expanded: boolean) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  resetDiagramState: () => void;
}

interface FixPlanState {
  fixPlan: Record<string, string>;
  globalFixPlan: string;
  fixOptimizationPlan: string;
  conflictResolutionPlan: string;
  strategyPlan: string;
  isFixPlanLoading: boolean;
  isFixPlanGenerated: boolean;
  setFixPlan: (plan: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setGlobalFixPlan: (plan: string) => void;
  setFixOptimizationPlan: (plan: string) => void;
  setConflictResolutionPlan: (plan: string) => void;
  setStrategyPlan: (plan: string) => void;
  setIsFixPlanLoading: (loading: boolean) => void;
  setIsFixPlanGenerated: (generated: boolean) => void;
  resetFixPlanState: () => void;
}

interface UIState {
  fileHeaderOpen: boolean;
  isFixPlanDialogOpen: boolean;
  isSavedHistorySidebarOpen: boolean;
  setFileHeaderOpen: (open: boolean) => void;
  setFixPlanDialogOpen: (open: boolean) => void;
  setSavedHistorySidebarOpen: (open: boolean) => void;
  resetUIState: () => void;
}

interface SavedHistoryState {
  savedHistoryItems:{
    [date: string]: Array<{ [key: string]: string }>;
  };
  setSavedHistoryItems: (item: { [date: string]: Array<{ [key: string]: string }> }) => void; //Takes one item to add to the list
  resetSavedHistoryState: () => void;
}

interface AppStore
  extends RepoState,
    FileState,
    ErrorState,
    GraphState,
    DiagramState,
    FixPlanState,
    UIState,
    SavedHistoryState {
  clearForm: () => void;
}

  export const store = create<AppStore>()(
    devtools(
      persist(
        (set) => ({
          // Repo State
          branches: [],
          selectedBranch: null,
          loadingBranches: false,
          hasMore: false,
          totalBranches: 0,
          page: 1,
          currentUrl: null,
          loadedRepoKey: null,
          setBranches: (branches: string[]) => set({ branches }),
          setSelectedBranch: (branch: string | null) =>
            set({ selectedBranch: branch }),
          setLoadingBranches: (loading: boolean) =>
            set({ loadingBranches: loading }),
          loadNextPage: () =>
            set((s) => {
              if (s.hasMore && !s.loadingBranches) {
                return { page: s.page + 1 };
              }
              return {};
            }),
          setHasMore: (hasMore: boolean) => set({ hasMore }),
          setTotalBranches: (total: number) => set({ totalBranches: total }),
          setPage: (page: number) => set({ page }),
          setCurrentUrl: (url: string | null) => set({ currentUrl: url }),
          setLoadedRepoKey: (key: string | null) => set({ loadedRepoKey: key }),
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

          // File State
          newFileName: "",
          uploaded: false,
          setNewFileName: (name: string) => set({ newFileName: name }),
          setUploaded: (uploaded: boolean) => set({ uploaded }),
          resetFileState: () =>
            set({
              newFileName: "",
              uploaded: false,
            }),

          // Error State
          error: null,
          manifestError: [],
          branchError: null,
          fixPlanError: null,
          setError: (error: string | null) => set({ error }),
          setManifestError: (manifestError: string[] | null) =>
            set((s) => ({
              manifestError: [
                ...(s.manifestError || []),
                ...(manifestError || []),
              ],
            })),
          setBranchError: (branchError: string | null) => set({ branchError }),
          setFixPlanError: (fixPlanError: Record<string, string> | null) =>
            set({ fixPlanError }),
          resetErrorState: () =>
            set({
              error: null,
              manifestError: [],
              branchError: null,
              fixPlanError: null,
            }),

          // Graph State
          dependencies: {} as GroupedDependencies,
          graphData: {} as EcosystemGraphMap,
          manifestData: {} as ManifestFileContentsApiResponse,
          loading: false,
          setDependencies: (deps: GroupedDependencies) =>
            set({ dependencies: deps }),
          setGraphData: (data: EcosystemGraphMap) => set({ graphData: data }),
          setManifestData: (data: ManifestFileContentsApiResponse) =>
            set({ manifestData: data }),
          setLoading: (loading: boolean) => set({ loading }),
          resetGraphState: () =>
            set({
              dependencies: {} as GroupedDependencies,
              graphData: {} as EcosystemGraphMap,
              manifestData: {} as ManifestFileContentsApiResponse,
              loading: false,
            }),

          // Diagram State
          selectedNode: null,
          isDiagramExpanded: false,
          setIsDiagramExpanded: (expanded: boolean) =>
            set({ isDiagramExpanded: expanded }),
          setSelectedNode: (node: GraphNode | null) =>
            set({ selectedNode: node }),
          resetDiagramState: () =>
            set({
              selectedNode: null,
              isDiagramExpanded: false,
            }),

          // Fix Plan State
          fixPlan: {},
          globalFixPlan: "",
          fixOptimizationPlan: "",
          conflictResolutionPlan: "",
          strategyPlan: "",
          isFixPlanLoading: false,
          isFixPlanGenerated: false,
          setFixPlan: (
            plan:
              | Record<string, string>
              | ((prev: Record<string, string>) => Record<string, string>)
          ) =>
            set((state) => ({
              fixPlan: typeof plan === "function" ? plan(state.fixPlan) : plan,
            })),
          setGlobalFixPlan: (plan: string) => set({ globalFixPlan: plan }),
          setFixOptimizationPlan: (plan: string) =>
            set({ fixOptimizationPlan: plan }),
          setConflictResolutionPlan: (plan: string) =>
            set({ conflictResolutionPlan: plan }),
          setStrategyPlan: (plan: string) => set({ strategyPlan: plan }),
          setIsFixPlanLoading: (loading: boolean) =>
            set({ isFixPlanLoading: loading }),
          setIsFixPlanGenerated: (generated: boolean) =>
            set({ isFixPlanGenerated: generated }),
          resetFixPlanState: () =>
            set({
              fixPlan: {},
              globalFixPlan: "",
              fixOptimizationPlan: "",
              conflictResolutionPlan: "",
              strategyPlan: "",
              isFixPlanLoading: false,
              isFixPlanGenerated: false,
            }),

          // UI State
          fileHeaderOpen: false,
          isFixPlanDialogOpen: false,
          isSavedHistorySidebarOpen: false,
          setFileHeaderOpen: (open: boolean) => set({ fileHeaderOpen: open }),
          setFixPlanDialogOpen: (open: boolean) =>
            set({ isFixPlanDialogOpen: open }),
          setSavedHistorySidebarOpen: (open: boolean) =>
            set({ isSavedHistorySidebarOpen: open }),
          resetUIState: () =>
            set({
              fileHeaderOpen: false,
              isFixPlanDialogOpen: false,
              isSavedHistorySidebarOpen: false,
            }),
          
          // Saved History State
          savedHistoryItems: {},
          setSavedHistoryItems: (item: { [date: string]: Array<{ [key: string]: string }> }) =>
            set((s) => ({
              savedHistoryItems: { ...s.savedHistoryItems, ...item },
            })),
          resetSavedHistoryState: () =>
            set({
              savedHistoryItems: {},
            }),

          // Clear Form
          clearForm: () => {
            const s = store.getState();
            s.resetRepoState();
            s.resetErrorState();
          },
        }),
        {
          name: "gitvulsafe_storage",
          partialize: (state) => ({
            branches: state.branches,
            selectedBranch: state.selectedBranch,
            loadedRepoKey: state.loadedRepoKey,
            hasMore: state.hasMore,
            totalBranches: state.totalBranches,
            currentUrl: state.currentUrl,
            savedHistoryItems: state.savedHistoryItems,
          }),
        }
      ),
      { name: "Gitvulsafe" }
    )
  );

export const useRepoState = () => store(useShallow((s: AppStore) => ({
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
  })));

export const useFileState = () =>
  store(useShallow((s: AppStore) => ({
    newFileName: s.newFileName,
    uploaded: s.uploaded,
    setNewFileName: s.setNewFileName,
    setUploaded: s.setUploaded,
    resetFileState: s.resetFileState,
  })));

export const useErrorState = () =>
  store(useShallow((s: AppStore) => ({
    error: s.error,
    manifestError: s.manifestError,
    branchError: s.branchError,
    fixPlanError: s.fixPlanError,
    setError: s.setError,
    setManifestError: s.setManifestError,
    setBranchError: s.setBranchError,
    setFixPlanError: s.setFixPlanError,
    resetErrorState: s.resetErrorState,
  })));

export const useGraphState = () =>
  store(useShallow((s: AppStore) => ({
    dependencies: s.dependencies,
    graphData: s.graphData,
    manifestData: s.manifestData,
    loading: s.loading,
    setDependencies: s.setDependencies,
    setGraphData: s.setGraphData,
    setManifestData: s.setManifestData,
    setLoading: s.setLoading,
    resetGraphState: s.resetGraphState,
  })));

export const useDiagramState = () =>
  store(
    useShallow((s: AppStore) => ({
      selectedNode: s.selectedNode,
      isDiagramExpanded: s.isDiagramExpanded,
      setIsDiagramExpanded: s.setIsDiagramExpanded,
      setSelectedNode: s.setSelectedNode,
      resetDiagramState: s.resetDiagramState,
    }))
  );

export const useFixPlanState = () =>
  store(useShallow((s: AppStore) => ({
    fixPlan: s.fixPlan,
    globalFixPlan: s.globalFixPlan,
    fixOptimizationPlan: s.fixOptimizationPlan,
    conflictResolutionPlan: s.conflictResolutionPlan,
    strategyPlan: s.strategyPlan,
    isFixPlanLoading: s.isFixPlanLoading,
    isFixPlanGenerated: s.isFixPlanGenerated,
    setFixPlan: s.setFixPlan,
    setGlobalFixPlan: s.setGlobalFixPlan,
    setFixOptimizationPlan: s.setFixOptimizationPlan,
    setConflictResolutionPlan: s.setConflictResolutionPlan,
    setStrategyPlan: s.setStrategyPlan,
    setIsFixPlanLoading: s.setIsFixPlanLoading,
    setIsFixPlanGenerated: s.setIsFixPlanGenerated,
    resetFixPlanState: s.resetFixPlanState,
  })));

export const useUIState = () =>
  store(useShallow((s: AppStore) => ({
    fileHeaderOpen: s.fileHeaderOpen,
    isFixPlanDialogOpen: s.isFixPlanDialogOpen,
    isSavedHistorySidebarOpen: s.isSavedHistorySidebarOpen,
    setFileHeaderOpen: s.setFileHeaderOpen,
    setFixPlanDialogOpen: s.setFixPlanDialogOpen,
    setSavedHistorySidebarOpen: s.setSavedHistorySidebarOpen,
    resetUIState: s.resetUIState,
  })));

export const useSavedHistoryState = () =>
  store(useShallow((s: AppStore) => ({
    savedHistoryItems: s.savedHistoryItems,
    setSavedHistoryItems: s.setSavedHistoryItems,
    resetSavedHistoryState: s.resetSavedHistoryState,
  })));
