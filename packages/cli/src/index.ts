/**
 * GitDepSec core exports.
 *
 * The primary interface for AI harnesses is the CLI command output
 * (`gds analyse --format json` / `gds fix --format json`).
 */

export {
  analyse,
  Analyser,
  type AnalyseOptions,
  type AnalysisResult,
} from "./core/analyser.js";

export {
  generateFixPlan,
  buildFixPlan,
  type FixPlanOptions,
  type FixPlan,
  type FixAction,
} from "./core/fix-planner.js";

export { loadConfig, type Config } from "./core/config.js";

export {
  Ecosystem,
  type Dependency,
  type Vulnerability,
  type DependencyGroups,
  type TransitiveDependency,
} from "./core/types.js";
