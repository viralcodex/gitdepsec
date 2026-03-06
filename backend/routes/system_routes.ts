import { Router } from "express";

import { getHealth, getRoot } from "../controllers/system_controller";

export const createSystemRouter = () => {
    const router = Router();

    router.get("/", getRoot);
    router.get("/health", getHealth);

    return router;
};
