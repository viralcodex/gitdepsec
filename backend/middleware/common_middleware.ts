import cors from "cors";
import express, { Express, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { isProduction, origin } from "../config/env";

export const applyCommonMiddleware = (app: Express) => {
    if (isProduction) {
        app.use(
            helmet({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        styleSrc: ["'self'", "'unsafe-inline'"],
                        scriptSrc: ["'self'"],
                        imgSrc: ["'self'", "data:", "https:"],
                    },
                },
                hsts: {
                    maxAge: 31536000,
                    includeSubDomains: true,
                    preload: true,
                },
            }),
        );
    } else {
        app.use(
            helmet({
                contentSecurityPolicy: false,
                crossOriginEmbedderPolicy: false,
            }),
        );
    }

    app.use(
        cors({
            origin,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "X-OpenRouter-Key", "X-OpenRouter-Model"],
        }),
    );

    if (isProduction) {
        app.use(
            morgan("combined", {
                skip: (_, res: Response) => res.statusCode < 400,
            }),
        );
    } else {
        app.use(morgan("dev"));
    }

    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    if (isProduction) {
        app.set("trust proxy", 1);
    }
};
