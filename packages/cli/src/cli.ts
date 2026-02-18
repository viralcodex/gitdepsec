#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { analyseCommand } from "./commands/analyse.js";
import { fixCommand } from "./commands/fix.js";
import { initCommand } from "./commands/init.js";

const program = new Command();

program
  .name("gds")
  .description(
    chalk.bold("GitDepSec") +
      " - Analyze dependency vulnerabilities in your projects"
  )
  .version("1.0.0");

// Analyse command
program
  .command("analyse")
  .alias("analyze")
  .description("Analyze dependencies for vulnerabilities")
  .option("-f, --file <files...>", "Manifest file(s) to analyze")
  .option("-r, --repo <repo>", "GitHub repository (owner/repo)")
  .option("-b, --branch <branch>", "Branch to analyze (default: main)")
  .option("-t, --token <token>", "GitHub personal access token")
  .option("--no-transitive", "Disable transitive dependency scanning")
  .option("--format <format>", "Output format: table, json, markdown", "table")
  .option("-o, --output <file>", "Save output to file")
  .option("-q, --quiet", "Minimal output")
  .option("-v, --verbose", "Verbose output")
  .action(analyseCommand);

// Fix command
program
  .command("fix")
  .description("Generate fix recommendations for vulnerabilities")
  .option("-f, --file <files...>", "Manifest file(s) to fix")
  .option("-r, --repo <repo>", "GitHub repository (owner/repo)")
  .option("-b, --branch <branch>", "Branch to analyze (default: main)")
  .option("-t, --token <token>", "GitHub personal access token")
  .option("--no-transitive", "Disable transitive dependency scanning")
  .option("--format <format>", "Output format: table, json, markdown", "table")
  .option("-o, --output <file>", "Save output to file")
  .action(fixCommand);

// Init command
program
  .command("init")
  .description("Create a .gitdepsecrc configuration file")
  .option("--force", "Overwrite existing config")
  .action(initCommand);

// Parse arguments
program.parse();
