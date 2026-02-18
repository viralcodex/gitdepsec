import fs from "fs";
import path from "path";
import chalk from "chalk";
import { getConfigPath } from "../core/config.js";

interface InitCommandOptions {
  force?: boolean;
}

const DEFAULT_CONFIG = {
  github_token: "",
  include_transitive: true,
  output_format: "table",
};

export async function initCommand(options: InitCommandOptions): Promise<void> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, ".gitdepsecrc");
  
  // Check if config already exists
  const existingConfig = getConfigPath(cwd);
  if (existingConfig && !options.force) {
    console.log(chalk.yellow(`Config already exists: ${existingConfig}`));
    console.log(chalk.dim("Use --force to overwrite"));
    return;
  }

  // Write config file
  const configContent = JSON.stringify(DEFAULT_CONFIG, null, 2);
  fs.writeFileSync(configPath, configContent);

  console.log(chalk.green("✓") + ` Created ${chalk.bold(".gitdepsecrc")}`);
  console.log("");
  console.log(chalk.dim("Configuration options:"));
  console.log(chalk.dim("─".repeat(40)));
  console.log(`  ${chalk.cyan("github_token")}:        GitHub PAT for private repos`);
  console.log(`  ${chalk.cyan("include_transitive")}: Scan transitive deps`);
  console.log(`  ${chalk.cyan("output_format")}:      table | json | markdown`);
  console.log("");
  console.log(chalk.dim("Environment variables (take precedence):"));
  console.log(`  ${chalk.cyan("GITHUB_TOKEN")}`);
  console.log(`  ${chalk.cyan("GDS_INCLUDE_TRANSITIVE")}`);
  console.log(`  ${chalk.cyan("GDS_OUTPUT_FORMAT")}`);
}
