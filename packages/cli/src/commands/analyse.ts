import fs from "fs";
import path from "path";
import chalk from "chalk";
import { Analyser } from "../core/analyser.js";
import { CLIProgress } from "../core/progress.js";
import { loadConfig } from "../core/config.js";
import {
  formatAnalysisTable,
  formatAnalysisJson,
  formatAnalysisMarkdown,
} from "../utils/formatters.js";

interface AnalyseCommandOptions {
  file?: string[];
  repo?: string;
  branch?: string;
  token?: string;
  transitive?: boolean;
  format?: "table" | "json" | "markdown";
  output?: string;
  quiet?: boolean;
  verbose?: boolean;
}

export async function analyseCommand(options: AnalyseCommandOptions): Promise<void> {
  const config = loadConfig();
  const includeTransitive = options.transitive ?? config.include_transitive ?? true;
  const progress = new CLIProgress({
    verbose: options.verbose,
    quiet: options.quiet,
  });

  try {
    // Determine token
    const token = options.token || config.github_token;

    // Create analyser
    const analyser = new Analyser({
      token,
      onProgress: (step, pct) => progress.update(step, pct),
    });

    progress.start("Analyzing dependencies...");

    let result;

    if (options.repo) {
      // Analyze GitHub repo
      const [owner, repo] = options.repo.split("/");
      if (!owner || !repo) {
        progress.fail("Invalid repository format. Use: owner/repo");
        process.exit(2);
      }
      
      result = await analyser.analyseFromRepo(
        owner,
        repo,
        options.branch,
        includeTransitive
      );
    } else if (options.file && options.file.length > 0) {
      // Analyze specified files
      const files = options.file.map((f) => path.resolve(f));
      
      // Check files exist
      for (const file of files) {
        if (!fs.existsSync(file)) {
          progress.fail(`File not found: ${file}`);
          process.exit(2);
        }
      }

      result = await analyser.analyseFromFiles(files, includeTransitive);
    } else {
      // Default: analyze current directory
      const cwd = process.cwd();
      const manifestNames = ["package.json", "requirements.txt", "pom.xml", "Gemfile", "composer.json", "pubspec.yaml"];
      const foundFiles = manifestNames
        .map((name) => path.join(cwd, name))
        .filter((p) => fs.existsSync(p));

      if (foundFiles.length === 0) {
        progress.fail("No manifest files found in current directory");
        console.log(chalk.dim("\nSupported files: " + manifestNames.join(", ")));
        process.exit(2);
      }

      result = await analyser.analyseFromFiles(foundFiles, includeTransitive);
    }

    progress.stop();

    // Format output
    let output: string;
    const format = options.format || config.output_format || "table";

    switch (format) {
      case "json":
        output = formatAnalysisJson(result);
        break;
      case "markdown":
        output = formatAnalysisMarkdown(result);
        break;
      default:
        output = formatAnalysisTable(result);
    }

    // Write to file or stdout
    if (options.output) {
      fs.writeFileSync(options.output, output);
      progress.succeed(`Report saved to ${options.output}`);
    } else {
      console.log(output);
    }

    // Exit code based on vulnerabilities found
    if (result.totalVulnerabilities > 0) {
      process.exit(1);
    }
  } catch (error) {
    progress.fail(error instanceof Error ? error.message : "Analysis failed");
    if (options.verbose && error instanceof Error) {
      console.error(chalk.dim(error.stack));
    }
    process.exit(2);
  }
}
