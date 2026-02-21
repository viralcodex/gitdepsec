#!/usr/bin/env node

import { Command, Option } from "commander";
import chalk from "chalk";
import { auditCommand } from "./commands/audit.js";
import { fixCommand } from "./commands/fix.js";
import { initCommand } from "./commands/init.js";

const program = new Command();

// Custom help formatting
const formatOption = new Option("--format <format>", "Output format")
  .choices(["table", "json", "markdown"])
  .default("table");

program
  .name("gds")
  .description(
    chalk.bold("GitDepSec") +
    " - Analyze dependency vulnerabilities in your projects\n\n" +
    chalk.dim("Supported ecosystems: npm, pypi, maven, go, cargo, nuget, composer")
  )
  .version("1.0.0")
  .addHelpText("after", `
${chalk.bold("Examples:")}
  ${chalk.dim("# Scan current directory (audit, analyze, audit all work)")}
  $ gds audit

  ${chalk.dim("# Scan specific files")}
  $ gds audit -f package.json requirements.txt

  ${chalk.dim("# Scan a GitHub repository")}
  $ gds analyze -r owner/repo -b main

  ${chalk.dim("# Export results as JSON")}
  $ gds audit --format json -o report.json

  ${chalk.dim("# Generate fix plan")}
  $ gds fix -f package.json

${chalk.bold("Documentation:")}
  ${chalk.cyan("https://github.com/viralcodex/gitdepsec#readme")}
`);

// Audit command
program
  .command("audit")
  .description("Audit dependencies for vulnerabilities")
  .option("-f, --file <files...>", "Manifest file(s) to analyze (e.g., package.json, requirements.txt)")
  .option("-r, --repo <repo>", "GitHub repository in owner/repo format")
  .option("-b, --branch <branch>", "Branch to audit", "main")
  .option("-t, --token <token>", "GitHub personal access token (or set GITHUB_TOKEN env)")
  .option("--transitive", "Enable transitive dependency scanning", true)
  .option("--no-transitive", "Disable transitive dependency scanning")
  .addOption(formatOption)
  .option("-o, --output <file>", "Save output to file (e.g., report.json)")
  .option("-q, --quiet", "Minimal output - only show summary")
  .option("-v, --verbose", "Verbose output - show detailed progress")
  .addHelpText("after", `

${chalk.bold("Supported Manifest Files:")}
  ${chalk.cyan("npm")}       package.json, package-lock.json
  ${chalk.cyan("pypi")}      requirements.txt, Pipfile, pyproject.toml
  ${chalk.cyan("maven")}     pom.xml
  ${chalk.cyan("go")}        go.mod
  ${chalk.cyan("cargo")}     Cargo.toml
  ${chalk.cyan("nuget")}     packages.config, *.csproj
  ${chalk.cyan("composer")}  composer.json

${chalk.bold("Examples:")}
  $ gds audit                                ${chalk.dim("# Scan current directory")}
  $ gds audit -f package.json              ${chalk.dim("# Scan specific file")}
  $ gds analyze -r facebook/react            ${chalk.dim("# Scan GitHub repo")}
  $ gds audit --format json -o out.json      ${chalk.dim("# Export as JSON")}
  $ gds audit --format markdown            ${chalk.dim("# Output as markdown")}
  $ gds audit --no-transitive              ${chalk.dim("# Skip transitive deps")}
`)
  .action(auditCommand);

// Fix command
program
  .command("fix")
  .description("Generate fix recommendations for vulnerabilities")
  .option("-f, --file <files...>", "Manifest file(s) to fix (e.g., package.json)")
  .option("-r, --repo <repo>", "GitHub repository in owner/repo format")
  .option("-b, --branch <branch>", "Branch to audit", "main")
  .option("-t, --token <token>", "GitHub personal access token (or set GITHUB_TOKEN env)")
  .option("--transitive", "Enable transitive dependency scanning", true)
  .option("--no-transitive", "Disable transitive dependency scanning")
  .addOption(formatOption)
  .option("-o, --output <file>", "Save output to file")
  .addHelpText("after", `
${chalk.bold("Examples:")}
  $ gds fix                                  ${chalk.dim("# Generate fix plan for current dir")}
  $ gds fix -f package.json                  ${chalk.dim("# Fix specific file")}
  $ gds fix --format markdown -o fixes.md    ${chalk.dim("# Export as markdown")}
`)
  .action(fixCommand);

// Init command
program
  .command("init")
  .description("Create a .gitdepsecrc configuration file")
  .option("--force", "Overwrite existing config file")
  .addHelpText("after", `
${chalk.bold("Examples:")}
  $ gds init                ${chalk.dim("# Create config interactively")}
  $ gds init --force        ${chalk.dim("# Overwrite existing config")}

${chalk.bold("Config File Options:")}
  ${chalk.cyan("github_token")}    GitHub personal access token
  ${chalk.cyan("default_branch")}  Default branch to analyze
  ${chalk.cyan("format")}          Default output format (table|json|markdown)
  ${chalk.cyan("transitive")}      Enable transitive scanning (true|false)
`)
  .action(initCommand);

// Parse arguments
program.parse();
