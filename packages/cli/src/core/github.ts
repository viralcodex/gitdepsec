import axios, { type AxiosInstance } from "axios";
import { GITHUB_API_BASE_URL } from "./constants.js";

export class GitHubService {
  private client: AxiosInstance;

  constructor(token?: string) {
    this.client = axios.create({
      baseURL: GITHUB_API_BASE_URL,
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          }
        : {
            Accept: "application/vnd.github.v3+json",
          },
    });
  }

  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const response = await this.client.get(`/repos/${owner}/${repo}`);
    return response.data.default_branch;
  }

  async getFileTree(
    owner: string,
    repo: string,
    branch: string
  ): Promise<Array<{ path: string; type: string; sha: string }>> {
    const response = await this.client.get(
      `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    );
    return response.data.tree;
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    branch: string
  ): Promise<string> {
    const response = await this.client.get(
      `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
    );
    const content = response.data.content;
    if (!content) {
      throw new Error(`File ${path} has no content`);
    }
    return Buffer.from(content, "base64").toString("utf8");
  }

  async get(url: string) {
    return this.client.get(url);
  }
}
