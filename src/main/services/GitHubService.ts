import { Octokit } from '@octokit/rest';
import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import { PullRequest, Comment } from '../database/DatabaseManager';

export class GitHubService {
  private octokit: Octokit | null = null;
  private token: string | null = null;

  public async authenticate(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const auth = createOAuthDeviceAuth({
        clientType: 'oauth-app',
        clientId: 'Iv1.8a61f9b3a7aba766', // This should be your actual OAuth app client ID
        onVerification: (verification) => {
          console.log('Open this URL in your browser:', verification.verification_uri);
          console.log('Enter this code:', verification.user_code);
        },
      });

      const { token } = await auth({ type: 'oauth' });
      this.token = token;
      this.octokit = new Octokit({ auth: token });
      
      return { success: true, token };
    } catch (error) {
      console.error('GitHub authentication failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Authentication failed' };
    }
  }

  public async getCurrentUser(): Promise<any> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    const { data } = await this.octokit.users.getAuthenticated();
    return data;
  }

  public async getRepositories(): Promise<any[]> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
    });

    return data;
  }

  public async getPullRequests(repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<PullRequest[]> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    const [owner, repoName] = repo.split('/');
    const { data } = await this.octokit.pulls.list({
      owner,
      repo: repoName,
      state,
      per_page: 100,
      sort: 'updated',
    });

    return data.map(pr => this.transformPullRequest(pr, repo));
  }

  public async getPullRequestDetails(repo: string, prNumber: number): Promise<any> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    const [owner, repoName] = repo.split('/');
    const { data } = await this.octokit.pulls.get({
      owner,
      repo: repoName,
      pull_number: prNumber,
    });

    return this.transformPullRequest(data, repo);
  }

  public async getPullRequestFiles(repo: string, prNumber: number): Promise<any[]> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    const [owner, repoName] = repo.split('/');
    const { data } = await this.octokit.pulls.listFiles({
      owner,
      repo: repoName,
      pull_number: prNumber,
    });

    return data;
  }

  public async getPullRequestComments(repo: string, prNumber: number): Promise<Comment[]> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    const [owner, repoName] = repo.split('/');
    const { data } = await this.octokit.issues.listComments({
      owner,
      repo: repoName,
      issue_number: prNumber,
    });

    return data.map(comment => this.transformComment(comment, prNumber.toString()));
  }

  public async createReview(repo: string, prNumber: number, review: {
    body?: string;
    event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';
    comments?: Array<{
      path: string;
      position: number;
      body: string;
    }>;
  }): Promise<any> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    const [owner, repoName] = repo.split('/');
    const { data } = await this.octokit.pulls.createReview({
      owner,
      repo: repoName,
      pull_number: prNumber,
      body: review.body,
      event: review.event,
      comments: review.comments,
    });

    return data;
  }

  public async mergePullRequest(repo: string, prNumber: number, mergeMethod: 'merge' | 'squash' | 'rebase'): Promise<any> {
    if (!this.octokit) {
      throw new Error('Not authenticated');
    }

    const [owner, repoName] = repo.split('/');
    const { data } = await this.octokit.pulls.merge({
      owner,
      repo: repoName,
      pull_number: prNumber,
      merge_method: mergeMethod,
    });

    return data;
  }

  private transformPullRequest(pr: any, repo: string): PullRequest {
    return {
      id: `${repo}#${pr.number}`,
      number: pr.number,
      title: pr.title,
      state: pr.state === 'closed' && pr.merged_at ? 'merged' : pr.state,
      draft: pr.draft || false,
      author: pr.user.login,
      authorId: pr.user.id,
      repo,
      repoId: pr.head.repo.id,
      headRef: pr.head.ref,
      baseRef: pr.base.ref,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at,
      closedAt: pr.closed_at,
      labels: pr.labels.map((label: any) => label.name),
      reviewers: pr.requested_reviewers?.map((reviewer: any) => reviewer.login) || [],
      assignees: pr.assignees?.map((assignee: any) => assignee.login) || [],
      checksStatus: 'pending', // This would need to be fetched separately
      checksConclusion: undefined,
      mergeable: pr.mergeable,
      mergeableState: pr.mergeable_state,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      body: pr.body,
      url: pr.url,
      htmlUrl: pr.html_url,
    };
  }

  private transformComment(comment: any, prId: string): Comment {
    return {
      id: comment.id.toString(),
      prId,
      type: 'comment',
      author: comment.user.login,
      authorId: comment.user.id,
      body: comment.body,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      resolved: false,
    };
  }
}