import { Express } from "express";
import multer from "multer";

import { AppDependencies } from "../app/dependencies";

import { createAiRouter } from "./ai_routes";
import { createAuditRouter } from "./audit_routes";
import { createCredentialsRouter } from "./credentials_routes";
import { createFixPlanRouter } from "./fixplan_routes";
import { createProgressRouter } from "./progress_routes";
import { createSystemRouter } from "./system_routes";

export const registerRoutes = (app: Express, dependencies: AppDependencies, upload: multer.Multer) => {
    app.use(createSystemRouter());
    app.use(createCredentialsRouter());
    app.use(createAuditRouter(dependencies, upload));
    app.use(createAiRouter(dependencies));
    app.use(createFixPlanRouter(dependencies));
    app.use(createProgressRouter(dependencies));
};
