import { RequestHandler } from "express";

import { AppDependencies } from "../app/dependencies";
import { isProduction } from "../config/env";
import {
    cachedAudit,
    deleteCachedAudit,
    getCachedFileDetails,
    insertFileCache,
    upsertAudit,
} from "../utils/cache";
import { sanitize, sanitizeFileName } from "../utils/utils";
import { validateFile } from "../utils/validations";

export const createAuditController = (dependencies: AppDependencies): {
    branches: RequestHandler;
    auditDependencies: RequestHandler;
    uploadFile: RequestHandler;
    auditFile: RequestHandler;
} => {
    const branches: RequestHandler = async (req, res) => {
        const { username, repo, github_pat, page, pageSize } = req.body;

        if (!username || !repo) {
            return res.status(400).json({
                error: "Username and repo are required",
                timestamp: new Date().toISOString(),
            });
        }

        const sanitizedData = sanitize({ username, repo });
        const sanitizedUsername = String(sanitizedData.username);
        const sanitizedRepo = String(sanitizedData.repo);

        console.log("Received branches request:", {
            username: sanitizedUsername,
            repo: sanitizedRepo,
            hasToken: !!github_pat,
        });

        const githubService = dependencies.getGithubService(github_pat);
        try {
            const data = await githubService.getBranches(sanitizedUsername, sanitizedRepo, page, pageSize);
            return res.json({
                branches: data.branches,
                defaultBranch: data.defaultBranch,
                hasMore: data.hasMore,
                total: data.total,
            });
        } catch (error) {
            console.error("Error fetching branches:", error);

            if (isProduction) {
                console.error("Branches API Error:", {
                    timestamp: new Date().toISOString(),
                    endpoint: "/branches",
                    username,
                    repo,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }

            return res.status(500).json({ error: "Failed to fetch branches" });
        }
    };

    const auditDependencies: RequestHandler = async (req, res) => {
        const { username, repo, branch, github_pat, forceRefresh } = req.body;

        if (!username || !repo || !branch) {
            return res.status(400).json({ error: "Username, repo, and branch are required" });
        }

        if (forceRefresh !== undefined && typeof forceRefresh !== "boolean") {
            return res.status(400).json({
                error: "Invalid forceRefresh parameter. Expected boolean.",
            });
        }

        console.log("Received auditDependencies request:", {
            username,
            repo,
            branch,
            forceRefresh: !!forceRefresh,
        });

        if (!forceRefresh) {
            const response = await cachedAudit(username, repo, branch, res);
            if (response) {
                console.log("Returning cached audit for:", {
                    username,
                    repo,
                    branch,
                });
                return;
            }
        } else {
            console.log("Force refresh requested - bypassing cache:", {
                username,
                repo,
                branch,
                timestamp: new Date().toISOString(),
            });
            await deleteCachedAudit(username, repo, branch);
        }

        const auditService = dependencies.getAuditService(github_pat);

        try {
            const auditResults = await auditService.auditDependencies(username, repo, branch);

            const branchData = await dependencies.githubService.getBranches(username, repo);
            await upsertAudit({
                username,
                repo,
                branch,
                data: auditResults,
                branches: branchData.branches,
            });
            return res.json(auditResults);
        } catch (error) {
            console.error("Error analysing dependencies:", error);
            await deleteCachedAudit(username, repo, branch);
            return res.status(500).json({ error: "Failed to audit dependencies" });
        }
    };

    const uploadFile: RequestHandler = async (req, res) => {
        const file = req.file;
        console.log("Received file upload request:", file?.originalname);

        if (!file) {
            return res.status(400).json({
                error: "No file uploaded",
                timestamp: new Date().toISOString(),
            });
        }

        const validationResponse = validateFile(file, res);
        if (validationResponse) {
            return;
        }

        console.log("File uploaded:", file.originalname);

        try {
            await insertFileCache({
                name: sanitizeFileName(file.originalname),
                content: file.buffer.toString("utf-8"),
            });

            return res.json({
                message: "File uploaded successfully",
                filename: file.originalname,
            });
        } catch (error) {
            console.error("Error uploading file:", error);

            if (isProduction) {
                console.error("File upload error:", {
                    timestamp: new Date().toISOString(),
                    endpoint: "/uploadFile",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }

            return res.status(500).json({
                error: "Failed to upload file",
                timestamp: new Date().toISOString(),
            });
        }
    };

    const auditFile: RequestHandler = async (req, res) => {
        const { file } = req.body;
        if (!file) {
            return res.status(400).json({ error: "No file provided" });
        }

        console.log("Received auditFile request for file:", file);
        const auditService = dependencies.getAuditService();
        const cachedFileDetails = await getCachedFileDetails(file);

        try {
            const auditResults = await auditService.auditFile(cachedFileDetails);
            return res.json(auditResults);
        } catch (error) {
            console.error("Error analysing file:", error);
            return res.status(500).json({ error: "Failed to audit file" });
        }
    };

    return {
        branches,
        auditDependencies,
        uploadFile,
        auditFile,
    };
};
