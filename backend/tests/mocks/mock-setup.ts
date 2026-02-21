import axios from 'axios';
import { mock, spyOn } from 'bun:test';

import type AuditService from '../../service/audit_service';
import type GithubService from '../../service/github_service';
import type ProgressService from '../../service/progress_service';
import { mockSmartActions } from './mock-data';

export function setupOpenRouterMock(): void {
  mock.module('@openrouter/sdk', () => ({
    OpenRouter: mock(() => ({
      chat: {
        send: mock(async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockSmartActions),
              },
            },
          ],
        })),
      },
    })),
  }));
}

export function setupAxiosMocks(): void {
  spyOn(axios, 'create').mockReturnValue({
    get: mock(() => Promise.resolve({ data: {} })),
    post: mock(() => Promise.resolve({ data: { results: [] } })),
  } as any);

  spyOn(axios, 'get').mockResolvedValue({ data: {} } as any);
  spyOn(axios, 'post').mockResolvedValue({ data: { results: [] } } as any);
}

export function silenceConsoleError() {
  return spyOn(console, 'error').mockImplementation(() => { });
}

export function setupProgressServiceMock(progressService: ProgressService): void {
  spyOn(progressService, 'progressUpdater').mockImplementation(() => { });
}

export function setupGithubServiceMock(auditService: AuditService): GithubService {
  const githubService = (auditService as any).githubService as GithubService;
  spyOn(githubService, 'getGithubApiResponse').mockResolvedValue({
    data: { tree: [] },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  });
  return githubService;
}
