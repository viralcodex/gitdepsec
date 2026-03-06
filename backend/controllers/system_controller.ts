import { RequestHandler } from "express";

import { config } from "../config/env";

export const getRoot: RequestHandler = (_req, res) => {
    res.json({
        response: "GitVulSafe backend is running!",
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
    });
};

export const getHealth: RequestHandler = (_req, res) => {
    res.json({
        status: "ok",
        environment: config.nodeEnv,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
    });
};
