import { RequestHandler } from "express";

import { AppDependencies } from "../app/dependencies";
import { createResettableTimeout, initializeSse, writeSseData } from "../http/sse";

export const createProgressController = (dependencies: AppDependencies): { progress: RequestHandler } => {
    const progress: RequestHandler = (req, res) => {
        initializeSse(res);

        console.log("New progress connection established");

        writeSseData(res, {
            type: "connection",
            message: "Connected to progress updates",
            timestamp: new Date().toISOString(),
        });

        const progressCallback = (step: string, progressValue: number) => {
            if (!res.destroyed && !res.writableEnded) {
                try {
                    writeSseData(res, {
                        step,
                        progress: progressValue,
                        timestamp: new Date().toISOString(),
                    });
                } catch (error) {
                    console.error("Error writing progress update:", error);
                }
            }
        };

        dependencies.progressService.addCallback(progressCallback);
        console.log(
            `Progress callback added. Total callbacks: ${dependencies.progressService.getCallBackCount()}`,
        );

        const timeout = createResettableTimeout(300000, () => {
            if (!res.destroyed && !res.writableEnded) {
                console.log("Progress connection timeout");
                writeSseData(res, {
                    type: "timeout",
                    message: "Connection timeout",
                    timestamp: new Date().toISOString(),
                });
                res.end();
            }
        });

        const heartbeat = setInterval(() => {
            if (!res.destroyed && !res.writableEnded) {
                try {
                    writeSseData(res, {
                        type: "heartbeat",
                        timestamp: new Date().toISOString(),
                    });
                } catch {
                    console.log("Heartbeat failed, connection likely broken");
                    clearInterval(heartbeat);
                }
            } else {
                clearInterval(heartbeat);
            }
        }, 30000);

        req.on("close", () => {
            console.log("Progress connection closed by client");
            dependencies.progressService.removeCallback(progressCallback);
            console.log(
                `Progress callback removed. Remaining callbacks: ${dependencies.progressService.getCallBackCount()}`,
            );
            timeout.clear();
            clearInterval(heartbeat);

            if (dependencies.progressService.getCallBackCount() === 0) {
                console.log("No more active connections, resetting progress service");
                dependencies.progressService.reset();
            }

            if (!res.destroyed) {
                res.end();
            }
        });

        req.on("error", (error: Error & { code?: string }) => {
            if (error.code === "ECONNRESET") {
                console.log("Progress connection reset by client (normal browser close/navigation)");
            } else if (error.code === "EPIPE") {
                console.log("Progress connection broken pipe (client disconnected)");
            } else {
                console.log("Progress connection error:", error.message ?? error);
            }

            dependencies.progressService.removeCallback(progressCallback);
            timeout.clear();
            clearInterval(heartbeat);

            if (dependencies.progressService.getCallBackCount() === 0) {
                dependencies.progressService.reset();
            }

            if (!res.destroyed) {
                res.end();
            }
        });
    };

    return { progress };
};
