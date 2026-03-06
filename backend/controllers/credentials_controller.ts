import { RequestHandler } from "express";

import { decryptCredentials, userCredentialsStore } from "../utils/utils";

export const setCredentials: RequestHandler = (req, res) => {
    try {
        const { sessionId, apiKey, model, encrypted } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: "Session ID is required" });
        }

        let decryptedKey = apiKey;
        let decryptedModel = model;

        if (encrypted && apiKey) {
            decryptedKey = decryptCredentials(apiKey);
        }
        if (encrypted && model) {
            decryptedModel = decryptCredentials(model);
        }

        userCredentialsStore.set(sessionId, {
            apiKey: decryptedKey ?? undefined,
            model: decryptedModel ?? undefined,
        });

        console.log(`Stored encrypted credentials for session: ${sessionId}`);
        return res.json({ success: true, message: "Credentials stored successfully" });
    } catch (error) {
        console.error("Error storing credentials:", error);
        return res.status(500).json({ error: "Failed to store credentials" });
    }
};

export const clearCredentials: RequestHandler = (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: "Session ID is required" });
        }

        userCredentialsStore.delete(sessionId);
        console.log(`Cleared credentials for session: ${sessionId}`);
        return res.json({ success: true, message: "Credentials cleared successfully" });
    } catch (error) {
        console.error("Error clearing credentials:", error);
        return res.status(500).json({ error: "Failed to clear credentials" });
    }
};
