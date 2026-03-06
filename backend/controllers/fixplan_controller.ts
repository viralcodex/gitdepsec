import { RequestHandler } from "express";

import { AppDependencies } from "../app/dependencies";
import {
    createResettableTimeout,
    initializeSse,
    writeSseData,
    writeSseEvent,
} from "../http/sse";
import { getSessionCredentials } from "../utils/utils";
import { validateAndReturnAuditCache } from "../utils/validations";

export const createFixPlanController = (dependencies: AppDependencies): { fixPlan: RequestHandler } => {
    const fixPlan: RequestHandler = async (req, res) => {
        const { username, repo, branch, sessionId } = req.query;

        if (!username || !repo || !branch) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        console.log("Received fixPlan request for:", { username, repo, branch });

        initializeSse(res);
        writeSseData(res, { type: "connection", message: "Connected to fix plan generator" });

        const timeout = createResettableTimeout(600000, () => {
            writeSseData(res, { error: "Request timeout" });
            res.end();
        });

        req.on("close", () => {
            console.log("Connection closed by client");
            timeout.clear();
            res.end();
        });

        req.on("error", () => {
            console.log("Connection error");
            timeout.clear();
            res.end();
        });

        try {
            const data = await validateAndReturnAuditCache(String(username), String(repo), String(branch), res);

            if (!data || !data.dependencies || Object.keys(data.dependencies).length === 0) {
                timeout.clear();
                return;
            }

            writeSseData(res, {
                progress: "Initializing fix plan generation...",
                step: "init",
            });

            const { apiKey, model } = getSessionCredentials(sessionId ? String(sessionId) : undefined);
            const agentsService = dependencies.createAgentsService(data, model, apiKey);

            const progressCallback = (
                step: string,
                message: string,
                dependencyData?: Record<string, unknown>,
            ) => {
                timeout.reset();

                const progressData = {
                    step,
                    progress: message,
                    data: dependencyData,
                    timestamp: new Date().toISOString(),
                };

                writeSseData(res, progressData);
                res.flushHeaders();
            };

            const response = await agentsService.generateEcosystemFixPlans(progressCallback);

            writeSseData(res, {
                step: "global_planning_complete",
                progress: "Fix plan generation completed!",
                data: {
                    ecosystemFixPlans: response,
                },
            });

            writeSseEvent(res, "end", { complete: true });
            timeout.clear();
            res.end();
            return;
        } catch (error) {
            console.error("Error generating fix plan:", error);
            timeout.clear();
            writeSseData(res, {
                step: "global_planning_error",
                error: "Failed to generate fix plan",
                details: error instanceof Error ? error.message : "Unknown error",
                phase: "error",
            });
            res.end();
            return;
        }
    };

    return { fixPlan };
};
