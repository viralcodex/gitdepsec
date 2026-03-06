import AgentsService from "../service/agents_service";
import AiService from "../service/ai_service";
import AuditService from "../service/audit_service";
import { DependencyApiResponse } from "../constants/model";
import GithubService from "../service/github_service";
import ProgressService from "../service/progress_service";

export type AppDependencies = {
    progressService: ProgressService;
    githubService: GithubService;
    auditService: AuditService;
    aiService: AiService;
    getGithubService: (token?: string) => GithubService;
    getAuditService: (token?: string) => AuditService;
    createAgentsService: (data: DependencyApiResponse, model?: string, apiKey?: string) => AgentsService;
};

export const createAppDependencies = (): AppDependencies => {
    const progressService = new ProgressService();
    const githubService = new GithubService();
    const auditService = new AuditService("", progressService);
    const aiService = new AiService();

    return {
        progressService,
        githubService,
        auditService,
        aiService,
        getGithubService: (token?: string) => {
            return token ? new GithubService(token) : githubService;
        },
        getAuditService: (token?: string) => {
            return token ? new AuditService(token, progressService) : auditService;
        },
        createAgentsService: (data: DependencyApiResponse, model?: string, apiKey?: string) => {
            return new AgentsService(data, model, apiKey);
        },
    };
};
