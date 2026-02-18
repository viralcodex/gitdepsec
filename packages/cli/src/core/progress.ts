import ora, { type Ora } from "ora";
import chalk from "chalk";

export type ProgressCallback = (step: string, progress: number) => void;

export class CLIProgress {
  private spinner: Ora | null = null;
  private verbose: boolean;
  private quiet: boolean;
  private currentStep: string = "";

  constructor(options: { verbose?: boolean; quiet?: boolean } = {}) {
    this.verbose = options.verbose ?? false;
    this.quiet = options.quiet ?? false;
  }

  start(text: string): void {
    if (this.quiet) return;
    this.spinner = ora({ text, color: "cyan" }).start();
  }

  update(step: string, progress: number): void {
    if (this.quiet) return;
    
    const stepName = this.formatStepName(step);
    const progressText = `${stepName} ${chalk.dim(`(${Math.round(progress)}%)`)}`;
    
    if (this.spinner) {
      this.spinner.text = progressText;
    }
    
    if (this.verbose && step !== this.currentStep) {
      this.currentStep = step;
      console.log(chalk.dim(`  → ${stepName}`));
    }
  }

  succeed(text: string): void {
    if (this.quiet) return;
    if (this.spinner) {
      this.spinner.succeed(text);
      this.spinner = null;
    } else {
      console.log(chalk.green("✓"), text);
    }
  }

  fail(text: string): void {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = null;
    } else {
      console.error(chalk.red("✗"), text);
    }
  }

  warn(text: string): void {
    if (this.quiet) return;
    if (this.spinner) {
      this.spinner.warn(text);
      this.spinner = null;
    } else {
      console.warn(chalk.yellow("⚠"), text);
    }
  }

  info(text: string): void {
    if (this.quiet) return;
    console.log(chalk.blue("ℹ"), text);
  }

  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  private formatStepName(step: string): string {
    const stepMap: Record<string, string> = {
      PARSING_MANIFESTS: "Parsing manifest files",
      PARSING_DEPENDENCIES: "Extracting dependencies",
      FETCHING_TRANSITIVE_DEPENDENCIES: "Fetching transitive dependencies",
      FETCHING_VULNERABILTIES_ID: "Scanning for vulnerabilities",
      FETCHING_VULNERABILTIES_DETAILS: "Fetching vulnerability details",
      FINALISING_RESULTS: "Finalizing results",
    };
    return stepMap[step] || step;
  }
}

// Simple progress service for the analyser (compatible with backend interface)
export class ProgressService {
  private callback: ProgressCallback | null = null;

  onProgress(callback: ProgressCallback): void {
    this.callback = callback;
  }

  progressUpdater(step: string, progress: number): void {
    if (this.callback) {
      this.callback(step, progress);
    }
  }

  reset(): void {
    this.callback = null;
  }
}
