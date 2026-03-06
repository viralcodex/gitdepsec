import { Router } from "express";

import { AppDependencies } from "../app/dependencies";
import { createAiController } from "../controllers/ai_controller";
import { rateLimits } from "../utils/rate_limits";

export const createAiRouter = (dependencies: AppDependencies) => {
    const router = Router();
    const controller = createAiController(dependencies);

    router.post(
        "/aiVulnSummary",
        rateLimits.aiRateLimiter,
        controller.aiVulnSummary,
    );
    router.post(
        "/inlineai",
        rateLimits.inlineAiRateLimiter,
        controller.inlineAi,
    );

    return router;
};
