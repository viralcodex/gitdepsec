import { Express, NextFunction, Request, Response } from "express";

import { isProduction } from "../config/env";

export const applyErrorHandlers = (app: Express) => {
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        console.error("Unhandled error:", err);

        if (isProduction) {
            res.status(500).json({
                error: "Internal server error",
                timestamp: new Date().toISOString(),
            });
            return;
        }

        res.status(500).json({
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
        });
    });

    app.use((req: Request, res: Response) => {
        res.status(404).json({
            error: "Route not found",
            path: req.originalUrl,
            method: req.method,
            timestamp: new Date().toISOString(),
        });
    });
};
