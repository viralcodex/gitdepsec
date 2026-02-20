import chalk from "chalk";
import type { AnalysisResult } from "../core/analyser.js";
import type { FixPlan, FixAction } from "../core/fix-planner.js";
import type { Dependency, DependencyGroups, Vulnerability } from "../core/types.js";

const SEVERITY_COLORS = {
  critical: chalk.bgRed.white.bold,
  high: chalk.red.bold,
  medium: chalk.yellow,
  low: chalk.green,
  unknown: chalk.gray,
};

function getSeverityFromScore(score?: { cvss_v3?: string; cvss_v4?: string }): string {
  const cvss = parseFloat(score?.cvss_v3 || score?.cvss_v4 || "0");
  if (cvss >= 9.0) return "critical";
  if (cvss >= 7.0) return "high";
  if (cvss >= 4.0) return "medium";
  if (cvss > 0) return "low";
  return "unknown";
}

function colorSeverity(severity: string): string {
  const fn = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || chalk.gray;
  return fn(` ${severity.toUpperCase()} `);
}

export function formatAnalysisTable(result: AnalysisResult): string {
  const lines: string[] = [];
  
  // Header
  lines.push("");
  lines.push(chalk.bold.cyan("═══════════════════════════════════════════════════════════════"));
  lines.push(chalk.bold.cyan("                    VULNERABILITY REPORT                        "));
  lines.push(chalk.bold.cyan("═══════════════════════════════════════════════════════════════"));
  lines.push("");

  // Summary
  lines.push(chalk.bold("Summary:"));
  lines.push(`  Total Dependencies: ${chalk.cyan(result.totalDependencies)}`);
  lines.push(`  Vulnerabilities:    ${chalk.red.bold(result.totalVulnerabilities)}`);
  lines.push(`    ${SEVERITY_COLORS.critical(" CRITICAL ")} ${result.criticalCount}`);
  lines.push(`    ${SEVERITY_COLORS.high(" HIGH ")} ${result.highCount}`);
  lines.push(`    ${SEVERITY_COLORS.medium(" MEDIUM ")} ${result.mediumCount}`);
  lines.push(`    ${SEVERITY_COLORS.low(" LOW ")} ${result.lowCount}`);
  lines.push("");

  if (result.totalVulnerabilities === 0) {
<<<<<<< Updated upstream
    lines.push(chalk.green.bold("✓ No vulnerabilities found!"));
=======
    lines.push("");
    lines.push(rule("double"));
    lines.push(chalk.green.bold(`${INDENT}No vulnerabilities detected`));
    lines.push(rule("double"));

    if (result.errors && result.errors.length > 0) {
      lines.push(sectionHeader("Warnings"));
      result.errors.forEach((err) => lines.push(`${INDENT}${chalk.yellow(">")} ${err}`));
    }
>>>>>>> Stashed changes
    lines.push("");
    return lines.join("\n");
  }

  // Vulnerabilities by file
  lines.push(chalk.bold("Vulnerabilities by File:"));
  lines.push(chalk.dim("─".repeat(65)));

  Object.entries(result.dependencies).forEach(([filePath, deps]) => {
    lines.push("");
    lines.push(chalk.bold.underline(filePath));
    
    deps.forEach((dep) => {
      if (dep.vulnerabilities && dep.vulnerabilities.length > 0) {
<<<<<<< Updated upstream
        lines.push("");
        lines.push(`  ${chalk.bold(dep.name)}@${chalk.dim(dep.version)} ${chalk.dim(`(${dep.ecosystem})`)}`);
        
        dep.vulnerabilities.forEach((vuln) => {
          const severity = getSeverityFromScore(vuln.severityScore);
          const score = vuln.severityScore?.cvss_v3 || vuln.severityScore?.cvss_v4 || "N/A";
          lines.push(`    ${colorSeverity(severity)} ${chalk.cyan(vuln.id)} (CVSS: ${score})`);
=======
        // Package name with version
        lines.push(`\n${INDENT}${chalk.white.bold(dep.name)} ${chalk.dim("@" + dep.version)} ${chalk.dim.italic(dep.ecosystem)}`);

        dep.vulnerabilities.forEach((vuln) => {
          const severity = getSeverityFromScore(vuln.severityScore);
          const score = vuln.severityScore?.cvss_v3 || vuln.severityScore?.cvss_v4 || "-";

          // Vulnerability line with aligned columns and clickable link
          const linkedId = chalk.cyan(vulnLink(vuln.id.padEnd(22)));
          lines.push(`${DOUBLE_INDENT}${severityBadge(severity)} ${linkedId} ${chalk.dim("CVSS")} ${chalk.white(score)}`);

>>>>>>> Stashed changes
          if (vuln.summary) {
            lines.push(`      ${chalk.dim(truncate(vuln.summary, 80))}`);
          }
          if (vuln.fixAvailable) {
            lines.push(`      ${chalk.green("Fix:")} Upgrade to ${chalk.green.bold(vuln.fixAvailable)}`);
          }
        });
      }

      // Transitive vulnerabilities
      const vulnTransitives = dep.transitiveDependencies?.nodes?.filter(
        (n) => n.vulnerabilities && n.vulnerabilities.length > 0
      ) ?? [];
      
      if (vulnTransitives.length > 0) {
        lines.push(`    ${chalk.dim("Transitive dependencies:")}`);
        vulnTransitives.forEach((node) => {
          lines.push(`      ${chalk.yellow("↳")} ${node.name}@${node.version}`);
          node.vulnerabilities?.forEach((vuln) => {
            const severity = getSeverityFromScore(vuln.severityScore);
            lines.push(`        ${colorSeverity(severity)} ${chalk.cyan(vuln.id)}`);
          });
        });
      }
    });
  });

  lines.push("");
  lines.push(chalk.dim("─".repeat(65)));
  lines.push("");
  
  if (result.errors && result.errors.length > 0) {
    lines.push(chalk.yellow.bold("Warnings:"));
    result.errors.forEach((err) => {
      lines.push(`  ${chalk.yellow("⚠")} ${err}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

export function formatAnalysisJson(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatAnalysisMarkdown(result: AnalysisResult): string {
  const lines: string[] = [];
  
  lines.push("# Vulnerability Report\n");
  
  lines.push("## Summary\n");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Dependencies | ${result.totalDependencies} |`);
  lines.push(`| Total Vulnerabilities | ${result.totalVulnerabilities} |`);
  lines.push(`| Critical | ${result.criticalCount} |`);
  lines.push(`| High | ${result.highCount} |`);
  lines.push(`| Medium | ${result.mediumCount} |`);
  lines.push(`| Low | ${result.lowCount} |`);
  lines.push("");

  if (result.totalVulnerabilities === 0) {
    lines.push("**✓ No vulnerabilities found!**\n");
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
          lines.push(`| ${vuln.id} | ${severity.toUpperCase()} | ${score} | ${truncate(summary, 50)} |`);
        });
        lines.push("");
      }
    });
  });

  return lines.join("\n");
}

export function formatFixPlanTable(plan: FixPlan): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold.cyan("═══════════════════════════════════════════════════════════════"));
  lines.push(chalk.bold.cyan("                        FIX PLAN                                "));
  lines.push(chalk.bold.cyan("═══════════════════════════════════════════════════════════════"));
  lines.push("");

  // Summary
  lines.push(chalk.bold("Summary:"));
  lines.push(`  Total Vulnerabilities: ${chalk.red.bold(plan.summary.totalVulnerabilities)}`);
  lines.push(`  Fixable:               ${chalk.green.bold(plan.summary.fixableCount)}`);
  lines.push(`  Critical:              ${SEVERITY_COLORS.critical(" " + plan.summary.criticalCount + " ")}`);
  lines.push(`  High:                  ${SEVERITY_COLORS.high(" " + plan.summary.highCount + " ")}`);
  lines.push(`  Estimated Time:        ${chalk.cyan(plan.summary.estimatedTime)}`);
  lines.push("");

  // Quick Wins
  if (plan.quickWins.length > 0) {
    lines.push(chalk.bold.green("⚡ Quick Wins:"));
    lines.push(chalk.dim("   These fixes address critical/high vulnerabilities with simple upgrades"));
    lines.push("");
    
    plan.quickWins.forEach((action, i) => {
      lines.push(`   ${chalk.bold(`${i + 1}.`)} ${chalk.bold(action.dependency)} ${chalk.dim(action.currentVersion)} → ${chalk.green.bold(action.recommendedVersion)}`);
      if (action.command) {
        lines.push(`      ${chalk.cyan("$")} ${chalk.dim(action.command)}`);
      }
    });
    lines.push("");
  }

  // Phases
  plan.phases.forEach((phase) => {
    const phaseColor = phase.name === "Immediate" ? chalk.red.bold : 
                       phase.name === "Urgent" ? chalk.yellow.bold :
                       phase.name === "Standard" ? chalk.blue.bold : chalk.gray.bold;
    
    lines.push(phaseColor(`📋 Phase: ${phase.name}`));
    lines.push(chalk.dim(`   Urgency: ${phase.urgency}`));
    lines.push("");

    phase.actions.forEach((action) => {
      const sevColor = SEVERITY_COLORS[action.severity];
      lines.push(`   ${sevColor(" " + action.severity.toUpperCase() + " ")} ${chalk.bold(action.dependency)}@${action.currentVersion}`);
      lines.push(`      ${chalk.dim(action.reasoning)}`);
      if (action.command) {
        lines.push(`      ${chalk.cyan("$")} ${action.command}`);
      }
      lines.push("");
    });
  });

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
    lines.push("## ⚡ Quick Wins\n");
    plan.quickWins.forEach((action, i) => {
      lines.push(`${i + 1}. **${action.dependency}** ${action.currentVersion} → ${action.recommendedVersion}`);
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

function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + "...";
}
