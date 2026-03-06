import { Router } from "express";

import { AppDependencies } from "../app/dependencies";
import { createProgressController } from "../controllers/progress_controller";

export const createProgressRouter = (dependencies: AppDependencies) => {
    const router = Router();
    const controller = createProgressController(dependencies);

    router.get("/progress", controller.progress);

    return router;
};
