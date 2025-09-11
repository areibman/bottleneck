import { Octokit } from '@octokit/rest';
import { AuthManager } from './auth';

export class GitHubAPIManager {
  private octokit: Octokit | null = null;
  private authManager: AuthManager;
  private rateLimitRemaining: number = 5000;
  private rateLimitReset: Date = new Date();

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
  }

  private async getOctokit(): Promise<Octokit> {
    if (!this.octokit) {
      const token = await this.authManager.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      this.octokit = new Octokit({ auth: token });
    }
    return this.octokit;
  }

  private async handleRateLimit(response: any): Promise<void> {
    if (response.headers) {
      this.rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining'] || '5000');
      this.rateLimitReset = new Date(parseInt(response.headers['x-ratelimit-reset'] || '0') * 1000);
      
      if (this.rateLimitRemaining < 100) {
        console.warn(`Low rate limit: ${this.rateLimitRemaining} remaining`);
      }
    }
  }

  async getCurrentUser(): Promise<any> {
    const octokit = await this.getOctokit();
    const response = await octokit.users.getAuthenticated();
    await this.handleRateLimit(response);
    return response.data;
  }

  async getRepositories(options: { type?: string; sort?: string; per_page?: number } = {}): Promise<any[]> {
    const octokit = await this.getOctokit();
    const response = await octokit.repos.listForAuthenticatedUser({
      type: options.type || 'all',
      sort: options.sort || 'updated',
      per_page: options.per_page || 100,
    });
    await this.handleRateLimit(response);
    return response.data;
  }

  async getPullRequests(
    owner: string,
    repo: string,
    options: { state?: string; sort?: string; direction?: string; per_page?: number } = {}
  ): Promise<any[]> {
    const octokit = await this.getOctokit();
    const response = await octokit.pulls.list({
      owner,
      repo,
      state: options.state as 'open' | 'closed' | 'all' || 'open',
      sort: options.sort as 'created' | 'updated' | 'popularity' | 'long-running' || 'updated',
      direction: options.direction as 'asc' | 'desc' || 'desc',
      per_page: options.per_page || 100,
    });
    await this.handleRateLimit(response);
    return response.data;
  }

  async getPullRequest(owner: string, repo: string, number: number): Promise<any> {
    const octokit = await this.getOctokit();
    const response = await octokit.pulls.get({ owner, repo, pull_number: number });
    await this.handleRateLimit(response);
    return response.data;
  }

  async getPullRequestFiles(owner: string, repo: string, number: number): Promise<any[]> {
    const octokit = await this.getOctokit();
    const response = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: number,
      per_page: 100,
    });
    await this.handleRateLimit(response);
    return response.data;
  }

  async getPullRequestComments(owner: string, repo: string, number: number): Promise<any[]> {
    const octokit = await this.getOctokit();
    
    // Get both issue comments and review comments
    const [issueComments, reviewComments] = await Promise.all([
      octokit.issues.listComments({
        owner,
        repo,
        issue_number: number,
        per_page: 100,
      }),
      octokit.pulls.listReviewComments({
        owner,
        repo,
        pull_number: number,
        per_page: 100,
      }),
    ]);
    
    await this.handleRateLimit(issueComments);
    await this.handleRateLimit(reviewComments);
    
    return [...issueComments.data, ...reviewComments.data];
  }

  async getPullRequestReviews(owner: string, repo: string, number: number): Promise<any[]> {
    const octokit = await this.getOctokit();
    const response = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: number,
      per_page: 100,
    });
    await this.handleRateLimit(response);
    return response.data;
  }

  async createComment(
    owner: string,
    repo: string,
    number: number,
    data: { body: string; path?: string; position?: number; line?: number }
  ): Promise<any> {
    const octokit = await this.getOctokit();
    
    if (data.path && (data.position !== undefined || data.line !== undefined)) {
      // Create review comment
      const response = await octokit.pulls.createReviewComment({
        owner,
        repo,
        pull_number: number,
        body: data.body,
        path: data.path,
        position: data.position,
        line: data.line,
        commit_id: await this.getLatestCommit(owner, repo, number),
      });
      await this.handleRateLimit(response);
      return response.data;
    } else {
      // Create issue comment
      const response = await octokit.issues.createComment({
        owner,
        repo,
        issue_number: number,
        body: data.body,
      });
      await this.handleRateLimit(response);
      return response.data;
    }
  }

  async updateComment(owner: string, repo: string, commentId: number, body: string): Promise<any> {
    const octokit = await this.getOctokit();
    
    try {
      // Try updating as review comment first
      const response = await octokit.pulls.updateReviewComment({
        owner,
        repo,
        comment_id: commentId,
        body,
      });
      await this.handleRateLimit(response);
      return response.data;
    } catch (error) {
      // If that fails, try as issue comment
      const response = await octokit.issues.updateComment({
        owner,
        repo,
        comment_id: commentId,
        body,
      });
      await this.handleRateLimit(response);
      return response.data;
    }
  }

  async deleteComment(owner: string, repo: string, commentId: number): Promise<void> {
    const octokit = await this.getOctokit();
    
    try {
      // Try deleting as review comment first
      const response = await octokit.pulls.deleteReviewComment({
        owner,
        repo,
        comment_id: commentId,
      });
      await this.handleRateLimit(response);
    } catch (error) {
      // If that fails, try as issue comment
      const response = await octokit.issues.deleteComment({
        owner,
        repo,
        comment_id: commentId,
      });
      await this.handleRateLimit(response);
    }
  }

  async createReview(
    owner: string,
    repo: string,
    number: number,
    data: { event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES'; body?: string; comments?: any[] }
  ): Promise<any> {
    const octokit = await this.getOctokit();
    const response = await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: number,
      event: data.event,
      body: data.body,
      comments: data.comments,
    });
    await this.handleRateLimit(response);
    return response.data;
  }

  async mergePullRequest(
    owner: string,
    repo: string,
    number: number,
    options: { method?: 'merge' | 'squash' | 'rebase'; title?: string; message?: string }
  ): Promise<any> {
    const octokit = await this.getOctokit();
    const response = await octokit.pulls.merge({
      owner,
      repo,
      pull_number: number,
      merge_method: options.method || 'merge',
      commit_title: options.title,
      commit_message: options.message,
    });
    await this.handleRateLimit(response);
    return response.data;
  }

  async closePullRequest(owner: string, repo: string, number: number): Promise<any> {
    const octokit = await this.getOctokit();
    const response = await octokit.pulls.update({
      owner,
      repo,
      pull_number: number,
      state: 'closed',
    });
    await this.handleRateLimit(response);
    return response.data;
  }

  async reopenPullRequest(owner: string, repo: string, number: number): Promise<any> {
    const octokit = await this.getOctokit();
    const response = await octokit.pulls.update({
      owner,
      repo,
      pull_number: number,
      state: 'open',
    });
    await this.handleRateLimit(response);
    return response.data;
  }

  async requestReviewers(
    owner: string,
    repo: string,
    number: number,
    reviewers: string[],
    teamReviewers?: string[]
  ): Promise<any> {
    const octokit = await this.getOctokit();
    const response = await octokit.pulls.requestReviewers({
      owner,
      repo,
      pull_number: number,
      reviewers,
      team_reviewers: teamReviewers,
    });
    await this.handleRateLimit(response);
    return response.data;
  }

  async addLabels(owner: string, repo: string, number: number, labels: string[]): Promise<any> {
    const octokit = await this.getOctokit();
    const response = await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: number,
      labels,
    });
    await this.handleRateLimit(response);
    return response.data;
  }

  async removeLabel(owner: string, repo: string, number: number, label: string): Promise<any> {
    const octokit = await this.getOctokit();
    const response = await octokit.issues.removeLabel({
      owner,
      repo,
      issue_number: number,
      name: label,
    });
    await this.handleRateLimit(response);
    return response.data;
  }

  async markReadyForReview(owner: string, repo: string, number: number): Promise<any> {
    const octokit = await this.getOctokit();
    const response = await octokit.graphql(`
      mutation($pullRequestId: ID!) {
        markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {
          pullRequest {
            id
            isDraft
          }
        }
      }
    `, {
      pullRequestId: await this.getPullRequestNodeId(owner, repo, number),
    });
    return response;
  }

  private async getPullRequestNodeId(owner: string, repo: string, number: number): Promise<string> {
    const pr = await this.getPullRequest(owner, repo, number);
    return pr.node_id;
  }

  private async getLatestCommit(owner: string, repo: string, number: number): Promise<string> {
    const pr = await this.getPullRequest(owner, repo, number);
    return pr.head.sha;
  }

  getRateLimitInfo(): { remaining: number; reset: Date } {
    return {
      remaining: this.rateLimitRemaining,
      reset: this.rateLimitReset,
    };
  }
}