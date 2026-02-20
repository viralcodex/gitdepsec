import fs from "fs";
import path from "path";
import { z } from "zod";

const configSchema = z.object({
    github_token: z.string().optional(),
    include_transitive: z.boolean().optional(),
    output_format: z.enum(["table", "json", "markdown"]).optional(),
});

export type Config = z.infer<typeof configSchema>;

const CONFIG_FILES = [".gitdepsecrc", ".gitdepsec.json", ".gitdepsecrc.json"];

function parseBooleanEnv(value: string | undefined): boolean | undefined {
    if (value === undefined) return undefined;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
}

export function loadConfig(cwd: string = process.cwd()): Config {
    // Start with environment variables
    const envConfig: Config = {
        github_token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
        include_transitive: parseBooleanEnv(process.env.GDS_INCLUDE_TRANSITIVE),
        output_format: process.env.GDS_OUTPUT_FORMAT as Config["output_format"],
    };

    // Try to find and load a config file
    for (const configFile of CONFIG_FILES) {
        const configPath = path.join(cwd, configFile);
        if (fs.existsSync(configPath)) {
            try {
                const content = fs.readFileSync(configPath, "utf-8");
                const parsed = JSON.parse(content);
                const validated = configSchema.safeParse(parsed);
                if (validated.success) {
                    // Merge file config with env config (env takes precedence)
                    return {
                        ...validated.data,
                        ...Object.fromEntries(
                            Object.entries(envConfig).filter(([, v]) => v !== undefined)
                        ),
                    };
                }
            } catch {
                // Invalid config file, continue to next
            }
        }
    }

    return envConfig;
}

export function getConfigPath(cwd: string = process.cwd()): string | null {
    for (const configFile of CONFIG_FILES) {
        const configPath = path.join(cwd, configFile);
        if (fs.existsSync(configPath)) {
            return configPath;
        }
    }
    return null;
}
