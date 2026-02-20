import fs from "fs";
import path from "path";
import chalk from "chalk";
import { generateFixPlan } from "../core/fix-planner.js";
import { CLIProgress } from "../core/progress.js";
import { loadConfig } from "../core/config.js";
import {
    formatFixPlanTable,
    formatFixPlanJson,
    formatFixPlanMarkdown,
} from "../utils/formatters.js";

interface FixCommandOptions {
    file?: string[];
    repo?: string;
    branch?: string;
    token?: string;
    transitive?: boolean;
    format?: "table" | "json" | "markdown";
    output?: string;
}

export async function fixCommand(options: FixCommandOptions): Promise<void> {
    const config = loadConfig();
    const includeTransitive = options.transitive ?? config.include_transitive ?? true;
    const progress = new CLIProgress();

    try {
        const token = options.token || config.github_token;

        progress.start("Generating fix plan...");

        // Determine files to analyze
        let files: string[] | undefined;

        if (options.file && options.file.length > 0) {
            files = options.file.map((f) => path.resolve(f));
            for (const file of files) {
                if (!fs.existsSync(file)) {
                    progress.fail(`File not found: ${file}`);
                    process.exit(2);
                }
            }
        } else if (!options.repo) {
            // Default: find files in current directory
            const cwd = process.cwd();
            const manifestNames = ["package.json", "requirements.txt", "pom.xml", "Gemfile"];
            files = manifestNames
                .map((name) => path.join(cwd, name))
                .filter((p) => fs.existsSync(p));

            if (files.length === 0) {
                progress.fail("No manifest files found");
                process.exit(2);
            }
        }

        const plan = await generateFixPlan({
            files,
            repo: options.repo,
            branch: options.branch,
            token,
            includeTransitive,
            onProgress: (step, pct) => progress.update(step, pct),
        });

        progress.stop();

        // Format output
        let output: string;
        const format = options.format || config.output_format || "table";

        switch (format) {
            case "json":
                output = formatFixPlanJson(plan);
                break;
            case "markdown":
                output = formatFixPlanMarkdown(plan);
                break;
            default:
                output = formatFixPlanTable(plan);
        }

        // Write to file or stdout
        if (options.output) {
            fs.writeFileSync(options.output, output);
            progress.succeed(`Fix plan saved to ${options.output}`);
        } else {
            console.log(output);
        }

        // Exit with 0 for fix command (it's informational)
        process.exit(0);
    } catch (error) {
        progress.fail(error instanceof Error ? error.message : "Fix plan generation failed");
        process.exit(2);
    }
}
