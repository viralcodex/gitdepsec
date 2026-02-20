import chalk from "chalk";
import type { AnalysisResult } from "../core/analyser.js";
import type { FixPlan } from "../core/fix-planner.js";

// Design tokens
const WIDTH = 72;

// Vulnerability URL helpers
function getVulnerabilityUrl(id: string): string {
  if (id.startsWith("GHSA-")) {
    return `https://github.com/advisories/${id}`;
  }
  if (/^(cve|CVE)-[0-9]{4}-[0-9]{4,}$/.test(id)) {
    return `https://nvd.nist.gov/vuln/detail/${id}`;
  }
  return `https://nvd.nist.gov/vuln/detail/${id}`;
}

// Terminal hyperlink (OSC 8 escape sequence)
function terminalLink(text: string, url: string): string {
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
}

// Create a clickable vulnerability ID
function vulnLink(id: string): string {
  const url = getVulnerabilityUrl(id);
  return terminalLink(id, url);
}
const INDENT = "  ";
const DOUBLE_INDENT = "    ";

// Refined severity styling - minimal, clean badges
const SEVERITY_STYLE = {
  critical: (text: string) => chalk.bgRed.white.bold(` ${text} `),
  high: (text: string) => chalk.red.bold(text),
  medium: (text: string) => chalk.yellow(text),
  low: (text: string) => chalk.dim(text),
  unknown: (text: string) => chalk.gray(text),
} as const;

// Clean horizontal rules
function rule(style: "heavy" | "light" | "double" = "light"): string {
  const chars = { heavy: "━", light: "─", double: "═" };
  return chalk.dim(chars[style].repeat(WIDTH));
}

// Box drawing for sections
function boxTop(): string {
  return chalk.dim("┌" + "─".repeat(WIDTH - 2) + "┐");
}

function boxBottom(): string {
  return chalk.dim("└" + "─".repeat(WIDTH - 2) + "┘");
}

function boxRow(content: string): string {
  const stripped = content.replace(/\x1b\[[0-9;]*m/g, "");
  const padding = Math.max(0, WIDTH - 4 - stripped.length);
  return chalk.dim("│") + " " + content + " ".repeat(padding) + " " + chalk.dim("│");
}

// Stat row with aligned values
function statRow(label: string, value: string | number, color?: (s: string) => string): string {
  const labelText = chalk.dim(label);
  const valueText = color ? color(String(value)) : String(value);
  return `${INDENT}${labelText.padEnd(28)}${valueText}`;
}

// Severity badge - clean, consistent width
function severityBadge(severity: string): string {
  const labels: Record<string, string> = {
    critical: "CRIT",
    high: "HIGH",
    medium: "MED ",
    low: "LOW ",
    unknown: " -- ",
  };
  const label = labels[severity] || labels.unknown;
  const styleFn = SEVERITY_STYLE[severity as keyof typeof SEVERITY_STYLE] || SEVERITY_STYLE.unknown;
  return styleFn(label);
}

function getSeverityFromScore(score?: { cvss_v3?: string; cvss_v4?: string }): string {
  const cvss = parseFloat(score?.cvss_v3 || score?.cvss_v4 || "0");
  if (cvss >= 9.0) return "critical";
  if (cvss >= 7.0) return "high";
  if (cvss >= 4.0) return "medium";
  if (cvss > 0) return "low";
  return "unknown";
}

function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length - 3)}...`;
}

function sectionHeader(title: string): string {
  return `\n${chalk.bold.white(title)}\n${rule("light")}`;
}

export function formatAnalysisTable(result: AnalysisResult): string {
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(boxTop());
  lines.push(boxRow(chalk.bold.white("GITDEPSEC") + chalk.dim("  Vulnerability Report")));
  lines.push(boxBottom());
  lines.push("");

  // Summary stats in a clean grid
  lines.push(statRow("Scanned", result.totalDependencies, chalk.white));
  lines.push(statRow("Vulnerabilities", result.totalVulnerabilities, result.totalVulnerabilities > 0 ? chalk.red.bold : chalk.green));
  lines.push("");
  lines.push(statRow("Critical", result.criticalCount, result.criticalCount > 0 ? chalk.bgRed.white.bold : chalk.dim));
  lines.push(statRow("High", result.highCount, result.highCount > 0 ? chalk.red.bold : chalk.dim));
  lines.push(statRow("Medium", result.mediumCount, result.mediumCount > 0 ? chalk.yellow : chalk.dim));
  lines.push(statRow("Low", result.lowCount, result.lowCount > 0 ? chalk.dim : chalk.dim));

  if (result.totalVulnerabilities === 0) {
    lines.push("");
    lines.push(rule("double"));
    lines.push(chalk.green.bold(`${INDENT}No vulnerabilities detected`));
    lines.push(rule("double"));
    
    if (result.errors && result.errors.length > 0) {
      lines.push(sectionHeader("Warnings"));
      result.errors.forEach((err) => lines.push(`${INDENT}${chalk.yellow(">")} ${err}`));
    }
    lines.push("");
    return lines.join("\n");
  }

  // Findings section
  lines.push(sectionHeader("Findings"));

  Object.entries(result.dependencies).forEach(([filePath, deps]) => {
    // File path as subtle subheader
    const shortPath = filePath.split("/").slice(-3).join("/");
    lines.push(`\n${INDENT}${chalk.dim.underline(shortPath)}`);

    deps.forEach((dep) => {
      if (dep.vulnerabilities && dep.vulnerabilities.length > 0) {
        // Package name with version
        lines.push(`\n${INDENT}${chalk.white.bold(dep.name)} ${chalk.dim("@" + dep.version)} ${chalk.dim.italic(dep.ecosystem)}`);
        
        dep.vulnerabilities.forEach((vuln) => {
          const severity = getSeverityFromScore(vuln.severityScore);
          const score = vuln.severityScore?.cvss_v3 || vuln.severityScore?.cvss_v4 || "-";
          
          // Vulnerability line with aligned columns and clickable link
          const linkedId = chalk.cyan(vulnLink(vuln.id.padEnd(22)));
          lines.push(`${DOUBLE_INDENT}${severityBadge(severity)} ${linkedId} ${chalk.dim("CVSS")} ${chalk.white(score)}`);
          
          if (vuln.summary) {
            lines.push(`${DOUBLE_INDENT}${chalk.dim(truncate(vuln.summary, 62))}`);
          }
          if (vuln.fixAvailable) {
            lines.push(`${DOUBLE_INDENT}${chalk.dim("Fix:")} ${chalk.green(vuln.fixAvailable)}`);
          }
        });
      }

      // Transitive vulnerabilities
      const vulnerableTransitives =
        dep.transitiveDependencies?.nodes?.filter(
          (n) => n.vulnerabilities && n.vulnerabilities.length > 0,
        ) ?? [];

      if (vulnerableTransitives.length > 0) {
        lines.push(`${DOUBLE_INDENT}${chalk.dim.italic("via transitive:")}`);
        vulnerableTransitives.forEach((node) => {
          lines.push(`${DOUBLE_INDENT}  ${chalk.dim(node.name + "@" + node.version)}`);
          node.vulnerabilities?.forEach((vuln) => {
            const severity = getSeverityFromScore(vuln.severityScore);
            lines.push(`${DOUBLE_INDENT}    ${severityBadge(severity)} ${chalk.dim(vulnLink(vuln.id))}`);
          });
        });
      }
    });
  });

  // Errors/warnings
  if (result.errors && result.errors.length > 0) {
    lines.push(sectionHeader("Warnings"));
    result.errors.forEach((err) => lines.push(`${INDENT}${chalk.yellow(">")} ${err}`));
  }

  lines.push("");
  lines.push(rule("light"));
  lines.push("");
  return lines.join("\n");
}

export function formatAnalysisJson(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatAnalysisMarkdown(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push("# Vulnerability Report\n");
  lines.push("## Summary\n");
  lines.push("| Metric | Count |");
  lines.push("|--------|-------|");
  lines.push(`| Total Dependencies | ${result.totalDependencies} |`);
  lines.push(`| Total Vulnerabilities | ${result.totalVulnerabilities} |`);
  lines.push(`| Critical | ${result.criticalCount} |`);
  lines.push(`| High | ${result.highCount} |`);
  lines.push(`| Medium | ${result.mediumCount} |`);
  lines.push(`| Low | ${result.lowCount} |`);
  lines.push("");

  if (result.totalVulnerabilities === 0) {
    lines.push("No vulnerabilities found.\n");
    return lines.join("\n");
  }

  lines.push("## Vulnerabilities\n");

  Object.entries(result.dependencies).forEach(([filePath, deps]) => {
    lines.push(`### ${filePath}\n`);

    deps.forEach((dep) => {
      if (dep.vulnerabilities && dep.vulnerabilities.length > 0) {
        lines.push(`#### ${dep.name}@${dep.version} (${dep.ecosystem})\n`);
        lines.push("| ID | Severity | CVSS | Summary |");
        lines.push("|---|---|---|---|");

        dep.vulnerabilities.forEach((vuln) => {
          const severity = getSeverityFromScore(vuln.severityScore);
          const score = vuln.severityScore?.cvss_v3 || vuln.severityScore?.cvss_v4 || "N/A";
          const summary = vuln.summary?.replace(/\|/g, "\\|") || "No summary";
          const vulnUrl = getVulnerabilityUrl(vuln.id);
          lines.push(`| [${vuln.id}](${vulnUrl}) | ${severity.toUpperCase()} | ${score} | ${truncate(summary, 70)} |`);
        });
        lines.push("");
      }
    });
  });

  return lines.join("\n");
}

export function formatFixPlanTable(plan: FixPlan): string {
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(boxTop());
  lines.push(boxRow(chalk.bold.white("GITDEPSEC") + chalk.dim("  Fix Plan")));
  lines.push(boxBottom());
  lines.push("");

  // Summary stats
  lines.push(statRow("Vulnerabilities", plan.summary.totalVulnerabilities, chalk.red.bold));
  lines.push(statRow("Fixable", plan.summary.fixableCount, chalk.green.bold));
  lines.push(statRow("Critical", plan.summary.criticalCount, plan.summary.criticalCount > 0 ? chalk.bgRed.white.bold : chalk.dim));
  lines.push(statRow("High", plan.summary.highCount, plan.summary.highCount > 0 ? chalk.red.bold : chalk.dim));
  lines.push(statRow("Estimated time", plan.summary.estimatedTime, chalk.cyan));

  // Quick wins section
  if (plan.quickWins.length > 0) {
    lines.push(sectionHeader("Quick Wins"));
    plan.quickWins.forEach((action, i) => {
      lines.push(`${INDENT}${chalk.dim(`${i + 1}.`)} ${chalk.white.bold(action.dependency)}`);
      lines.push(`${DOUBLE_INDENT}${chalk.dim(action.currentVersion)} ${chalk.dim("->")} ${chalk.green.bold(action.recommendedVersion)}`);
      if (action.command) {
        lines.push(`${DOUBLE_INDENT}${chalk.dim("$")} ${chalk.cyan(action.command)}`);
      }
    });
  }

  // Phases
  plan.phases.forEach((phase) => {
    lines.push(sectionHeader(phase.name));
    lines.push(`${INDENT}${chalk.dim.italic("Window: " + phase.urgency)}`);
    lines.push("");

    phase.actions.forEach((action) => {
      lines.push(`${INDENT}${severityBadge(action.severity)} ${chalk.white.bold(action.dependency)}${chalk.dim("@" + action.currentVersion)}`);
      lines.push(`${DOUBLE_INDENT}${chalk.dim(action.reasoning)}`);
      if (action.command) {
        lines.push(`${DOUBLE_INDENT}${chalk.dim("$")} ${chalk.cyan(action.command)}`);
      }
      lines.push("");
    });
  });

  lines.push(rule("light"));
  lines.push("");
  return lines.join("\n");
}

export function formatFixPlanJson(plan: FixPlan): string {
  return JSON.stringify(plan, null, 2);
}

export function formatFixPlanMarkdown(plan: FixPlan): string {
  const lines: string[] = [];

  lines.push("# Fix Plan\n");
  lines.push("## Summary\n");
  lines.push(`- **Total Vulnerabilities:** ${plan.summary.totalVulnerabilities}`);
  lines.push(`- **Fixable:** ${plan.summary.fixableCount}`);
  lines.push(`- **Critical:** ${plan.summary.criticalCount}`);
  lines.push(`- **High:** ${plan.summary.highCount}`);
  lines.push(`- **Estimated Time:** ${plan.summary.estimatedTime}`);
  lines.push("");

  if (plan.quickWins.length > 0) {
    lines.push("## Quick Wins\n");
    plan.quickWins.forEach((action, i) => {
      lines.push(`${i + 1}. **${action.dependency}** ${action.currentVersion} -> ${action.recommendedVersion}`);
      if (action.command) {
        lines.push(`   \`\`\`bash\n   ${action.command}\n   \`\`\``);
      }
    });
    lines.push("");
  }

  plan.phases.forEach((phase) => {
    lines.push(`## ${phase.name} (${phase.urgency})\n`);
    phase.actions.forEach((action) => {
      lines.push(`### ${action.dependency}@${action.currentVersion}\n`);
      lines.push(`- **Severity:** ${action.severity.toUpperCase()}`);
      lines.push(`- **Action:** ${action.reasoning}`);
      if (action.command) {
        lines.push(`- **Command:**`);
        lines.push(`  \`\`\`bash\n  ${action.command}\n  \`\`\``);
      }
      lines.push("");
    });
  });

  return lines.join("\n");
}
