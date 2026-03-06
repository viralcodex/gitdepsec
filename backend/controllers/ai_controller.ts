import { RequestHandler } from "express";

import { AppDependencies } from "../app/dependencies";
import { getAiService, getSessionCredentials } from "../utils/utils";

export const createAiController = (dependencies: AppDependencies): {
    aiVulnSummary: RequestHandler;
    inlineAi: RequestHandler;
} => {
    const aiVulnSummary: RequestHandler = async (req, res) => {
        const { vulnerabilities, sessionId } = req.body;
        if (
            !vulnerabilities ||
            !vulnerabilities.vulnerabilities ||
            vulnerabilities.vulnerabilities.length === 0
        ) {
            return res.status(400).json({ error: "No vulnerabilities provided" });
        }

        console.log("Received aiVulnSummary request for:", vulnerabilities.name, "@", vulnerabilities.version);
        try {
            const { apiKey, model } = getSessionCredentials(sessionId);
            const service = getAiService(dependencies.aiService, model, apiKey);

            console.log("Calling generateVulnerabilitySummary...");
            const summary = await service.generateVulnerabilitySummary(vulnerabilities.vulnerabilities);
            console.log("Got summary response, sending to client...");
            res.json(summary);
            console.log("Response sent successfully");
            return;
        } catch (error) {
            console.error("Error generating vulnerability summary:", error);
            return res.status(500).json({
                error: "Failed to generate vulnerability summary",
                details: error instanceof Error ? error.message : String(error),
            });
        }
    };

    const inlineAi: RequestHandler = async (req, res) => {
        const { prompt, context, selectedText, sessionId } = req.body;
        if (!selectedText || !prompt || !context) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        console.log("Received inlineai request with text:", selectedText);
        try {
            const { apiKey, model } = getSessionCredentials(sessionId);
            const service = getAiService(dependencies.aiService, model, apiKey);
            const response = await service.generateInlineResponse(prompt, context, selectedText);
            return res.json({ response });
        } catch (error) {
            console.error("Error generating inline response:", error);
            return res.status(500).json({ error: "Failed to generate inline response" });
        }
    };

    return {
        aiVulnSummary,
        inlineAi,
    };
};
