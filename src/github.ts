import { Octokit } from "@octokit/rest";
import {
  FederatedErrors,
  Issue,
  IssueClient,
  SavedTrackedErrors,
} from "error-issue-tracker-sdk";

export type Repository = {
  name: string;
  owner: string;
  fullName: string
};

export default class GithubIssueClient implements IssueClient {
  private readonly octokit: Octokit;
  constructor(authToken: string) {
    this.octokit = new Octokit({
      auth: authToken,
    });
  }

  async getRepositories(): Promise<Repository[]> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser();
    return data.map((repo) => ({
      name: repo.name,
      owner: repo.owner?.login || repo.full_name.split("/")[0],
      fullName: repo.full_name
    }));
  }
  async createIssue(error: FederatedErrors): Promise<Issue> {
    const [owner, repo] = error.projectId.split("/");
    const {
      data: { number, html_url },
    } = await this.octokit.issues.create({
      owner,
      repo,
      title: error.name,
      body: `Found ${error.newOccurrences.length} occurences for the error ${error.name}`,
    });
    return { id: number.toString(), url: html_url };
  }
  async updateIssue(error: SavedTrackedErrors): Promise<Issue> {
    const [owner, repo] = error.projectId.split("/");
    await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: parseInt(error.issue.id),
      body: `Hey, I found ${
        error.newOccurrences.length
      } occurrence(s) : \n- ${error.newOccurrences
        .map((e) => e.message)
        .join("\n - ")}`,
    });
    return error.issue;
  }

  async closeIssue(error: SavedTrackedErrors): Promise<void> {
    const [owner, repo] = error.projectId.split("/");
    await this.octokit.issues.update({
      owner,
      repo,
      issue_number: parseInt(error.issue.id),
      state: "closed",
    });
  }
}
