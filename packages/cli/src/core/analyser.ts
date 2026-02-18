import axios from "axios";
import yaml from "js-yaml";
import { parseStringPromise } from "xml2js";
import cvssCalculator from "ae-cvss-calculator";

import {
  DEPS_DEV_BASE_URL,
  OSV_DEV_VULN_BATCH_URL,
  OSV_DEV_VULN_DET_URL,
  DEFAULT_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
  DEFAULT_TRANSITIVE_BATCH_SIZE,
  DEFAULT_TRANSITIVE_CONCURRENCY,
  DEFAULT_VULN_BATCH_SIZE,
  DEFAULT_VULN_CONCURRENCY,
  PROGRESS_STEPS,
  manifestFiles,
} from "./constants.js";

import {
  Dependency,
  DependencyGroups,
  Ecosystem,
  ManifestFiles,
  MavenDependency,
  OSVBatchResponse,
  OSVQuery,
  TransitiveDependency,
  TransitiveDependencyResult,
  Vulnerability,
  DepsDevDependency,
} from "./types.js";

import { GitHubService } from "./github.js";
import { ProgressService } from "./progress.js";
import { loadConfig, type Config } from "./config.js";

const { Cvss3P0, Cvss4P0 } = cvssCalculator as {
  Cvss3P0: new (vector: string) => { calculateExactOverallScore: () => number };
  Cvss4P0: new (vector: string) => { calculateOverallScore: () => number };
};

const MANIFEST_NAME_TO_ECOSYSTEM = new Map<string, string>(
  Object.entries(manifestFiles).map(([ecosystem, fileName]) => [fileName, ecosystem]),
);

export interface AnalyseOptions {
  files?: string[];
  repo?: string;
  branch?: string;
  token?: string;
  includeTransitive?: boolean;
  onProgress?: (step: string, progress: number) => void;
}

export interface AnalysisResult {
  dependencies: DependencyGroups;
  errors?: string[];
  totalDependencies: number;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export class Analyser {
  private globalDependencyMap = new Map<string, Dependency>();
  private dependencyFileMapping = new Map<string, string[]>();
  private stepErrors = new Map<string, string[]>();
  private progressService: ProgressService;
  private githubService: GitHubService;
  private config: Config;
  private npmLatestVersionCache = new Map<string, Promise<string>>();

  private performanceConfig = {
    concurrency: DEFAULT_CONCURRENCY,
    batchSize: DEFAULT_BATCH_SIZE,
    vulnConcurrency: DEFAULT_VULN_CONCURRENCY,
    vulnBatchSize: DEFAULT_VULN_BATCH_SIZE,
    transitiveConcurrency: DEFAULT_TRANSITIVE_CONCURRENCY,
    transitiveBatchSize: DEFAULT_TRANSITIVE_BATCH_SIZE,
  };

  constructor(options: { token?: string; onProgress?: (step: string, progress: number) => void } = {}) {
    this.config = loadConfig();
    this.progressService = new ProgressService();
    this.githubService = new GitHubService(options.token || this.config.github_token);
    
    if (options.onProgress) {
      this.progressService.onProgress(options.onProgress);
    }
  }

  private resetState(): void {
    this.globalDependencyMap.clear();
    this.dependencyFileMapping.clear();
    this.stepErrors.clear();
  }

  private addStepError(step: string, error: unknown): void {
    if (!this.stepErrors.has(step)) {
      this.stepErrors.set(step, []);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.stepErrors.get(step)?.push(errorMessage);
  }

  private consolidateErrors(): string[] {
    const errors: string[] = [];
    this.stepErrors.forEach((errs, step) => {
      if (errs.length > 0) {
        if (errs.length === 1) {
          errors.push(`${step}: ${errs[0]}`);
        } else {
          errors.push(`${step}: ${errs.length} issues encountered`);
        }
      }
    });
    return errors;
  }

  private addDependencyToGlobalMap(dependency: Dependency, filePath: string): void {
    const depKey = `${dependency.name}@${dependency.version}@${dependency.ecosystem}`;
    
    if (!this.globalDependencyMap.has(depKey)) {
      this.globalDependencyMap.set(depKey, dependency);
    }
    
    if (!this.dependencyFileMapping.has(depKey)) {
      this.dependencyFileMapping.set(depKey, []);
    }
    const files = this.dependencyFileMapping.get(depKey);
    if (files && !files.includes(filePath)) {
      files.push(filePath);
    }
  }

  private mapDependenciesToFiles(processedDeps: Map<string, Dependency>): DependencyGroups {
    const result: DependencyGroups = {};
    processedDeps.forEach((dep, depKey) => {
      const files = this.dependencyFileMapping.get(depKey) ?? [];
      files.forEach((filePath) => {
        if (!result[filePath]) {
          result[filePath] = [];
        }
        result[filePath].push({ ...dep });
      });
    });
    return result;
  }

  private normalizeVersion(version: string): string {
    if (!version) return "unknown";
    return version.replace(/^[\^~>=<]+/, "").trim();
  }

  private mapEcosystem(system: string): Ecosystem {
    const mapping: Record<string, Ecosystem> = {
      npm: Ecosystem.NPM,
      pypi: Ecosystem.PYPI,
      maven: Ecosystem.MAVEN,
      go: Ecosystem.GO,
      cargo: Ecosystem.CARGO,
      rubygems: Ecosystem.RUBYGEMS,
      pub: Ecosystem.PUB,
    };
    return mapping[system.toLowerCase()] || Ecosystem.NULL;
  }

  private getCVSSSeverity(severityArray: { type: string; score: string }[]): { cvss_v3?: string; cvss_v4?: string } {
    const result: { cvss_v3?: string; cvss_v4?: string } = {};
    
    for (const sev of severityArray) {
      try {
        if (sev.type === "CVSS_V3") {
          const cvss = new Cvss3P0(sev.score);
          result.cvss_v3 = cvss.calculateExactOverallScore().toString();
        } else if (sev.type === "CVSS_V4") {
          const cvss = new Cvss4P0(sev.score);
          result.cvss_v4 = cvss.calculateOverallScore().toString();
        }
      } catch {
        // Invalid CVSS, skip
      }
    }
    return result;
  }

  private async retryApiCall<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 500,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error: unknown) {
        const isNonRetryable = this.isNonRetryableError(error);
        if (isNonRetryable || attempt === maxRetries) {
          throw error;
        }
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Max retries exceeded");
  }

  private isNonRetryableError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { status?: number } }).response;
      if (response?.status) {
        const status = response.status;
        return status >= 400 && status < 500 && status !== 429;
      }
    }
    return false;
  }

  private async processBatchesInParallel<T, R>(
    items: T[],
    batchSize: number,
    concurrency: number,
    processor: (item: T) => Promise<R>,
    progressStep?: string,
  ): Promise<R[]> {
    const results: R[] = [];
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    if (batches.length === 0) {
      return results;
    }

    for (let i = 0; i < batches.length; i += concurrency) {
      const concurrentBatches = batches.slice(i, i + concurrency);
      const batchPromises = concurrentBatches.map(async (batch) => {
        return Promise.all(batch.map((item) => processor(item)));
      });
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());

      if (progressStep) {
        const processed = Math.min(i + concurrency, batches.length);
        const progressPercentage = (processed / batches.length) * 100;
        this.progressService.progressUpdater(progressStep, progressPercentage);
      }
    }

    return results;
  }

  private async fetchLatestVersionFromNpm(packageName: string): Promise<string> {
    const cachedRequest = this.npmLatestVersionCache.get(packageName);
    if (cachedRequest) {
      return cachedRequest;
    }

    const request = this.retryApiCall(
      () => axios.get(`https://registry.npmjs.org/${packageName}/latest`, { timeout: 5000 }),
      2,
      300,
    )
      .then((response) => response.data.version || "unknown")
      .catch(() => "unknown");

    this.npmLatestVersionCache.set(packageName, request);
    return request;
  }

  // File parsers
  private async processNpmFiles(files: Array<{ path: string; content: string }>): Promise<void> {
    for (const file of files) {
      try {
        const packageJson = JSON.parse(file.content);
        
        const processDeps = async (deps: Record<string, string>) => {
          const entries = Object.entries(deps);
          const resolved = await Promise.all(entries.map(async ([name, version]) => {
            const finalVersion = version === "*" || version === "latest" || !version
              ? await this.fetchLatestVersionFromNpm(name)
              : version;
            return { name, finalVersion };
          }));

          for (const { name, finalVersion } of resolved) {
            this.addDependencyToGlobalMap({
              name,
              version: this.normalizeVersion(finalVersion),
              ecosystem: Ecosystem.NPM,
            }, file.path);
          }
        };

        if (packageJson.dependencies) await processDeps(packageJson.dependencies);
        if (packageJson.devDependencies) await processDeps(packageJson.devDependencies);
      } catch (error) {
        this.addStepError("File Parsing", error);
      }
    }
  }

  private processPythonFiles(files: Array<{ path: string; content: string }>): void {
    for (const file of files) {
      const lines = file.content.split("\n").filter((line) => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("-");
      });

      for (const line of lines) {
        const match = line.match(/^([a-zA-Z0-9_-]+)(?:[=<>!~]+(.+))?$/);
        if (match) {
          this.addDependencyToGlobalMap({
            name: match[1],
            version: this.normalizeVersion(match[2] || "unknown"),
            ecosystem: Ecosystem.PYPI,
          }, file.path);
        }
      }
    }
  }

  private async processMavenFiles(files: Array<{ path: string; content: string }>): Promise<void> {
    for (const file of files) {
      try {
        const result = await parseStringPromise(file.content);
        const propertiesArray = result?.project?.properties?.[0];
        const propertiesMap: Record<string, string> = {};

        if (propertiesArray) {
          for (const key in propertiesArray) {
            if (Object.prototype.hasOwnProperty.call(propertiesArray, key)) {
              propertiesMap[key] = propertiesArray[key]?.[0] ?? "";
            }
          }
        }

        const dependencies = result?.project?.dependencies?.[0]?.dependency ?? [];
        for (const dep of dependencies as MavenDependency[]) {
          let version = dep.version?.[0] ?? "unknown";
          if (version.startsWith("${") && version.endsWith("}")) {
            const propName = version.slice(2, -1);
            version = propertiesMap[propName] ?? "unknown";
          }
          this.addDependencyToGlobalMap({
            name: dep.artifactId?.[0] ?? "",
            version: this.normalizeVersion(version),
            ecosystem: Ecosystem.MAVEN,
          }, file.path);
        }
      } catch (error) {
        this.addStepError("File Parsing", error);
      }
    }
  }

  private processRubyFiles(files: Array<{ path: string; content: string }>): void {
    for (const file of files) {
      const lines = file.content.split("\n").filter((line) => line.trim().startsWith("gem "));
      for (const line of lines) {
        const match = line.match(/gem ['"]([^'"]+)['"](, *['"]([^'"]+)['"])?/);
        if (match) {
          this.addDependencyToGlobalMap({
            name: match[1],
            version: this.normalizeVersion(match[3] || "unknown"),
            ecosystem: Ecosystem.RUBYGEMS,
          }, file.path);
        }
      }
    }
  }

  private processComposerFiles(files: Array<{ path: string; content: string }>): void {
    for (const file of files) {
      try {
        const composer = JSON.parse(file.content);
        const allDeps = { ...composer.require, ...composer["require-dev"] };
        for (const [name, version] of Object.entries(allDeps)) {
          if (name !== "php" && !name.startsWith("ext-")) {
            this.addDependencyToGlobalMap({
              name,
              version: this.normalizeVersion(version as string),
              ecosystem: Ecosystem.COMPOSER,
            }, file.path);
          }
        }
      } catch (error) {
        this.addStepError("File Parsing", error);
      }
    }
  }

  private processPubFiles(files: Array<{ path: string; content: string }>): void {
    for (const file of files) {
      try {
        const pubspec = yaml.load(file.content) as { dependencies?: Record<string, unknown>; dev_dependencies?: Record<string, unknown> };
        const allDeps = { ...pubspec.dependencies, ...pubspec.dev_dependencies };
        for (const [name, version] of Object.entries(allDeps)) {
          const versionStr = typeof version === 'string' ? version : 'unknown';
          this.addDependencyToGlobalMap({
            name,
            version: this.normalizeVersion(versionStr),
            ecosystem: Ecosystem.PUB,
          }, file.path);
        }
      } catch (error) {
        this.addStepError("File Parsing", error);
      }
    }
  }

  // Main analysis methods
  async analyseFromRepo(owner: string, repo: string, branch?: string, includeTransitive = true): Promise<AnalysisResult> {
    this.resetState();
    
    this.progressService.progressUpdater(PROGRESS_STEPS[0], 0);
    
    const actualBranch = branch || await this.githubService.getDefaultBranch(owner, repo);
    const tree = await this.githubService.getFileTree(owner, repo, actualBranch);
    
    // Find manifest files
    const manifestFilesList = tree
      .filter((file) => file.type === "blob")
      .map((file) => {
        const fileName = file.path.split("/").pop() ?? "";
        const ecosystem = MANIFEST_NAME_TO_ECOSYSTEM.get(fileName);
        if (!ecosystem) return null;
        return { path: file.path, ecosystem };
      })
      .filter((file): file is { path: string; ecosystem: string } => file !== null);

    if (manifestFilesList.length === 0) {
      throw new Error("No manifest files found in the repository");
    }

    // Group by ecosystem
    const grouped: ManifestFiles = {};
    const filesWithContent = await this.processBatchesInParallel(
      manifestFilesList,
      this.performanceConfig.batchSize,
      this.performanceConfig.concurrency,
      async (file) => ({
        ecosystem: file.ecosystem,
        path: file.path,
        content: await this.githubService.getFileContent(owner, repo, file.path, actualBranch),
      }),
      PROGRESS_STEPS[0],
    );

    for (const file of filesWithContent) {
      if (!grouped[file.ecosystem]) grouped[file.ecosystem] = [];
      grouped[file.ecosystem].push({ path: file.path, content: file.content });
    }

    this.progressService.progressUpdater(PROGRESS_STEPS[0], 100);
    
    return this.analyseManifests(grouped, includeTransitive);
  }

  async analyseFromFiles(filePaths: string[], includeTransitive = true): Promise<AnalysisResult> {
    this.resetState();
    
    this.progressService.progressUpdater(PROGRESS_STEPS[0], 0);
    
    const grouped: ManifestFiles = {};
    const fs = await import("fs");
    const path = await import("path");
    
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const ecosystem = MANIFEST_NAME_TO_ECOSYSTEM.get(fileName);
      
      if (ecosystem) {
        if (!grouped[ecosystem]) grouped[ecosystem] = [];
        const content = fs.readFileSync(filePath, "utf-8");
        grouped[ecosystem].push({ path: filePath, content });
      }
    }

    if (Object.keys(grouped).length === 0) {
      throw new Error("No supported manifest files found");
    }

    this.progressService.progressUpdater(PROGRESS_STEPS[0], 100);
    
    return this.analyseManifests(grouped, includeTransitive);
  }

  private async analyseManifests(manifests: ManifestFiles, includeTransitive: boolean): Promise<AnalysisResult> {
    this.progressService.progressUpdater(PROGRESS_STEPS[1], 0);

    // Parse all manifest files
    await Promise.all([
      this.processNpmFiles(manifests["npm"] ?? []),
      this.processMavenFiles(manifests["Maven"] ?? []),
      Promise.resolve(this.processPythonFiles(manifests["PiPY"] ?? [])),
      Promise.resolve(this.processRubyFiles(manifests["RubyGems"] ?? [])),
      Promise.resolve(this.processComposerFiles(manifests["php"] ?? [])),
      Promise.resolve(this.processPubFiles(manifests["Pub"] ?? [])),
    ]);

    this.progressService.progressUpdater(PROGRESS_STEPS[1], 100);

    // Map to files
    let dependencies = this.mapDependenciesToFiles(this.globalDependencyMap);
    const totalScannedDependencies = this.countDependencies(dependencies);

    // Get transitive dependencies
    if (includeTransitive) {
      dependencies = await this.getTransitiveDependencies(dependencies);
    }

    // Get vulnerabilities
    dependencies = await this.getVulnerabilities(dependencies);

    this.progressService.progressUpdater(PROGRESS_STEPS[5], 100);

    // Calculate stats
    const stats = this.calculateStats(dependencies);

    return {
      dependencies,
      errors: this.consolidateErrors(),
      ...stats,
      totalDependencies: totalScannedDependencies,
    };
  }

  private async getTransitiveDependencies(dependencies: DependencyGroups): Promise<DependencyGroups> {
    const allDeps = Object.values(dependencies).flat();
    const validDeps = allDeps.filter((dep) => dep.version !== "unknown");

    this.progressService.progressUpdater(PROGRESS_STEPS[2], 0);

    const results = await this.processBatchesInParallel(
      validDeps,
      this.performanceConfig.transitiveBatchSize,
      this.performanceConfig.transitiveConcurrency,
      async (dep): Promise<TransitiveDependencyResult> => {
        try {
          const url = `${DEPS_DEV_BASE_URL}/${dep.ecosystem}/packages/${encodeURIComponent(dep.name)}/versions/${encodeURIComponent(dep.version)}:dependencies`;
          const response = await this.retryApiCall(() => axios.get<DepsDevDependency>(url), 4, 800);
          const data = response.data;

          const transitive: TransitiveDependency = { nodes: [], edges: [] };
          data.nodes?.forEach((node) => {
            transitive.nodes?.push({
              name: node.versionKey.name,
              version: node.versionKey.version,
              ecosystem: this.mapEcosystem(node.versionKey.system),
              vulnerabilities: [],
              dependencyType: node.relation,
            });
          });
          data.edges?.forEach((edge) => {
            transitive.edges?.push({
              source: edge.fromNode,
              target: edge.toNode,
              requirement: edge.requirement,
            });
          });

          return { dependency: dep, transitiveDependencies: transitive, success: true };
        } catch {
          return { dependency: dep, transitiveDependencies: { nodes: [], edges: [] }, success: false };
        }
      },
      PROGRESS_STEPS[2],
    );

    // Attach transitive deps to main deps
    for (const result of results) {
      if (result.success) {
        result.dependency.transitiveDependencies = result.transitiveDependencies;
      }
    }

    this.progressService.progressUpdater(PROGRESS_STEPS[2], 100);
    return dependencies;
  }

  private async getVulnerabilities(dependencies: DependencyGroups): Promise<DependencyGroups> {
    this.progressService.progressUpdater(PROGRESS_STEPS[3], 0);

    const allDeps: Dependency[] = [];
    const depMap = new Map<string, Dependency>();

    // Collect all deps including transitives
    Object.values(dependencies).flat().forEach((dep) => {
      const key = `${dep.ecosystem}:${dep.name}:${dep.version}`;
      dep.vulnerabilities = [];
      depMap.set(key, dep);
      allDeps.push(dep);

      dep.transitiveDependencies?.nodes?.forEach((node) => {
        const nodeKey = `${node.ecosystem}:${node.name}:${node.version}`;
        if (!depMap.has(nodeKey)) {
          node.vulnerabilities = [];
          depMap.set(nodeKey, node);
          allDeps.push(node);
        }
      });
    });

    const vulnIds = new Set<string>();
    const vulnToDeps = new Map<string, Set<Dependency>>();
    const batches: Dependency[][] = [];
    for (let i = 0; i < allDeps.length; i += this.performanceConfig.vulnBatchSize) {
      batches.push(allDeps.slice(i, i + this.performanceConfig.vulnBatchSize));
    }

    // Query OSV for vulnerabilities
    for (let i = 0; i < batches.length; i += this.performanceConfig.vulnConcurrency) {
      const concurrentBatches = batches.slice(i, i + this.performanceConfig.vulnConcurrency);
      
      await Promise.all(concurrentBatches.map(async (batch) => {
        const queries: OSVQuery[] = batch.map((dep) => ({
          package: { name: dep.name, ecosystem: dep.ecosystem },
          version: dep.version,
        }));

        try {
          const response = await this.retryApiCall(
            () => axios.post<OSVBatchResponse>(OSV_DEV_VULN_BATCH_URL, { queries }),
            3,
            1000,
          );

          response.data?.results?.forEach((result, idx) => {
            const dep = batch[idx];
            if (result.vulns) {
              result.vulns.forEach((vuln) => {
                if (!dep.vulnerabilities?.some((v) => v.id === vuln.id)) {
                  dep.vulnerabilities?.push({ id: vuln.id });
                }
                vulnIds.add(vuln.id);
                if (!vulnToDeps.has(vuln.id)) {
                  vulnToDeps.set(vuln.id, new Set<Dependency>());
                }
                vulnToDeps.get(vuln.id)?.add(dep);
              });
            }
          });
        } catch (error) {
          this.addStepError("Vulnerability Scanning", error);
        }
      }));

      const progress = Math.min(i + this.performanceConfig.vulnConcurrency, batches.length);
      this.progressService.progressUpdater(PROGRESS_STEPS[3], (progress / batches.length) * 100);
    }

    this.progressService.progressUpdater(PROGRESS_STEPS[3], 100);
    this.progressService.progressUpdater(PROGRESS_STEPS[4], 0);

    // Fetch vulnerability details
    const vulnDetails = await this.processBatchesInParallel(
      Array.from(vulnIds),
      this.performanceConfig.vulnBatchSize,
      this.performanceConfig.vulnConcurrency,
      async (vulnId): Promise<Vulnerability | null> => {
        try {
          const response = await this.retryApiCall(
            () => axios.get<Vulnerability>(`${OSV_DEV_VULN_DET_URL}${vulnId}`),
            4,
            800,
          );
          return response.data;
        } catch {
          return null;
        }
      },
      PROGRESS_STEPS[4],
    );

    // Update dependencies with full vulnerability details
    for (const vuln of vulnDetails) {
      if (!vuln) continue;
      
      const matchingDeps = vulnToDeps.get(vuln.id);
      if (!matchingDeps) continue;

      for (const dep of matchingDeps) {
        const existingIdx = dep.vulnerabilities?.findIndex((v) => v.id === vuln.id) ?? -1;
        const fixAvailable = vuln?.affected?.[0]?.ranges?.[0]?.events?.find((e) => e.fixed)?.fixed ?? "";
        
        const fullVuln: Vulnerability = {
          id: vuln.id,
          summary: vuln.summary,
          details: vuln.details,
          severityScore: this.getCVSSSeverity(vuln.severity ?? []),
          references: vuln.references ?? [],
          affected: vuln.affected ?? [],
          aliases: vuln.aliases ?? [],
          fixAvailable,
        };

        if (existingIdx !== -1 && dep.vulnerabilities) {
          dep.vulnerabilities[existingIdx] = fullVuln;
        }
      }
    }

    this.progressService.progressUpdater(PROGRESS_STEPS[4], 100);

    // Filter to only vulnerable dependencies
    return this.filterVulnerable(dependencies);
  }

  private filterVulnerable(dependencies: DependencyGroups): DependencyGroups {
    // Filter transitive nodes to only keep vulnerable ones
    Object.values(dependencies).flat().forEach((dep) => {
      if (dep.transitiveDependencies?.nodes) {
        const vulnerableNodes = dep.transitiveDependencies.nodes.filter(
          (node) => (node.vulnerabilities && node.vulnerabilities.length > 0) || node.dependencyType === "SELF"
        );
        
        const oldToNew: Record<number, number> = {};
        dep.transitiveDependencies.nodes.forEach((node, oldIdx) => {
          const newIdx = vulnerableNodes.findIndex(
            (n) => n.name === node.name && n.version === node.version && n.ecosystem === node.ecosystem
          );
          if (newIdx !== -1) oldToNew[oldIdx] = newIdx;
        });

        const edgeSet = new Set<string>();
        const vulnerableEdges = (dep.transitiveDependencies.edges ?? [])
          .map((edge) => {
            const newSource = oldToNew[edge.source];
            const newTarget = oldToNew[edge.target];
            if (newSource === undefined || newTarget === undefined) return null;
            const key = `${newSource}-${newTarget}`;
            if (edgeSet.has(key)) return null;
            edgeSet.add(key);
            return { source: newSource, target: newTarget, requirement: edge.requirement };
          })
          .filter((e): e is NonNullable<typeof e> => e !== null);

        dep.transitiveDependencies.nodes = vulnerableNodes;
        dep.transitiveDependencies.edges = vulnerableEdges;
      }
    });

    // Filter main deps
    const filtered: DependencyGroups = {};
    Object.entries(dependencies).forEach(([group, deps]) => {
      const relevantDeps = deps.filter((dep) => {
        const hasVulns = dep.vulnerabilities && dep.vulnerabilities.length > 0;
        const transitiveHasVulns = dep.transitiveDependencies?.nodes?.some(
          (node) => node.vulnerabilities && node.vulnerabilities.length > 0
        );
        return hasVulns || transitiveHasVulns;
      });
      if (relevantDeps.length > 0) {
        filtered[group] = relevantDeps;
      }
    });

    return filtered;
  }

  private calculateStats(dependencies: DependencyGroups) {
    let totalDependencies = 0;
    let totalVulnerabilities = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    const countedVulns = new Set<string>();

    const processVulns = (vulns?: Vulnerability[]) => {
      vulns?.forEach((v) => {
        if (countedVulns.has(v.id)) return;
        countedVulns.add(v.id);
        totalVulnerabilities++;
        
        const score = parseFloat(v.severityScore?.cvss_v3 || v.severityScore?.cvss_v4 || "0");
        if (score >= 9.0) criticalCount++;
        else if (score >= 7.0) highCount++;
        else if (score >= 4.0) mediumCount++;
        else lowCount++;
      });
    };

    Object.values(dependencies).flat().forEach((dep) => {
      totalDependencies++;
      processVulns(dep.vulnerabilities);
      dep.transitiveDependencies?.nodes?.forEach((node) => {
        totalDependencies++;
        processVulns(node.vulnerabilities);
      });
    });

    return { totalDependencies, totalVulnerabilities, criticalCount, highCount, mediumCount, lowCount };
  }

  private countDependencies(dependencies: DependencyGroups): number {
    let total = 0;
    Object.values(dependencies).flat().forEach((dep) => {
      total++;
      total += dep.transitiveDependencies?.nodes?.length ?? 0;
    });
    return total;
  }
}

// Convenience function for programmatic usage
export async function analyse(options: AnalyseOptions): Promise<AnalysisResult> {
  const analyser = new Analyser({
    token: options.token,
    onProgress: options.onProgress,
  });

  if (options.repo) {
    const [owner, repo] = options.repo.split("/");
    return analyser.analyseFromRepo(owner, repo, options.branch, options.includeTransitive);
  } else if (options.files && options.files.length > 0) {
    return analyser.analyseFromFiles(options.files, options.includeTransitive);
  } else {
    // Default: look for manifest files in current directory
    const fs = await import("fs");
    const path = await import("path");
    const cwd = process.cwd();
    
    const defaultFiles = Object.values(manifestFiles)
      .map((name) => path.join(cwd, name))
      .filter((p) => fs.existsSync(p));

    if (defaultFiles.length === 0) {
      throw new Error("No manifest files found in current directory");
    }

    return analyser.analyseFromFiles(defaultFiles, options.includeTransitive);
  }
}
