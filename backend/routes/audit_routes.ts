import { Router } from "express";
import multer from "multer";

import { AppDependencies } from "../app/dependencies";
import { createAuditController } from "../controllers/audit_controller";
import { rateLimits } from "../utils/rate_limits";

export const createAuditRouter = (dependencies: AppDependencies, upload: multer.Multer) => {
    const router = Router();
    const controller = createAuditController(dependencies);

    router.post("/branches", controller.branches);
    router.post(
        "/auditDependencies",
        rateLimits.auditRateLimiter,
        controller.auditDependencies,
    );
    router.post("/uploadFile", upload.single("file"), controller.uploadFile);
    router.post(
        "/auditFile",
        rateLimits.auditRateLimiter,
        controller.auditFile,
    );

    return router;
};
