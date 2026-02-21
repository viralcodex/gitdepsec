import { OpenRouter } from "@openrouter/sdk";

import {
  ConflictDetection,
  FlattenedDependency,
  DependencyApiResponse,
  ParallelAuditResults,
  PrioritizedVulnerability,
  QuickWin,
  TransitiveInsight,
  Vulnerability,
} from "../constants/model";
import { prompts } from "../prompts/prompts";
import batchFixPlanSchema from "../prompts/schemas/batch_fix_plan_schema.json";
import executiveSummarySchema from "../prompts/schemas/executive_summary_schema.json";
import priorityPhasesSchema from "../prompts/schemas/priority_phases_schema.json";
import riskManagementSchema from "../prompts/schemas/risk_management_schema.json";
import smartActionsSchema from "../prompts/schemas/smart_actions_schema.json";
import { AIUtils } from "../utils/ai_utils";

/**
 * MULTI-AGENT ARCHITECTURE FOR FIX PLAN GENERATION
 * "From Chaos to Action in 45 Seconds"
 *
 * This service implements a 5-phase architecture with parallel AI synthesis:
 *
 * PHASE 0: Smart Preprocessing (< 1s, $0)
 *   - Flatten & deduplicate dependencies
 *   - Build vulnerability index
 *   - Calculate initial risk scores
 *
 * PHASE 1: Parallel Intelligence Layer (< 3s, $0)
 *   - 5 specialized local analyzers (no AI)
 *   - Priority Scorer, Transitive Intelligence, Conflict Detector, Quick Win Identifier, Critical Paths
 *
 * PHASE 2: Smart Batch Processing (10-30s, ~$0.15)
 *   - Adaptive batching based on severity
 *   - AI-powered fix recommendations
 *
 * PHASE 3: Intelligent Synthesis (3-8s, ~$0.25)
 *   - Parallel AI generation: Executive Summary, Smart Actions, Priority Phases, Risk Management
 *   - Runs simultaneously for maximum speed
 *
 * PHASE 4: Enrichment & Validation (< 1s, $0)
 *   - CLI commands, rollback procedures, documentation
 *
 * Total: ~40-45 seconds, ~$0.40
 */

class AgentsService {
  private ai: OpenRouter;
  private defaultModel: string;
  private apiKey: string;
  private auditData: DependencyApiResponse;
  private ecosystemMappedAuditData: Record<string, DependencyApiResponse>;
  private ecosystemFlattenedData: Record<string, FlattenedDependency[]> = {};
  private flattenedAuditData: FlattenedDependency[] = [];
  private flattenedDependencyByKey = new Map<string, FlattenedDependency>();
  private ecosystems: Set<string>;
  private progressCallback: (step: string, message: string, data?: Record<string, unknown>) => void;
  // Adaptive batch sizes based on severity
  private readonly CRITICAL_BATCH_SIZE = 5;
  private readonly HIGH_BATCH_SIZE = 10;
  private readonly MEDIUM_LOW_BATCH_SIZE = 20;

  // Cache for vulnerability counts
  private totalVulnerabilitiesCache: number | null = null;
  private fixableVulnerabilitiesCache: number | null = null;

  /**
   * Helper: Create summary with "X more" pattern
   */
  private createSummary(items: string[], maxDisplay: number, separator = ", "): string {
    return items.length > maxDisplay
      ? `${items.slice(0, maxDisplay).join(separator)} and ${items.length - maxDisplay} more`
      : items.join(separator);
  }

  private createDependencyKey(name: string, version: string): string {
    return `${name}@${version}`;
  }

  private getFlattenedDependency(name: string, version: string): FlattenedDependency | undefined {
    return this.flattenedDependencyByKey.get(this.createDependencyKey(name, version));
  }

  private getTopConflictPackages(
    conflicts: ConflictDetection[],
    limit: number,
  ): string[] {
    const packages: string[] = [];
    for (let i = 0; i < conflicts.length && packages.length < limit; i += 1) {
      packages.push(conflicts[i].package);
    }
    return packages;
  }

  private getTopTransitivePackages(
    insights: TransitiveInsight[],
    limit: number,
  ): string[] {
    const packages: string[] = [];
    for (let i = 0; i < insights.length && packages.length < limit; i += 1) {
      packages.push(insights[i].package);
    }
    return packages;
  }

  private takeFirstItems<T>(items: T[], limit: number): T[] {
    const result: T[] = [];
    for (let i = 0; i < items.length && result.length < limit; i += 1) {
      result.push(items[i]);
    }
    return result;
  }

  constructor(auditData: DependencyApiResponse, model?: string, apiKey?: string) {
    const key = apiKey ?? process.env.OPEN_ROUTER_KEY;
    if (!key) {
      throw new Error("OPEN_ROUTER_KEY is not set and no API key provided");
    }
    this.apiKey = key;
    this.ai = new OpenRouter({
      apiKey: key,
    });
    this.defaultModel = model ?? process.env.DEFAULT_MODEL ?? "xiaomi/mimo-v2-flash:free";
    this.flattenedAuditData = [];
    this.auditData = auditData;
    this.ecosystemMappedAuditData = {};
    this.ecosystems = new Set<string>();
    this.mapByEcosystemAuditData();
    this.flattenDependencies();
    this.progressCallback = () => { };
  }

  private mapByEcosystemAuditData() {
    this.ecosystems = new Set(
      Object.values(this.auditData.dependencies).flatMap((deps) =>
        deps.map((dep) => dep.ecosystem),
      ),
    );
    /** Create a mapping of ecosystem to its specific audit data
     * [ecosystem: string]: DependencyApiResponse
     * eg:
     * {npm: { dependencies: { ... } }
     * PiPY: { dependencies: { ... } }}
     * */
    this.ecosystems.forEach((ecosystem) => {
      const ecosystemData: DependencyApiResponse = {
        dependencies: Object.fromEntries(
          Object.entries(this.auditData.dependencies)
            .map(([filePath, deps]) => [
              filePath,
              deps.filter((dep) => dep.ecosystem === ecosystem),
            ])
            .filter(([_, deps]) => deps.length > 0),
        ),
      };
      this.ecosystemMappedAuditData[ecosystem] = ecosystemData;
      // Flatten dependencies for this ecosystem
      this.ecosystemFlattenedData[ecosystem] = this.flattenDependenciesForData(ecosystemData);
    });
  }
  /**
   * PHASE 0: Smart Preprocessing - Flatten Dependencies
   * Enhances dependencies with depth and usage frequency for better prioritization
   */
  private flattenDependencies(): void {
    this.flattenedAuditData = this.flattenDependenciesForData(this.auditData);
    this.flattenedDependencyByKey = new Map(
      this.flattenedAuditData.map((dep) => [this.createDependencyKey(dep.name, dep.version), dep]),
    );
  }

  /**
   * Flatten dependencies for a specific dataset (global or ecosystem-specific)
   */
  private flattenDependenciesForData(data: DependencyApiResponse): FlattenedDependency[] {
    // Track package usage across the dependency tree
    const usageCounter = new Map<string, number>();

    const dependencyAuditData = Object.entries(data.dependencies).flatMap(([filePath, deps]) => {
      return deps.map((dep) => {
        const key = `${dep.name}@${dep.version}`;
        usageCounter.set(key, (usageCounter.get(key) ?? 0) + 1);

        return {
          ...dep,
          filePath,
          dependencyLevel: "direct" as const,
          parentDependency: null,
          dependencyChain: `${filePath} -> ${dep.name}@${dep.version}`,
          dependencyDepth: 1,
          usageFrequency: 1,
        };
      });
    });

    const transitiveDepsAuditData = dependencyAuditData.flatMap((dep) => {
      return (
        dep.transitiveDependencies?.nodes
          ?.filter((node) => {
            return (
              node.dependencyType !== "SELF" &&
              node.vulnerabilities &&
              node.vulnerabilities.length > 0
            );
          })
          .map((node) => {
            const key = `${node.name}@${node.version}`;
            usageCounter.set(key, (usageCounter.get(key) ?? 0) + 1);

            return {
              ...node,
              filePath: dep.filePath,
              dependencyLevel: "transitive" as const,
              parentDependency: `${dep.name}@${dep.version}`,
              dependencyChain: `${dep.filePath} -> ${dep.name}@${dep.version} -> ${node.name}@${node.version}`,
              dependencyDepth: 2,
              usageFrequency: 1,
            };
          }) ?? []
      );
    });

    // Remove duplicates while preserving the first occurrence
    const seenPackages = new Map<string, FlattenedDependency>();
    const allDeps = [...dependencyAuditData, ...transitiveDepsAuditData];

    allDeps.forEach((dep) => {
      const key = `${dep.name}@${dep.version}`;
      if (!seenPackages.has(key)) {
        // Usage frequency already set from usageCounter during creation
        const finalFrequency = usageCounter.get(key) ?? 1;
        seenPackages.set(key, { ...dep, usageFrequency: finalFrequency });
      }
    });

    return Array.from(seenPackages.values());
  }

  /**
   * Generate fix plans for all ecosystems in parallel
   * Creates separate service instances for clean data isolation
   */
  async generateEcosystemFixPlans(
    progressCallback: (step: string, message: string, data?: Record<string, unknown>) => void,
  ): Promise<Record<string, Record<string, unknown>>> {
    const ecosystems = Array.from(this.ecosystems);

    if (ecosystems.length === 0) {
      throw new Error("No ecosystems found in audit data");
    }

    // Single ecosystem - use current instance
    if (ecosystems.length === 1) {
      const ecosystem = ecosystems[0];
      const result = await this.generateUnifiedFixPlan(progressCallback);
      return { [ecosystem]: result };
    }

    // Multiple ecosystems - create instance per ecosystem and run in parallel
    const fixPlanPromises = ecosystems.map(async (ecosystem) => {
      const taggedCallback = (step: string, message: string, data?: Record<string, unknown>) => {
        progressCallback(step, `[${ecosystem}] ${message}`, {
          ecosystem,
          ...data,
        });
      };

      try {
        // Create dedicated service instance for this ecosystem
        const ecosystemData = this.ecosystemMappedAuditData[ecosystem];
        const ecosystemService = new AgentsService(ecosystemData, this.defaultModel, this.apiKey);

        const result = await ecosystemService.generateUnifiedFixPlan(taggedCallback);

        return { ecosystem, result };
      } catch (error) {
        console.error(`Failed to generate fix plan for ${ecosystem}:`, error);
        return {
          ecosystem,
          result: { error: String(error) },
        };
      }
    });

    const results = await Promise.all(fixPlanPromises);

    return results.reduce(
      (acc, { ecosystem, result }) => {
        acc[ecosystem] = result;
        return acc;
      },
      {} as Record<string, Record<string, unknown>>,
    );
  }

  /**
   * MAIN ENTRY POINT: Generate Unified Fix Plan
   * Implements the complete 5-phase architecture with parallel AI synthesis
   */
  async generateUnifiedFixPlan(
    progressCallback: (step: string, message: string, data?: Record<string, unknown>) => void,
  ): Promise<Record<string, unknown>> {
    const startTime = Date.now();
    this.progressCallback = progressCallback;

    // ===== PHASE 0: SMART PREPROCESSING =====
    this.progressCallback("preprocessing_start", "Analyzing dependencies", {
      phase: "preprocessing",
      progress: 0,
    });

    this.progressCallback("preprocessing_complete", "Dependency audit complete", {
      phase: "preprocessing",
      progress: 8,
      totalDependencies: this.flattenedAuditData.length,
      totalVulnerabilities: this.getTotalVulnerabilitiesCount(),
      directDependencies: this.flattenedAuditData.reduce(
        (count, dep) => count + (dep.dependencyLevel === "direct" ? 1 : 0),
        0,
      ),
      transitiveDependencies: this.flattenedAuditData.reduce(
        (count, dep) => count + (dep.dependencyLevel === "transitive" ? 1 : 0),
        0,
      ),
    });

    // ===== PHASE 1: PARALLEL INTELLIGENCE LAYER =====
    this.progressCallback("parallel_audit_start", "Running intelligence analyzers", {
      phase: "parallel_audit",
      progress: 8,
      analyzers: [
        "Priority Scorer",
        "Transitive Intelligence",
        "Conflict Detector",
        "Quick Win Identifier",
      ],
    });

    const parallelResults = this.runParallelAudit();

    // Transform intelligence data once for reuse
    const intelligenceData = this.transformIntelligenceData(parallelResults);

    let criticalVulns = 0;
    let highVulns = 0;
    let mediumVulns = 0;
    parallelResults.priorities.forEach((vuln) => {
      if (vuln.riskLevel === "critical") criticalVulns += 1;
      else if (vuln.riskLevel === "high") highVulns += 1;
      else if (vuln.riskLevel === "medium") mediumVulns += 1;
    });

    // Send intelligence data immediately to populate Intelligence tab
    this.progressCallback("parallel_audit_complete", "Intelligence audit completed", {
      phase: "parallel_audit",
      progress: 18,
      quickWins: parallelResults.quickWins.length,
      conflicts: parallelResults.conflicts.length,
      transitiveOpportunities: parallelResults.transitiveInsights.length,
      riskBreakdown: {
        critical: criticalVulns,
        high: highVulns,
        medium: mediumVulns,
      },
      // Send actual intelligence data for UI (already transformed)
      intelligence_data: intelligenceData,
    });

    // ===== PHASE 2: SMART BATCH PROCESSING =====
    this.progressCallback(
      "batch_processing_start",
      "Processing vulnerabilities in adaptive batches",
      {
        phase: "batch_processing",
        progress: 18,
      },
    );

    const batchResults = await this.processDependenciesInBatches(parallelResults);

    // Send batch results summary
    this.progressCallback("batch_processing_complete", "Batch processing completed", {
      phase: "batch_processing",
      progress: 62,
      totalBatches: batchResults.length,
      batch_summary: this.generateBatchSummary(batchResults),
    });

    // ===== PHASE 3: PROGRESSIVE SYNTHESIS =====
    this.progressCallback("synthesis_start", "Generating executive summary", {
      phase: "synthesis",
      progress: 62,
      step: "executive_summary",
    });

    // Step 1: Generate Executive Summary (fast, populates Overview tab)
    const executiveSummary = await this.generateExecutiveSummary(batchResults, parallelResults);

    this.progressCallback("synthesis_executive_complete", "Executive summary ready", {
      phase: "synthesis",
      progress: 68,
      executive_summary: executiveSummary,
    });

    // Step 2: Generate Dependency Intelligence (fast, populates Intelligence tab)
    this.progressCallback("synthesis_intelligence_start", "Generating intelligence insights", {
      phase: "synthesis",
      progress: 68,
      step: "dependency_intelligence",
    });
    const criticalPaths = this.generateCriticalPaths(parallelResults);
    const dependencyIntelligence = {
      critical_paths: criticalPaths,
      shared_transitive_vulnerabilities: intelligenceData.transitive_insights,
      version_conflicts: intelligenceData.conflicts,
    };

    this.progressCallback("synthesis_intelligence_complete", "Intelligence insights ready", {
      phase: "synthesis",
      progress: 72,
      dependency_intelligence: dependencyIntelligence,
    });

    // ===== PARALLEL SYNTHESIS: Smart Actions + Phases + Risk Management =====
    // All three run simultaneously for maximum speed (~50% faster than sequential)
    // Start Smart Actions (AI call)
    this.progressCallback(
      "synthesis_smart_actions_start",
      "Generating smart action recommendations",
      {
        phase: "synthesis",
        progress: 72,
        step: "smart_actions",
      },
    );
    const smartActionsPromise = this.generateSmartActions(
      parallelResults,
      this.getTotalVulnerabilitiesCount(),
      this.getFixableVulnerabilities(),
      criticalVulns + highVulns,
    );

    // Start Priority Phases (AI call)
    this.progressCallback("synthesis_phases_start", "Organizing fixes into phases", {
      phase: "synthesis",
      progress: 72,
      step: "priority_phases",
    });
    const priorityPhasesPromise = this.generatePriorityPhases(batchResults, parallelResults);

    // Start Risk Management (AI call)
    this.progressCallback("synthesis_risk_start", "Analyzing risks and strategy", {
      phase: "synthesis",
      progress: 72,
      step: "risk_management",
    });
    const riskManagementPromise = this.generateRiskManagement(batchResults, parallelResults);

    // Wait for all three to complete in parallel
    const [smartActions, priorityPhases, riskManagement] = await Promise.all([
      smartActionsPromise,
      priorityPhasesPromise,
      riskManagementPromise,
    ]);

    // Send completion events as each completes (in order for UI consistency)
    this.progressCallback("synthesis_smart_actions_complete", "Smart actions ready", {
      phase: "synthesis",
      progress: 88,
      smart_actions: smartActions,
    });

    this.progressCallback("synthesis_phases_complete", "Execution phases ready", {
      phase: "synthesis",
      progress: 88,
      priority_phases: priorityPhases,
    });

    this.progressCallback("synthesis_risk_complete", "Risk management ready", {
      phase: "synthesis",
      progress: 88,
      risk_management: riskManagement,
    });

    // Combine all synthesis results in the correct order
    const unifiedPlan = {
      executive_summary: executiveSummary,
      dependency_intelligence: {
        ...dependencyIntelligence,
        smart_actions: smartActions,
      },
      priority_phases: priorityPhases,
      risk_management: riskManagement,
    };

    this.progressCallback("synthesis_complete", "Synthesis completed", {
      phase: "synthesis",
      progress: 92,
    });

    // ===== PHASE 4: ENRICHMENT & VALIDATION =====
    this.progressCallback("enrichment_start", "Generating CLI commands and scripts", {
      phase: "enrichment",
      progress: 92,
    });

    const enrichedPlan = this.enrichWithAutomation(unifiedPlan);

    const totalTime = Math.round((Date.now() - startTime) / 1000);

    this.progressCallback("enrichment_complete", "Fix plan ready!", {
      phase: "complete",
      progress: 100,
      totalTime: `${totalTime} seconds`,
      automated_execution: enrichedPlan.automated_execution,
      summary: {
        totalVulnerabilities: this.getTotalVulnerabilitiesCount(),
        fixableVulnerabilities: this.getFixableVulnerabilities(),
        quickWins: parallelResults.quickWins.length,
        estimatedFixTime: enrichedPlan.executive_summary
          ? (enrichedPlan.executive_summary as Record<string, unknown>).estimated_total_time
          : "Unknown",
      },
    });

    return enrichedPlan;
  }

  /**
   * Transform intelligence data once for reuse
   */
  private transformIntelligenceData(parallelResults: ParallelAuditResults): {
    transitive_insights: Array<Record<string, unknown>>;
    conflicts: Array<Record<string, unknown>>;
    quick_wins: Array<Record<string, unknown>>;
  } {
    return {
      transitive_insights: parallelResults.transitiveInsights.map((insight) => {
        const vulnList = this.createSummary(insight.vulnerabilityIds, 5);
        const parentList = this.createSummary(insight.usedBy, 3);
        return {
          package: insight.package,
          used_by: insight.usedBy,
          used_by_summary: parentList,
          vulnerability_count: insight.vulnerabilityCount,
          vulnerability_ids: insight.vulnerabilityIds,
          vulnerability_summary: vulnList,
          impact_multiplier: `Fixes ${insight.vulnerabilityCount} vulnerabilities (${vulnList}) across ${insight.usedBy.length} packages (${parentList})`,
        };
      }),
      conflicts: parallelResults.conflicts.map((conflict) => ({
        conflict: `${conflict.package}: ${conflict.conflictType}`,
        affected_packages: conflict.affectedParents,
        resolution: conflict.suggestedResolution,
        risk_level: conflict.riskLevel,
      })),
      quick_wins: parallelResults.quickWins.map((qw) => ({
        type: qw.type,
        package: qw.package,
        impact: qw.impact,
        effort: qw.effort,
        command: qw.command,
        estimated_time: qw.estimatedTime,
      })),
    };
  }

  /**
   * PHASE 1: Run all parallel analysis agents
   */
  private runParallelAudit(): ParallelAuditResults {
    // All agents run synchronously (local processing, no AI calls)
    const priorities = this.vulnerabilityPrioritizationAgent();
    const transitiveInsights = this.transitiveIntelligenceAgent();
    const conflicts = this.conflictDetectionAgent();

    // Quick wins agent uses results from parallel agents
    const quickWins = this.quickWinIdentificationAgent({
      priorities,
      transitiveInsights,
      conflicts,
    });

    return {
      priorities,
      transitiveInsights,
      conflicts,
      quickWins,
    };
  }

  /**
   * PHASE 1 - ANALYZER 1: Vulnerability Prioritization (LOCAL - NO AI)
   * Enhanced with depth and usage frequency multipliers
   */
  private vulnerabilityPrioritizationAgent(): PrioritizedVulnerability[] {
    const allVulns: PrioritizedVulnerability[] = [];

    this.flattenedAuditData.forEach((dep) => {
      (dep.vulnerabilities ?? []).forEach((vuln) => {
        const prioritized: PrioritizedVulnerability = {
          ...vuln,
          packageName: dep.name,
          packageVersion: dep.version,
          filePath: dep.filePath,
          dependencyLevel: dep.dependencyLevel,
          priorityScore: 0,
          riskLevel: "low",
        };
        const priorityScore = this.calculatePriorityScore(prioritized, dep);
        allVulns.push({
          ...prioritized,
          priorityScore,
          riskLevel: this.getRiskLevel(priorityScore),
        });
      });
    });

    return allVulns.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Calculate priority score for a vulnerability with enhanced multipliers
   * Score = CVSS + Exploit Bonus + Fix Bonus + Depth Multiplier + Usage Multiplier
   */
  private calculatePriorityScore(vuln: Vulnerability, dep?: FlattenedDependency): number {
    let score = 0;

    // CVSS score (0-10 points)
    const cvss =
      parseFloat(vuln.severityScore?.cvss_v3 ?? "0") ||
      parseFloat(vuln.severityScore?.cvss_v4 ?? "0") ||
      0;
    score += cvss;

    // Exploit available (+5 points)
    if (vuln.exploitAvailable) score += 5;

    // Fix available (+3 points)
    if (vuln.fixAvailable) score += 3;

    // Dependency depth multiplier (0-2 points)
    // Direct dependencies get higher priority
    if (dep) {
      const depthMultiplier = dep.dependencyLevel === "direct" ? 2 : 1;
      score += depthMultiplier;
    }

    // Usage frequency multiplier (0-3 points)
    // Packages used multiple times get higher priority
    if (dep) {
      const usageMultiplier = Math.min(Math.floor(dep.usageFrequency / 2), 3);
      score += usageMultiplier;
    }

    return score;
  }

  /**
   * Get risk level from priority score
   */
  private getRiskLevel(score: number): "critical" | "high" | "medium" | "low" {
    if (score >= 15) return "critical";
    if (score >= 10) return "high";
    if (score >= 5) return "medium";
    return "low";
  }

  /**
   * PHASE 1 - ANALYZER 2: Transitive Intelligence (LOCAL - NO AI)
   * Finds transitive dependencies used by multiple parents (high-impact fixes)
   */
  private transitiveIntelligenceAgent(): TransitiveInsight[] {
    const transitiveUsageMap = new Map<
      string,
      {
        package: string;
        vulnerabilityCount: number;
        usedBy: Set<string>;
        fixAvailable: boolean;
        vulnerabilityIds: Set<string>;
      }
    >();

    this.flattenedAuditData.forEach((dep) => {
      if (
        dep.dependencyLevel !== "transitive" ||
        !dep.vulnerabilities ||
        dep.vulnerabilities.length === 0
      ) {
        return;
      }

      const key = this.createDependencyKey(dep.name, dep.version);
      if (!transitiveUsageMap.has(key)) {
        transitiveUsageMap.set(key, {
          package: key,
          vulnerabilityCount: dep.vulnerabilities.length,
          usedBy: new Set(),
          fixAvailable: dep.vulnerabilities.some((v) => v.fixAvailable),
          vulnerabilityIds: new Set(dep.vulnerabilities.map((v) => v.id)),
        });
      }
      if (dep.parentDependency) {
        const mapEntry = transitiveUsageMap.get(key);
        if (mapEntry) {
          mapEntry.usedBy.add(dep.parentDependency);
        }
      }
    });

    const highImpactTransitive: TransitiveInsight[] = Array.from(transitiveUsageMap.values())
      .filter((item) => item.usedBy.size >= 1)
      .map((item) => {
        const impactMultiplier = item.usedBy.size * item.vulnerabilityCount;
        const vulnIds = Array.from(item.vulnerabilityIds);
        return {
          package: item.package,
          vulnerabilityCount: item.vulnerabilityCount,
          usedBy: Array.from(item.usedBy),
          fixAvailable: item.fixAvailable,
          impactMultiplier,
          quickWinPotential: impactMultiplier >= 6 && item.fixAvailable,
          vulnerabilityIds: vulnIds,
        };
      })
      .sort((a, b) => b.impactMultiplier - a.impactMultiplier);

    return highImpactTransitive;
  }

  /**
   * PHASE 1 - ANALYZER 3: Conflict Detection (LOCAL - NO AI)
   * Detects version conflicts across dependencies
   */
  private conflictDetectionAgent(): ConflictDetection[] {
    const conflicts: ConflictDetection[] = [];
    const packageConstraints = new Map<
      string,
      Array<{
        requiredBy: string;
        requiredVersion: string;
        currentVersion: string;
      }>
    >();

    // Build version constraint map
    this.flattenedAuditData.forEach((dep) => {
      dep.transitiveDependencies?.edges?.forEach((edge) => {
        const targetNode = dep.transitiveDependencies?.nodes?.[edge.target];
        if (targetNode) {
          const key = targetNode.name;
          if (!packageConstraints.has(key)) {
            packageConstraints.set(key, []);
          }
          const constraints = packageConstraints.get(key);
          if (constraints) {
            constraints.push({
              requiredBy: `${dep.name}@${dep.version}`,
              requiredVersion: edge.requirement || targetNode.version,
              currentVersion: targetNode.version,
            });
          }
        }
      });
    });

    // Detect conflicts
    packageConstraints.forEach((constraints, packageName) => {
      if (constraints.length > 1) {
        const versions = [...new Set(constraints.map((c) => c.requiredVersion))];
        if (versions.length > 1) {
          conflicts.push({
            package: packageName,
            conflictType: "version_mismatch",
            requiredVersions: versions,
            affectedParents: constraints.map((c) => c.requiredBy),
            riskLevel: this.assessConflictRisk(versions),
            suggestedResolution: `Review version constraints for ${packageName} and align parent dependencies`,
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Assess conflict risk level
   */
  private assessConflictRisk(versions: string[]): "critical" | "high" | "medium" | "low" {
    // Simple heuristic: check for major version differences
    const majorVersions = versions.map((v) => {
      const match = v.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });

    const uniqueMajors = [...new Set(majorVersions)];
    if (uniqueMajors.length > 1) return "high";
    return "low";
  }

  /**
   * PHASE 1 - ANALYZER 4: Quick Win Identification (LOCAL - NO AI)
   * Identifies high-impact, low-effort fixes
   */
  private quickWinIdentificationAgent(parallelResults: {
    priorities: PrioritizedVulnerability[];
    transitiveInsights: TransitiveInsight[];
    conflicts: ConflictDetection[];
  }): QuickWin[] {
    const conflictParents = new Set(
      parallelResults.conflicts.flatMap((conflict) => conflict.affectedParents),
    );

    // Direct dependencies with fixes (easy to update)
    const directQuickWins = parallelResults.priorities
      .filter(
        (vuln) =>
          vuln.dependencyLevel === "direct" &&
          vuln.fixAvailable &&
          vuln.priorityScore > 10 &&
          !conflictParents.has(this.createDependencyKey(vuln.packageName, vuln.packageVersion)),
      )
      .slice(0, 5)
      .map((vuln) => {
        // Find the dependency to get its ecosystem
        const dep = this.getFlattenedDependency(vuln.packageName, vuln.packageVersion);
        const ecosystem = dep?.ecosystem ?? "npm";
        const targetVersion = vuln.fixAvailable ?? "latest";
        const command = this.getUpdateCommand(ecosystem, vuln.packageName, targetVersion);

        return {
          type: "direct_upgrade" as const,
          package: `${vuln.packageName}@${vuln.packageVersion}`,
          targetVersion: vuln.fixAvailable,
          impact: `Fixes ${vuln.id} (Risk Score: ${vuln.priorityScore.toFixed(1)})`,
          effort: "low",
          command: command,
          estimatedTime: "5 minutes",
        };
      });

    // High-impact transitive fixes
    const transitiveQuickWins = parallelResults.transitiveInsights
      .filter((t) => t.quickWinPotential)
      .slice(0, 3)
      .map((t) => ({
        type: "transitive_multiplier" as const,
        package: t.package,
        impact: `Fixes ${t.vulnerabilityCount} vulnerabilities across ${t.usedBy.length} packages`,
        effort: "low",
        benefitMultiplier: t.impactMultiplier,
        estimatedTime: "10 minutes",
      }));

    return [...directQuickWins, ...transitiveQuickWins];
  }

  /**
   * PHASE 1 - ANALYZER 5: Critical Path Audit (LOCAL - NO AI)
   * Identifies high-risk dependency chains from manifest to vulnerable packages
   */
  private generateCriticalPaths(parallelResults: ParallelAuditResults): Array<{
    path: string;
    risk: string;
    resolution: string;
    estimated_impact: string;
    cve_id: string;
  }> {
    const pathsByPackage = new Map<
      string,
      {
        path: string;
        risk: string;
        resolution: string;
        estimated_impact: string;
        cve_id: string;
        score: number;
      }
    >();

    parallelResults.priorities
      .filter((v) => v.riskLevel === "critical" || v.riskLevel === "high")
      .forEach((vuln) => {
        const dep = this.getFlattenedDependency(vuln.packageName, vuln.packageVersion);
        if (!dep) return;

        const key = this.createDependencyKey(dep.name, dep.version);
        const existing = pathsByPackage.get(key);

        // Keep only the highest priority vulnerability per package
        if (existing && vuln.priorityScore <= existing.score) return;

        const cvss =
          parseFloat(vuln.severityScore?.cvss_v3 ?? vuln.severityScore?.cvss_v4 ?? "0") || 0;
        // Skip vulnerabilities without a valid CVSS score (0.0)
        // These can't be properly assessed for critical path analysis
        if (cvss === 0) return;
        const exploit = vuln.exploitAvailable ? " (exploit available)" : "";
        const via = dep.dependencyLevel === "transitive" ? ` via ${dep.parentDependency}` : "";

        // Build detailed impact description
        const vulnCount = dep.vulnerabilities?.length ?? 1;
        const locations = dep.usageFrequency > 1 ? ` across ${dep.usageFrequency} locations` : "";
        const fileInfo = `in ${dep.filePath}`;
        const parentInfo = dep.parentDependency ? ` (required by ${dep.parentDependency})` : "";
        const detailedImpact = `Resolves ${vulnCount} other vuln(s) ${fileInfo}${parentInfo}${locations}`;

        pathsByPackage.set(key, {
          path: dep.dependencyChain,
          risk: `${vuln.riskLevel.toUpperCase()}: CVSS ${cvss.toFixed(1)}${exploit}${via} - ${vuln.summary ?? vuln.id}`,
          resolution: vuln.fixAvailable
            ? dep.dependencyLevel === "direct"
              ? `Upgrade ${dep.name} to ${vuln.fixAvailable}`
              : `Update ${dep.parentDependency} to resolve ${dep.name}`
            : "No fix available - consider alternatives",
          estimated_impact: detailedImpact,
          cve_id: vuln.id,
          score: vuln.priorityScore,
        });
      });

    return Array.from(pathsByPackage.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ score: _, ...rest }) => rest);
  }

  /**
   * PHASE 2: Process dependencies in batches with adaptive sizing
   */
  private async processDependenciesInBatches(
    parallelResults: ParallelAuditResults,
  ): Promise<Array<Record<string, unknown>>> {
    // Separate dependencies by severity for adaptive batching
    const depsWithVulns = this.flattenedAuditData.filter(
      (dep) => dep.vulnerabilities && dep.vulnerabilities.length > 0,
    );

    const criticalDeps: FlattenedDependency[] = [];
    const highDeps: FlattenedDependency[] = [];
    const mediumLowDeps: FlattenedDependency[] = [];

    // Categorize by highest vulnerability CVSS score
    depsWithVulns.forEach((dep) => {
      let maxCvss = 0;
      (dep.vulnerabilities ?? []).forEach((vuln) => {
        const score =
          parseFloat(vuln.severityScore?.cvss_v3 ?? "0") ||
          parseFloat(vuln.severityScore?.cvss_v4 ?? "0") ||
          0;
        if (score > maxCvss) {
          maxCvss = score;
        }
      });

      if (maxCvss >= 9.0) {
        criticalDeps.push(dep);
      } else if (maxCvss >= 7.0) {
        highDeps.push(dep);
      } else {
        mediumLowDeps.push(dep);
      }
    });

    // Create batches with adaptive sizing
    const criticalBatches = this.createBatches(criticalDeps, this.CRITICAL_BATCH_SIZE);
    const highBatches = this.createBatches(highDeps, this.HIGH_BATCH_SIZE);
    const mediumLowBatches = this.createBatches(mediumLowDeps, this.MEDIUM_LOW_BATCH_SIZE);

    const allBatches = [
      ...criticalBatches.map((batch) => ({
        batch,
        severity: "critical" as const,
      })),
      ...highBatches.map((batch) => ({ batch, severity: "high" as const })),
      ...mediumLowBatches.map((batch) => ({
        batch,
        severity: "medium" as const,
      })),
    ];

    const batchResults: Array<Record<string, unknown>> = [];
    let processedCount = 0;
    const totalDeps = depsWithVulns.length;

    for (let i = 0; i < allBatches.length; i++) {
      const { batch, severity } = allBatches[i];
      const severityLabel =
        severity === "critical" ? "Critical" : severity === "high" ? "High Priority" : "Medium/Low";

      const batchProgress = processedCount / totalDeps;
      const scaledProgress = Math.round(18 + batchProgress * 44);

      this.progressCallback(
        "batch_processing",
        `Processing batch ${i + 1} of ${allBatches.length} [${severityLabel}]...`,
        {
          batchNumber: i + 1,
          totalBatches: allBatches.length,
          batchSize: batch.length,
          severity,
          processedCount,
          totalDeps,
          progress: scaledProgress,
        },
      );

      const batchResult = await this.batchFixPlanAgent(batch, parallelResults, i + 1, severity);
      batchResults.push(batchResult);
      processedCount += batch.length;
    }

    return batchResults;
  }

  /**
   * Create batches from dependencies
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * PHASE 2 - Batch Fix Plan Agent (AI CALL)
   * Generates fix plans for a batch of dependencies with severity context
   */
  private async batchFixPlanAgent(
    batch: FlattenedDependency[],
    parallelContext: ParallelAuditResults,
    batchNumber: number,
    severity: "critical" | "high" | "medium",
  ): Promise<Record<string, unknown>> {
    const severityContext =
      severity === "critical"
        ? prompts.BATCH_FIX_PLAN_GENERATION.severityContext.critical
        : severity === "high"
          ? prompts.BATCH_FIX_PLAN_GENERATION.severityContext.high
          : prompts.BATCH_FIX_PLAN_GENERATION.severityContext.medium;

    const batchData = JSON.stringify(
      batch.map((d) => ({
        name: d.name,
        version: d.version,
        ecosystem: d.ecosystem,
        vulnerabilities: d.vulnerabilities,
        filePath: d.filePath,
        dependencyLevel: d.dependencyLevel,
        usageFrequency: d.usageFrequency,
      })),
      null,
      2,
    );

    // Get the ecosystem from the first dependency (all deps in batch are same ecosystem)
    const ecosystem = batch[0]?.ecosystem ?? "npm";
    const ecosystemContext = `\n\nIMPORTANT: All dependencies in this batch are from the ${ecosystem} ecosystem. Generate commands using the correct package manager for ${ecosystem}.`;

    const systemPrompt = `${prompts.BATCH_FIX_PLAN_GENERATION.system}${ecosystemContext}\n\n${severityContext}`;
    const userPrompt = prompts.BATCH_FIX_PLAN_GENERATION.template
      .replace("{{batchLength}}", String(batch.length))
      .replace("{{batchData}}", batchData)
      .replace(
        "{{knownConflicts}}",
        JSON.stringify(this.getTopConflictPackages(parallelContext.conflicts, parallelContext.conflicts.length)),
      )
      .replace(
        "{{transitiveOpportunities}}",
        JSON.stringify(this.getTopTransitivePackages(parallelContext.transitiveInsights, 5)),
      );

    try {
      const result = await AIUtils.callAI<Record<string, unknown>>(
        this.ai,
        systemPrompt,
        userPrompt,
        batchFixPlanSchema,
        {
          model: this.defaultModel,
        },
      );

      return { ...result, batchId: batchNumber };
    } catch (error) {
      console.error(`Error in batch ${batchNumber}:`, error);
      return {
        batchId: batchNumber,
        dependencies: [],
        error: "Failed to generate batch fix plan",
      };
    }
  }

  /**
   * PROGRESSIVE SYNTHESIS - Step 1: Generate Executive Summary (AI CALL)
   * Quick generation of high-level overview to populate Overview tab immediately
   */
  private async generateExecutiveSummary(
    batchResults: Array<Record<string, unknown>>,
    _parallelResults: ParallelAuditResults,
  ): Promise<Record<string, unknown>> {
    const totalVulns = this.getTotalVulnerabilitiesCount();
    const fixableVulns = this.getFixableVulnerabilities();

    const systemPrompt = prompts.EXECUTIVE_SUMMARY_GENERATION.system;
    const userPrompt = prompts.EXECUTIVE_SUMMARY_GENERATION.template
      .replace("{{totalVulns}}", String(totalVulns))
      .replace("{{fixableVulns}}", String(fixableVulns))
      .replace("{{quickWins}}", JSON.stringify(_parallelResults.quickWins.slice(0, 5), null, 2));

    try {
      const result = await AIUtils.callAIWithRetry(() => {
        return AIUtils.callAI<Record<string, unknown>>(
          this.ai,
          systemPrompt,
          userPrompt,
          executiveSummarySchema,
          { model: this.defaultModel },
        );
      });

      // Validate structure
      if (!result || typeof result !== "object") {
        throw new Error("Invalid executive summary structure");
      }

      // Validate required fields
      const requiredFields = [
        "critical_insights",
        "total_vulnerabilities",
        "fixable_count",
        "risk_score",
      ];
      const missingFields = requiredFields.filter((field) => !(field in result));
      if (missingFields.length > 0) {
        console.warn(`Executive summary missing fields: ${missingFields.join(", ")}`);
      }

      return result;
    } catch (error) {
      console.error("Error generating executive summary:", error);
      return {
        critical_insights: ["Summary generation failed - using basic analysis"],
        total_vulnerabilities: totalVulns,
        fixable_count: fixableVulns,
        estimated_fix_time: "Unknown",
        estimated_total_time: "Unknown",
        risk_score: totalVulns > 50 ? 8 : totalVulns > 20 ? 6 : 4,
        quick_wins: _parallelResults.quickWins.slice(0, 3).map((qw) => ({
          action: qw.command ?? qw.package,
          impact: qw.impact,
        })),
        fallback: true,
      };
    }
  }

  /**
   * PROGRESSIVE SYNTHESIS - Step 2: Generate Priority Phases (AI CALL)
   * Organizes all fixes into actionable phases to populate Phases tab
   */
  private async generatePriorityPhases(
    _batchResults: Array<Record<string, unknown>>,
    _parallelResults: ParallelAuditResults,
  ): Promise<Array<Record<string, unknown>>> {
    const systemPrompt = prompts.PRIORITY_PHASES_GENERATION.system;
    const userPrompt = prompts.PRIORITY_PHASES_GENERATION.template.replace(
      "{{batchResults}}",
      JSON.stringify(_batchResults, null, 2),
    );

    try {
      const result = await AIUtils.callAIWithRetry(() => {
        return AIUtils.callAI<Array<Record<string, unknown>>>(
          this.ai,
          systemPrompt,
          userPrompt,
          priorityPhasesSchema,
          { model: this.defaultModel },
        );
      });

      // Validate result is an array
      if (!Array.isArray(result)) {
        console.warn("Priority phases returned invalid structure, using empty array");
        return [];
      }

      // Validate each phase has required fields
      const validatedPhases = result.filter((phase) => {
        if (!phase || typeof phase !== "object") return false;
        const hasRequiredFields = "phase" in phase && "name" in phase && "fixes" in phase;
        if (!hasRequiredFields) {
          console.warn("Phase missing required fields:", phase);
        }
        return hasRequiredFields;
      });

      return validatedPhases;
    } catch (error) {
      console.error("Error generating priority phases:", error);
      return [];
    }
  }

  /**
   * PROGRESSIVE SYNTHESIS - Step 2.5: Generate Smart Actions (AI CALL)
   * AI-generated top 3 prioritized actions based on severity and impact
   */
  private async generateSmartActions(
    parallelResults: ParallelAuditResults,
    totalVulns: number,
    fixableVulns: number,
    criticalHighCount: number,
  ): Promise<Array<Record<string, unknown>>> {
    const systemPrompt = prompts.SMART_ACTIONS_GENERATION.system;
    const userPrompt = prompts.SMART_ACTIONS_GENERATION.template
      .replace("{{totalVulns}}", String(totalVulns))
      .replace("{{fixableVulns}}", String(fixableVulns))
      .replace("{{criticalHighCount}}", String(criticalHighCount))
      .replace("{{quickWins}}", JSON.stringify(this.takeFirstItems(parallelResults.quickWins, 5), null, 2))
      .replace(
        "{{transitiveOpportunities}}",
        JSON.stringify(this.takeFirstItems(parallelResults.transitiveInsights, 5), null, 2),
      )
      .replace("{{conflicts}}", JSON.stringify(this.takeFirstItems(parallelResults.conflicts, 3), null, 2));

    try {
      const result = await AIUtils.callAIWithRetry(() => {
        return AIUtils.callAI<Array<Record<string, unknown>>>(
          this.ai,
          systemPrompt,
          userPrompt,
          smartActionsSchema,
          { model: this.defaultModel },
        );
      });
      // Validate result is an array
      if (!Array.isArray(result)) {
        throw new Error("Invalid smart actions structure");
      }

      // Validate each action has required fields (command is optional)
      const validatedActions = result.filter((action) => {
        if (!action || typeof action !== "object") return false;
        const hasRequiredFields =
          action.hasOwnProperty("title") &&
          action.hasOwnProperty("description") &&
          action.hasOwnProperty("impact") &&
          action.hasOwnProperty("estimated_time");
        if (!hasRequiredFields) {
          console.warn("Smart action missing required fields:", action);
        }
        return hasRequiredFields;
      });

      // Ensure we have exactly 3 actions, pad with defaults if needed
      if (validatedActions.length < 3) {
        console.warn(`Only ${validatedActions.length} valid smart actions, using fallback`);
        throw new Error("Insufficient smart actions");
      }

      return validatedActions.slice(0, 3);
    } catch (error) {
      console.error("Error generating smart actions:", error);
      // Return fallback smart actions
      return [
        {
          title: "Start with Quick Wins",
          description:
            "Begin with low-effort, high-impact fixes that resolve vulnerabilities quickly.",
          impact: `Fixes ${Math.min(fixableVulns, 10)} vulnerabilities`,
          estimated_time: "15-20 minutes",
        },
        {
          title: "Address Critical Vulnerabilities",
          description:
            "Focus on critical and high-severity vulnerabilities that pose immediate risk.",
          impact: `Resolves ${criticalHighCount} critical/high severity issues`,
          estimated_time: "30-45 minutes",
        },
        {
          title: "Fix Transitive Dependencies",
          description:
            "Update shared transitive dependencies to fix multiple vulnerabilities at once.",
          impact: "High-impact fixes across multiple packages",
          estimated_time: "20-30 minutes",
        },
      ];
    }
  }

  /**
   * PROGRESSIVE SYNTHESIS - Step 3: Generate Risk Management (AI CALL)
   * Creates risk assessment and strategy to populate Risk & Strategy tab
   */
  private async generateRiskManagement(
    batchResults: Array<Record<string, unknown>>,
    _parallelResults: ParallelAuditResults,
  ): Promise<Record<string, unknown>> {
    const systemPrompt = prompts.RISK_MANAGEMENT_GENERATION.system;
    const userPrompt = prompts.RISK_MANAGEMENT_GENERATION.template.replace(
      "{{batchResults}}",
      JSON.stringify(batchResults.slice(0, 3), null, 2),
    );

    try {
      const result = await AIUtils.callAIWithRetry(() => {
        return AIUtils.callAI<Record<string, unknown>>(
          this.ai,
          systemPrompt,
          userPrompt,
          riskManagementSchema,
          { model: this.defaultModel },
        );
      });
      // Validate structure
      if (!result || typeof result !== "object") {
        throw new Error("Invalid risk management structure");
      }

      // Validate required fields
      const requiredFields = [
        "overall_assessment",
        "breaking_changes_summary",
        "testing_strategy",
        "rollback_procedures",
      ];
      const missingFields = requiredFields.filter((field) => !(field in result));
      if (missingFields.length > 0) {
        console.warn(`Risk management missing fields: ${missingFields.join(", ")}`);
      }

      return result;
    } catch (error) {
      console.error("Error generating risk management:", error);
      return {
        overall_assessment: "Unable to generate risk assessment",
        breaking_changes_summary: {
          has_breaking_changes: false,
          count: 0,
          affected_areas: [],
          mitigation_steps: [],
        },
        testing_strategy: {
          unit_tests: "Test all updated packages",
          integration_tests: "Test integration points",
          regression_tests: "Run full regression suite",
          manual_verification: "Manually verify critical functionality",
          security_validation: "Validate security fixes",
        },
        rollback_procedures: [
          {
            phase: 1,
            procedure: "Create backup before applying fixes",
            validation: "Verify backup integrity",
          },
          {
            phase: 2,
            procedure: "Use git to revert changes if needed",
            validation: "Check git status after rollback",
          },
        ],
        monitoring_recommendations: [
          "Monitor application logs for errors",
          "Track dependency update alerts",
        ],
      };
    }
  }

  /**
   * Helper: Generate batch summary for progress updates
   */
  private generateBatchSummary(
    batchResults: Array<Record<string, unknown>>,
  ): Record<string, unknown> {
    const totalPackages = batchResults.reduce((sum, batch) => {
      const deps = (batch.dependencies as Array<Record<string, unknown>>) ?? [];
      return sum + deps.length;
    }, 0);

    return {
      total_batches: batchResults.length,
      total_packages: totalPackages,
      batches: batchResults.map((batch, i) => ({
        batch_number: i + 1,
        package_count: ((batch.dependencies as Array<Record<string, unknown>>) ?? []).length,
      })),
    };
  }

  /**
   * PHASE 4: Enrichment & Validation (LOCAL - NO AI)
   * Adds execution metadata, CLI commands, rollback procedures, and validation
   */
  private enrichWithAutomation(plan: Record<string, unknown>): Record<string, unknown> {
    const generatedAt = new Date().toISOString();
    const timestamp = generatedAt.split("T")[0];

    // Extract priority phases from the plan
    const priorityPhases = (plan.priority_phases as Array<Record<string, unknown>>) ?? [];

    // Generate CLI commands for each phase
    const cliCommands = this.generateCLICommands(priorityPhases);

    // Generate rollback procedures
    const rollbackProcedures = this.generateRollbackProcedures();

    // Generate automated scripts
    const automatedScripts = this.generateAutomatedScripts(priorityPhases, timestamp);

    // Validate all generated commands
    const validationResults = this.validateScripts(cliCommands);

    // Reconstruct in the correct order: Overview → Intelligence → Phases → Automation → Risk
    const enriched = {
      executive_summary: plan.executive_summary,
      dependency_intelligence: plan.dependency_intelligence,
      priority_phases: plan.priority_phases,
      automated_execution: {
        one_click_script: automatedScripts.bash_script,
        safe_mode_script: this.generateSafeModeScript(priorityPhases, timestamp),
        phase_scripts: priorityPhases.map((phase, index) => ({
          phase: index + 1,
          name: phase.name ?? `Phase ${index + 1}`,
          script: this.generatePhaseScript(phase, index + 1),
        })),
        cli_commands: cliCommands,
        rollback_procedures: rollbackProcedures,
        validation: validationResults,
      },
      risk_management: plan.risk_management,
      long_term_strategy: plan.long_term_strategy, // If exists
      metadata: {
        generated_at: generatedAt,
        generation_date: timestamp,
        total_packages_analyzed: this.flattenedAuditData.length,
        total_vulnerabilities: this.getTotalVulnerabilitiesCount(),
        fixable_vulnerabilities: this.getFixableVulnerabilities(),
        ecosystem: this.detectEcosystem(),
        project_type: "Node.js",
        analysis_version: "2.0.0",
      },
    };

    return enriched;
  }

  /**
   * Generate ready-to-execute CLI commands for each phase
   */
  private generateCLICommands(phases: Array<Record<string, unknown>>): Record<string, unknown> {
    const commands: Record<string, unknown> = {};

    phases.forEach((phase, index) => {
      const phaseNumber = index + 1;
      const phaseName = this.getPhaseName(phase, phaseNumber);
      const phaseCommands = this.extractCommandsFromPhase(phase);

      commands[`phase_${phaseNumber}`] = {
        title: phaseName,
        estimated_time: phase.estimated_time ?? "Unknown",
        commands: phaseCommands,
        single_command: phaseCommands.join(" && "),
      };
    });

    return commands;
  }

  /**
   * Generate rollback procedures for safe updates
   */
  private generateRollbackProcedures(): Record<string, unknown> {
    const timestamp = new Date().toISOString().split("T")[0];

    return {
      backup_command: `npm list --json > package-backup-${timestamp}.json`,
      backup_file: `package-backup-${timestamp}.json`,
      restore_instructions: [
        "1. Stop your application",
        `2. Restore from backup: npm ci (if using package-lock.json)`,
        "3. Or manually reinstall previous versions from backup file",
        "4. Test your application",
      ],
      emergency_rollback: "git checkout package.json package-lock.json && npm ci",
      notes: [
        "Always commit your changes before applying fixes",
        "Test in a development environment first",
        "Keep the backup file until fixes are verified",
      ],
    };
  }

  /**
   * Generate automated execution scripts
   */
  private generateAutomatedScripts(
    phases: Array<Record<string, unknown>>,
    timestamp: string,
  ): Record<string, unknown> {
    const bashScript = this.generateBashScript(phases, timestamp);

    return {
      bash_script: bashScript,
      usage: "chmod +x fix-vulnerabilities.sh && ./fix-vulnerabilities.sh",
      script_file: `fix-vulnerabilities-${timestamp}.sh`,
    };
  }

  /**
   * Extract package name from versioned string (e.g., "lodash@4.17.0" -> "lodash")
   */
  private extractPackageName(packageWithVersion: string): string {
    if (!packageWithVersion) return "";
    // Handle scoped packages like @types/node@1.0.0
    if (packageWithVersion.startsWith("@")) {
      const parts = packageWithVersion.split("@");
      // For @scope/name@version, parts = ["", "scope/name", "version"]
      if (parts.length >= 3) {
        return `@${parts[1]}`;
      }
      return packageWithVersion;
    }
    // Regular package like lodash@4.17.0
    const atIndex = packageWithVersion.lastIndexOf("@");
    if (atIndex > 0) {
      return packageWithVersion.substring(0, atIndex);
    }
    return packageWithVersion;
  }

  /**
   * Get phase name with fallbacks
   */
  private getPhaseName(phase: Record<string, unknown>, phaseNumber: number): string {
    return (phase.name ?? phase.phase_title ?? `Phase ${phaseNumber}`) as string;
  }

  /**
   * Strip <code> tags from command strings
   */
  private cleanCommand(cmd: string): string {
    return cmd.replace(/<\/?code>/g, "").trim();
  }

  /**
   * Extract all executable commands from a phase
   * Returns array of shell-ready commands
   */
  private extractCommandsFromPhase(phase: Record<string, unknown>): string[] {
    const fixes = (phase.fixes as Array<Record<string, unknown>>) ?? [];
    const batchCommands = (phase.batch_commands as string[]) ?? [];

    const directCommands: string[] = [];
    const updatePackages: string[] = [];
    const installPackages: string[] = [];

    fixes.forEach((fix) => {
      const command = fix.command as string;
      const packageField = fix.package as string;
      const targetVersion = (fix.target_version ?? fix.targetVersion) as string;
      const action = fix.action as string;

      if (command) {
        const cleanCmd = this.cleanCommand(command);
        if (cleanCmd && !directCommands.includes(cleanCmd)) {
          directCommands.push(cleanCmd);
        }
      } else if (packageField && targetVersion) {
        const cleanName = this.extractPackageName(packageField);
        if (cleanName) {
          const pkgSpec = `${cleanName}@${targetVersion}`;
          if (action === "install") {
            installPackages.push(pkgSpec);
          } else {
            updatePackages.push(pkgSpec);
          }
        }
      }
    });

    const commands: string[] = [...directCommands];

    if (updatePackages.length > 0) {
      commands.push(`npm update ${updatePackages.join(" ")}`);
    }
    if (installPackages.length > 0) {
      commands.push(`npm install ${installPackages.join(" ")}`);
    }

    // Fallback to batch_commands if no commands extracted from fixes
    if (commands.length === 0) {
      batchCommands.forEach((cmd) => {
        const cleanCmd = this.cleanCommand(cmd);
        if (cleanCmd) {
          commands.push(cleanCmd);
        }
      });
    }

    return commands;
  }

  /**
   * Generate comprehensive bash script for automated fixes
   */
  private generateBashScript(phases: Array<Record<string, unknown>>, timestamp: string): string {
    let script = `#!/bin/bash\n\n`;
    script += `# Automated Vulnerability Fix Script\n`;
    script += `# Generated: ${timestamp}\n`;
    script += `# Total Phases: ${phases.length}\n\n`;
    script += `set -e  # Exit on error\n\n`;
    script += `echo "Starting vulnerability fix process..."\n\n`;
    script += `# Create backup\n`;
    script += `echo "Creating backup..."\n`;
    script += `npm list --json > package-backup-${timestamp}.json\n`;
    script += `echo "Backup created: package-backup-${timestamp}.json"\n\n`;

    phases.forEach((phase, index) => {
      const phaseNumber = index + 1;
      const phaseName = this.getPhaseName(phase, phaseNumber);
      const commands = this.extractCommandsFromPhase(phase);

      script += `# Phase ${phaseNumber}: ${phaseName}\n`;
      script += `echo "\n=== Phase ${phaseNumber}: ${phaseName} ==="\n`;
      script += `echo "Estimated time: ${phase.estimated_time ?? "Unknown"}"\n\n`;

      if (commands.length > 0) {
        commands.forEach((cmd) => {
          script += `${cmd}\n`;
        });
        script += `echo "Phase ${phaseNumber} complete!"\n\n`;
      }
    });

    script += `echo "\n=== All fixes applied successfully! ==="\n`;
    script += `echo "Please test your application before deploying."\n`;
    script += `echo "Rollback available using: package-backup-${timestamp}.json"\n`;

    return script;
  }

  /**
   * Generate safe mode script with validation and rollback
   */
  private generateSafeModeScript(
    phases: Array<Record<string, unknown>>,
    timestamp: string,
  ): string {
    let script = `#!/bin/bash\n\n`;
    script += `# Safe Mode Vulnerability Fix Script\n`;
    script += `# Generated: ${timestamp}\n`;
    script += `# Includes validation and rollback on failure\n\n`;
    script += `set -e  # Exit on error\n\n`;
    script += `echo "Starting SAFE MODE vulnerability fix process..."\n\n`;
    script += `# Create backup\n`;
    script += `npm list --json > package-backup-${timestamp}.json\n`;
    script += `git diff > changes-backup-${timestamp}.patch\n\n`;

    phases.forEach((phase, index) => {
      const phaseNumber = index + 1;
      const phaseName = this.getPhaseName(phase, phaseNumber);
      const commands = this.extractCommandsFromPhase(phase);

      script += `# Phase ${phaseNumber}: ${phaseName}\n`;
      script += `echo "\n=== Phase ${phaseNumber}: ${phaseName} ==="\n`;

      if (commands.length > 0) {
        commands.forEach((cmd) => {
          script += `${cmd} || { echo "Phase ${phaseNumber} failed! Rolling back..."; git apply changes-backup-${timestamp}.patch; exit 1; }\n`;
        });
        script += `npm test || { echo "Tests failed! Rolling back..."; git apply changes-backup-${timestamp}.patch; exit 1; }\n\n`;
      }
    });

    script += `echo "\n=== All fixes applied and validated successfully! ==="\n`;
    return script;
  }

  /**
   * Generate individual phase script
   */
  private generatePhaseScript(phase: Record<string, unknown>, phaseNumber: number): string {
    const phaseName = this.getPhaseName(phase, phaseNumber);
    const commands = this.extractCommandsFromPhase(phase);

    let script = `#!/bin/bash\n\n`;
    script += `# Phase ${phaseNumber}: ${phaseName}\n`;
    script += `# ${phase.urgency ?? "Priority fix"}\n\n`;

    if (commands.length > 0) {
      commands.forEach((cmd) => {
        script += `${cmd}\n`;
      });
      script += `echo "Phase ${phaseNumber} complete!"\n`;
    } else {
      script += `echo "No updates needed for Phase ${phaseNumber}"\n`;
    }

    return script;
  }

  /**
   * Validate generated scripts for syntax and safety
   */
  private validateScripts(commands: Record<string, unknown>): Record<string, unknown> {
    const validationResults: Record<string, unknown> = {
      valid: true,
      warnings: [],
      errors: [],
    };

    // Basic validation logic
    Object.entries(commands).forEach(([phase, phaseData]) => {
      const data = phaseData as Record<string, unknown>;
      const phaseCommands = (data.commands as string[]) ?? [];

      phaseCommands.forEach((cmd) => {
        // Check for potentially dangerous commands
        if (cmd.includes("--force") || cmd.includes("-f")) {
          (validationResults.warnings as string[]).push(
            `${phase}: Command uses --force flag: ${cmd}`,
          );
        }

        // Validate npm command structure
        if (!cmd.startsWith("npm ")) {
          (validationResults.errors as string[]).push(`${phase}: Invalid command format: ${cmd}`);
          validationResults.valid = false;
        }
      });
    });

    return validationResults;
  }

  /**
   * Detect ecosystem type from dependencies
   */
  private detectEcosystem(): string {
    // Simple detection based on first dependency
    if (this.flattenedAuditData.length > 0) {
      return this.flattenedAuditData[0].ecosystem;
    }
    return "npm";
  }

  /**
   * Get total and fixable vulnerabilities count in a single pass
   */
  private getVulnerabilityCounts(): { total: number; fixable: number } {
    // Return cached values if available
    if (this.totalVulnerabilitiesCache !== null && this.fixableVulnerabilitiesCache !== null) {
      return {
        total: this.totalVulnerabilitiesCache,
        fixable: this.fixableVulnerabilitiesCache,
      };
    }

    let total = 0;
    let fixable = 0;

    Object.values(this.auditData.dependencies).forEach((deps) => {
      deps.forEach((dep) => {
        // Count direct vulnerabilities
        if (dep.vulnerabilities) {
          dep.vulnerabilities.forEach((vuln) => {
            total += 1;
            if (vuln.fixAvailable) fixable += 1;
          });
        }

        // Count transitive vulnerabilities
        dep.transitiveDependencies?.nodes?.forEach((transDep) => {
          if (transDep.vulnerabilities) {
            transDep.vulnerabilities.forEach((vuln) => {
              total += 1;
              if (vuln.fixAvailable) fixable += 1;
            });
          }
        });
      });
    });

    // Cache the results
    this.totalVulnerabilitiesCache = total;
    this.fixableVulnerabilitiesCache = fixable;

    return { total, fixable };
  }

  /**
   * Generate the correct package manager update command based on ecosystem
   */
  private getUpdateCommand(ecosystem: string, packageName: string, version: string): string {
    switch (ecosystem) {
      case "npm":
        return `npm update ${packageName}@${version}`;
      case "PyPI":
        return `pip install --upgrade ${packageName}==${version}`;
      case "Maven":
        return `# Update ${packageName} to ${version} in pom.xml`;
      case "Gradle":
        return `# Update ${packageName} to ${version} in build.gradle`;
      case "Go":
        return `go get ${packageName}@v${version}`;
      case "Cargo":
        return `cargo update ${packageName} --precise ${version}`;
      case "Rubygems":
        return `bundle update ${packageName}`;
      case "Composer":
        return `composer require ${packageName}:${version}`;
      default:
        return `# Update ${packageName} to ${version}`;
    }
  }

  /**
   * Get total vulnerabilities count (uses cache)
   */
  private getTotalVulnerabilitiesCount(): number {
    return this.getVulnerabilityCounts().total;
  }

  /**
   * Get fixable vulnerabilities count (uses cache)
   */
  private getFixableVulnerabilities(): number {
    return this.getVulnerabilityCounts().fixable;
  }
}

export default AgentsService;
