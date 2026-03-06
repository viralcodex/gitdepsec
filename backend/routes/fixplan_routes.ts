import { Router } from "express";

import { AppDependencies } from "../app/dependencies";
import { createFixPlanController } from "../controllers/fixplan_controller";
import { rateLimits } from "../utils/rate_limits";

export const createFixPlanRouter = (dependencies: AppDependencies) => {
    const router = Router();
    const controller = createFixPlanController(dependencies);

    router.get(
        "/fixPlan",
        rateLimits.fixPlanRateLimiter,
        controller.fixPlan,
    );

    return router;
};
