export interface Dependency {
  name: string;
  version: string;
  vulnerabilities?: Vulnerability[];
  dependencyType?: "DIRECT" | "INDIRECT" | "SELF";
  transitiveDependencies?: TransitiveDependency;
  ecosystem: Ecosystem;
}

export interface TransitiveDependency {
  nodes?: Dependency[];
  edges?: {
    source: number;
    target: number;
    requirement: string;
  }[];
}

export interface Vulnerability {
  id: string;
  summary?: string;
  details?: string;
  severity?: { type: string; score: string }[];
  severityScore?: { cvss_v3?: string; cvss_v4?: string };
  references?: Reference[];
  exploitAvailable?: boolean;
  fixAvailable?: string;
  affected?: OSVAffected[];
  aliases?: string[];
}

export interface Reference {
  type: string;
  url: string;
}

export interface OSVAffected {
  package: {
    ecosystem: string;
    name: string;
    version?: string;
  };
  ranges?: {
    type: string;
    events: { introduced?: string; fixed?: string }[];
  }[];
  versions?: string[];
}

export enum Ecosystem {
  NPM = "npm",
  PYPI = "PyPI",
  MAVEN = "Maven",
  GRADLE = "Gradle",
  GO = "Go",
  CARGO = "Cargo",
  RUBYGEMS = "Rubygems",
  COMPOSER = "Composer",
  PUB = "Pub",
  NULL = "null",
}

export type DependencyGroups = Record<string, Dependency[]>;

export interface OSVQuery {
  package: { name: string; ecosystem: Ecosystem };
  version: string;
}

export interface OSVResult {
  vulns?: Vulnerability[];
  next_page_token?: string;
}

export interface OSVBatchResponse {
  results: OSVResult[];
}

export interface ManifestFile {
  path: string;
  content: string;
  ecosystem: Ecosystem;
}

export type ManifestFiles = {
  [ecosystem: string]: { path: string; content: string }[];
};

export interface MavenDependency {
  groupId?: string[];
  artifactId?: string[];
  version?: string[];
  [key: string]: unknown;
}

export interface DepsDevDependency {
  nodes: DepsDevNode[];
  edges: DepsDevEdge[];
  error: string;
}

export interface DepsDevNode {
  versionKey: {
    system: string;
    name: string;
    version: string;
  };
  bundled: false;
  relation: "DIRECT" | "INDIRECT" | "SELF";
  errors: [];
}

export interface DepsDevEdge {
  fromNode: number;
  toNode: number;
  requirement: string;
}

export interface TransitiveDependencyResult {
  dependency: Dependency;
  transitiveDependencies: TransitiveDependency;
  success: boolean;
}
