import { Router } from "express";

import { clearCredentials, setCredentials } from "../controllers/credentials_controller";

export const createCredentialsRouter = () => {
    const router = Router();

    router.post("/setCredentials", setCredentials);
    router.post("/clearCredentials", clearCredentials);

    return router;
};
