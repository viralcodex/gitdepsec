import {
  EcosystemGraphMap,
  GraphNode,
  GroupedDependencies,
  HistoryItem,
  ManifestFileContentsApiResponse,
} from "@/constants/model";

export interface RepoState {
  branches: string[];
  selectedBranch: string | null;
  defaultBranch: string | null;
  loadingBranches: boolean;
  hasMore: boolean;
  totalBranches: number;
  page: number;
  currentUrl: string | null;
  loadedRepoKey: string | null;
  setBranches: (branches: string[]) => void;
  setSelectedBranch: (branch: string | null) => void;
  setDefaultBranch: (branch: string | null) => void;
  setLoadingBranches: (loading: boolean) => void;
  loadNextPage: () => void;
  setHasMore: (hasMore: boolean) => void;
  setTotalBranches: (total: number) => void;
  setPage: (page: number) => void;
  setCurrentUrl: (url: string | null) => void;
  setLoadedRepoKey: (key: string | null) => void;
  resetRepoState: () => void;
}

export interface FileState {
  newFileName: string;
  uploaded: boolean;
  setNewFileName: (name: string) => void;
  setUploaded: (uploaded: boolean) => void;
  setFileUploadState: (name: string, uploaded: boolean) => void;
  resetFileState: () => void;
}

export interface ErrorState {
  error: string | null;
  manifestError: string[];
  branchError: string | null;
  fixPlanError: Record<string, string>;
  setError: (error: string | null) => void;
  setManifestError: (error: string[] | null) => void;
  setBranchError: (error: string | null) => void;
  setFixPlanError: (error: Record<string, string>) => void;
  resetErrorState: () => void;
}

export interface GraphState {
  dependencies: GroupedDependencies;
  graphData: EcosystemGraphMap;
  manifestData: ManifestFileContentsApiResponse;
  loading: boolean;
  graphRepoKey: string | null;
  setDependencies: (deps: GroupedDependencies) => void;
  setGraphData: (data: EcosystemGraphMap, graphRepoKey?: string) => void;
  setManifestData: (data: ManifestFileContentsApiResponse) => void;
  setLoading: (loading: boolean) => void;
  resetGraphState: () => void;
}

export interface DiagramState {
  selectedNode: GraphNode | null;
  isDiagramExpanded: boolean;
  setIsDiagramExpanded: (expanded: boolean) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  resetDiagramState: () => void;
}

export interface FixPlanCacheEntry {
  globalFixPlan: string;
  isFixPlanGenerated: boolean;
  timestamp: number;
  // New: Support for per-ecosystem fix plans
  ecosystemFixPlans?: Record<string, string>;
  ecosystemPartialFixPlans?: Record<string, Partial<Record<string, unknown>>>;
  hasMultipleEcosystems?: boolean;
}

export interface FixPlanState {
  fixPlansByRepo: Record<string, FixPlanCacheEntry>;
  currentFixPlanRepoKey: string | null;
  partialFixPlan: Partial<Record<string, unknown>>;
  isFixPlanLoading: boolean;
  currentFixPlanPhase: string | null;
  currentFixPlanStep: string | null;
  fixPlanProgress: number;
  // New: Per-ecosystem progress tracking
  ecosystemProgress: Record<string, { phase: string | null; progress: number }>;
  selectedEcosystem: string | null;
  setGlobalFixPlan: (plan: string, repoKey?: string) => void;
  // New: Set fix plan for specific ecosystem
  setEcosystemFixPlan: (ecosystem: string, plan: string, repoKey?: string) => void;
  setCurrentFixPlanRepoKey: (repoKey: string | null) => void;
  updatePartialFixPlan: (tabData: Partial<Record<string, unknown>>, ecosystem?: string) => void;
  clearPartialFixPlan: (ecosystem?: string) => void;
  setIsFixPlanLoading: (loading: boolean) => void;
  setCurrentFixPlanPhase: (phase: string | null, ecosystem?: string) => void;
  setCurrentFixPlanStep: (step: string | null) => void;
  setFixPlanProgress: (progress: number, ecosystem?: string) => void;
  setSelectedEcosystem: (ecosystem: string | null) => void;
  resetFixPlanState: () => void;
}

export interface UIState {
  fileHeaderOpen: boolean;
  isFixPlanDialogOpen: boolean;
  isSavedHistorySidebarOpen: boolean;
  isEcosystemSidebarOpen: boolean;
  setFileHeaderOpen: (open: boolean) => void;
  setFixPlanDialogOpen: (open: boolean) => void;
  setSavedHistorySidebarOpen: (open: boolean) => void;
  setEcosystemSidebarOpen: (open: boolean) => void;
  resetUIState: () => void;
}

export interface SavedHistoryState {
  savedHistoryItems: {
    [date: string]: Array<HistoryItem>;
  };
  setSavedHistoryItems: (item: { [date: string]: Array<HistoryItem> }) => void;
  resetSavedHistoryState: () => void;
}

export interface AppStore
  extends
    RepoState,
    FileState,
    ErrorState,
    GraphState,
    DiagramState,
    FixPlanState,
    UIState,
    SavedHistoryState {
  clearForm: () => void;
  resetNavigationState: () => void;
}
