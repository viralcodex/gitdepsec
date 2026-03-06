import express from "express";
import multer from "multer";

import { applyCommonMiddleware } from "../middleware/common_middleware";
import { applyErrorHandlers } from "../middleware/error_handlers";
import { registerRoutes } from "../routes";

import { createAppDependencies } from "./dependencies";

export const createApp = () => {
    const app = express();
    const upload = multer();
    const dependencies = createAppDependencies();

    applyCommonMiddleware(app);
    registerRoutes(app, dependencies, upload);
    applyErrorHandlers(app);

    return {
        app,
        dependencies,
    };
};
