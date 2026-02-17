import { Brain, Package, Shield, Sparkles, Zap } from "lucide-react";

export const MANIFEST_FILES: { [key: string]: { file: string; icon: string } } = {
  npm: { file: "package.json", icon: "/js.svg" },
  PyPI: { file: "requirements.txt", icon: "/pipy.svg" },
  RubyGems: { file: "Gemfile", icon: "/ruby.svg" },
  Maven: { file: "pom.xml", icon: "/mvn.svg" },
  Pub: { file: "pubspec.yaml", icon: "/dart.svg" },
  Gradle: { file: "build.gradle", icon: "gradle" },
  cargo: { file: "Cargo.toml", icon: "cargo" },
  Composer: { file: "composer.json", icon: "composer" },
};

export const PROGRESS_STEPS: { [key: string]: string } = {
  PARSING_MANIFESTS: "Parsing Manifest files",
  PARSING_DEPENDENCIES: "Parsing dependencies",
  FETCHING_TRANSITIVE_DEPENDENCIES: "Fetching transitive dependencies",
  FETCHING_VULNERABILTIES_ID: "Fetching vulnerabilities IDs",
  FETCHING_VULNERABILTIES_DETAILS: "Fetching vulnerabilities details",
  FINALISING_RESULTS: "Almost Done",
};

export const PROGRESS_MESSAGES = [
  "Almost done here",
  "Just a tad more time",
  "Preparing the final touches",
  "Good things take time",
];

// Map of phases for the 5-phase architecture
export const PHASES = [
  {
    id: "preprocessing",
    name: "Preprocessing",
    icon: Package,
    color: "text-blue-500",
  },
  {
    id: "intelligence",
    name: "Parallel Intelligence",
    icon: Brain,
    color: "text-purple-500",
  },
  {
    id: "batch",
    name: "Batch Processing",
    icon: Zap,
    color: "text-yellow-500",
  },
  {
    id: "synthesis",
    name: "Synthesis",
    icon: Sparkles,
    color: "text-pink-300",
  },
  {
    id: "enrichment",
    name: "Enrichment",
    icon: Shield,
    color: "text-green-500",
  },
];

export const PHASE_STEP_MAP: Record<string, string> = {
  preprocessing_start: "preprocessing",
  preprocessing_complete: "preprocessing",
  parallel_analysis_start: "intelligence",
  parallel_analysis_complete: "intelligence",
  intelligence_start: "intelligence",
  intelligence_complete: "intelligence",
  batch_start: "batch",
  batch_processing: "batch",
  batch_processing_complete: "batch",
  batch_complete: "batch",
  synthesis_start: "synthesis",
  synthesis_executive_complete: "synthesis",
  synthesis_intelligence_start: "synthesis",
  synthesis_intelligence_complete: "synthesis",
  synthesis_smart_actions_start: "synthesis",
  synthesis_smart_actions_complete: "synthesis",
  synthesis_phases_start: "synthesis",
  synthesis_phases_complete: "synthesis",
  synthesis_risk_start: "synthesis",
  synthesis_risk_complete: "synthesis",
  synthesis_complete: "synthesis",
  enrichment_start: "enrichment",
  enrichment_complete: "enrichment",
};

export const FIX_PLAN_PROPERTY_ORDER = [
  "executive_summary",
  "dependency_intelligence",
  "priority_phases",
  "automated_execution",
  "risk_management",
  "long_term_strategy",
  "metadata",
];

export const MAX_HISTORY_ITEMS = 10;
export const CACHE_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days

export const DEFAULT_BRANCH_NAMES = ["main", "master", "develop", "dev"];

// Stable empty references to prevent unnecessary re-renders
export const EMPTY_OBJECT: object = {};
export const EMPTY_ECOSYSTEM_FIXES: Record<string, string> = {};
export const EMPTY_ECOSYSTEM_PARTIAL: Record<string, Partial<Record<string, unknown>>> = {};
export const EMPTY_ECOSYSTEM_PROGRESS: Record<string, { phase: string | null; progress: number }> =
  {};
