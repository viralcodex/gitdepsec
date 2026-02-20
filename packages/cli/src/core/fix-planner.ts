import { analyse, type AnalyseOptions, type AnalysisResult } from "./analyser.js";
import type { Dependency, DependencyGroups, Vulnerability } from "./types.js";

export interface FixPlanOptions extends AnalyseOptions {
}

export interface FixAction {
    dependency: string;
    ecosystem: string;
    currentVersion: string;
    recommendedVersion?: string;
    action: "upgrade" | "patch" | "replace" | "remove" | "investigate";
    command?: string;
    vulnerabilities: string[];
    severity: "critical" | "high" | "medium" | "low";
    reasoning: string;
}

export interface FixPlan {
    summary: {
        totalVulnerabilities: number;
        fixableCount: number;
        criticalCount: number;
        highCount: number;
        estimatedTime: string;
    };
    quickWins: FixAction[];
    actions: FixAction[];
    phases: {
        name: string;
        urgency: string;
        actions: FixAction[];
    }[];
}

function getSeverity(vuln: Vulnerability): "critical" | "high" | "medium" | "low" {
    const score = parseFloat(vuln.severityScore?.cvss_v3 || vuln.severityScore?.cvss_v4 || "0");
    if (score >= 9.0) return "critical";
    if (score >= 7.0) return "high";
    if (score >= 4.0) return "medium";
    return "low";
}

function getUpdateCommand(dep: Dependency, targetVersion: string): string {
    switch (dep.ecosystem) {
        case "npm":
            return `npm install ${dep.name}@${targetVersion}`;
        case "PyPI":
            return `pip install ${dep.name}==${targetVersion}`;
        case "Maven":
            return `Update ${dep.name} to ${targetVersion} in pom.xml`;
        case "Cargo":
            return `cargo update -p ${dep.name}`;
        case "Go":
            return `go get ${dep.name}@${targetVersion}`;
        case "Rubygems":
            return `gem update ${dep.name} -v ${targetVersion}`;
        default:
            return `Update ${dep.name} to ${targetVersion}`;
    }
}

function generateActions(dependencies: DependencyGroups): FixAction[] {
    const actions: FixAction[] = [];
    const processed = new Set<string>();

    Object.values(dependencies).flat().forEach((dep) => {
        const key = `${dep.name}@${dep.version}`;
        if (processed.has(key)) return;
        processed.add(key);

        if (dep.vulnerabilities && dep.vulnerabilities.length > 0) {
            const highestSeverity = dep.vulnerabilities.reduce((highest, v) => {
                const sev = getSeverity(v);
                const order = { critical: 4, high: 3, medium: 2, low: 1 };
                return order[sev] > order[highest] ? sev : highest;
            }, "low" as "critical" | "high" | "medium" | "low");

            // Check if there's a fix available
            const fixVersions = dep.vulnerabilities
                .map((v) => v.fixAvailable)
                .filter((v): v is string => !!v);

            const recommendedVersion = fixVersions.length > 0 ? fixVersions[0] : undefined;

            actions.push({
                dependency: dep.name,
                ecosystem: dep.ecosystem,
                currentVersion: dep.version,
                recommendedVersion,
                action: recommendedVersion ? "upgrade" : "investigate",
                command: recommendedVersion ? getUpdateCommand(dep, recommendedVersion) : undefined,
                vulnerabilities: dep.vulnerabilities.map((v) => v.id),
                severity: highestSeverity,
                reasoning: recommendedVersion
                    ? `Upgrade to ${recommendedVersion} to fix ${dep.vulnerabilities.length} vulnerabilities`
                    : `Investigate ${dep.vulnerabilities.length} vulnerabilities - no automatic fix available`,
            });
        }

        // Also check transitive dependencies
        dep.transitiveDependencies?.nodes?.forEach((node) => {
            const nodeKey = `${node.name}@${node.version}`;
            if (processed.has(nodeKey)) return;
            processed.add(nodeKey);

            if (node.vulnerabilities && node.vulnerabilities.length > 0) {
                const highestSeverity = node.vulnerabilities.reduce((highest, v) => {
                    const sev = getSeverity(v);
                    const order = { critical: 4, high: 3, medium: 2, low: 1 };
                    return order[sev] > order[highest] ? sev : highest;
                }, "low" as "critical" | "high" | "medium" | "low");

                const fixVersions = node.vulnerabilities
                    .map((v) => v.fixAvailable)
                    .filter((v): v is string => !!v);

                const recommendedVersion = fixVersions.length > 0 ? fixVersions[0] : undefined;

                actions.push({
                    dependency: node.name,
                    ecosystem: node.ecosystem,
                    currentVersion: node.version,
                    recommendedVersion,
                    action: recommendedVersion ? "upgrade" : "investigate",
                    command: recommendedVersion ? getUpdateCommand(node, recommendedVersion) : undefined,
                    vulnerabilities: node.vulnerabilities.map((v) => v.id),
                    severity: highestSeverity,
                    reasoning: recommendedVersion
                        ? `Transitive: Upgrade parent dependency to get ${node.name}@${recommendedVersion}`
                        : `Transitive: Investigate - ${node.name} is a transitive dependency`,
                });
            }
        });
    });

    // Sort by severity (critical first)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return actions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export function buildFixPlan(analysisResult: AnalysisResult): FixPlan {
    // Generate fix actions
    const actions = generateActions(analysisResult.dependencies);

    // Calculate summary
    const fixableCount = actions.filter((a) => a.action === "upgrade").length;
    const criticalCount = actions.filter((a) => a.severity === "critical").length;
    const highCount = actions.filter((a) => a.severity === "high").length;

    // Estimate time (rough estimate)
    const estimatedMinutes = fixableCount * 5 + (actions.length - fixableCount) * 15;
    const estimatedTime = estimatedMinutes < 60
        ? `${estimatedMinutes} minutes`
        : `${Math.round(estimatedMinutes / 60)} hours`;

    // Quick wins: fixable critical/high severity
    const quickWins = actions.filter(
        (a) => a.action === "upgrade" && (a.severity === "critical" || a.severity === "high")
    ).slice(0, 5);

    // Organize into phases
    const phases = [
        {
            name: "Immediate",
            urgency: "Within 24 hours",
            actions: actions.filter((a) => a.severity === "critical"),
        },
        {
            name: "Urgent",
            urgency: "Within 1 week",
            actions: actions.filter((a) => a.severity === "high"),
        },
        {
            name: "Standard",
            urgency: "Within 1 month",
            actions: actions.filter((a) => a.severity === "medium"),
        },
        {
            name: "Low Priority",
            urgency: "When convenient",
            actions: actions.filter((a) => a.severity === "low"),
        },
    ].filter((p) => p.actions.length > 0);

    return {
        summary: {
            totalVulnerabilities: analysisResult.totalVulnerabilities,
            fixableCount,
            criticalCount,
            highCount,
            estimatedTime,
        },
        quickWins,
        actions,
        phases,
    };
}

export async function generateFixPlan(options: FixPlanOptions): Promise<FixPlan> {
    // First, run analysis
    const analysisResult = await analyse(options);
    return buildFixPlan(analysisResult);
}
