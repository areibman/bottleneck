import { Octokit } from '@octokit/rest';

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  merge_commit_sha: string | null;
  head: {
    ref: string;
    sha: string;
    repo: {
      name: string;
      owner: {
        login: string;
      };
    } | null;
  };
  base: {
    ref: string;
    sha: string;
    repo: {
      name: string;
      owner: {
        login: string;
      };
    };
  };
  user: {
    login: string;
    avatar_url: string;
  };
  assignees: Array<{
    login: string;
    avatar_url: string;
  }>;
  requested_reviewers: Array<{
    login: string;
    avatar_url: string;
  }>;
  labels: Array<{
    name: string;
    color: string;
  }>;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  // File change statistics
  changed_files?: number;
  additions?: number;
  deletions?: number;
}

export interface Repository {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  private: boolean;
  clone_url: string;
  updated_at: string | null;
  pushed_at: string | null;
  stargazers_count: number;
  open_issues_count: number;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  assignees: Array<{
    login: string;
    avatar_url: string;
  }>;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  repository?: {
    owner: {
      login: string;
    };
    name: string;
  };
}

export interface Comment {
  id: number;
  body: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  path?: string;
  line?: number;
  side?: 'LEFT' | 'RIGHT';
  start_line?: number;
  start_side?: 'LEFT' | 'RIGHT';
  in_reply_to_id?: number;
}

export interface Review {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  body: string;
  state: 'PENDING' | 'COMMENTED' | 'APPROVED' | 'CHANGES_REQUESTED' | 'DISMISSED';
  submitted_at: string | null;
  commit_id: string;
}

export interface File {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  contents_url: string;
  blob_url: string;
}

export class GitHubAPI {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  async getRepositories(page = 1, perPage = 100): Promise<Repository[]> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      page,
      per_page: perPage,
      sort: 'updated',
    });
    
    return data.map(repo => ({
      id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      default_branch: repo.default_branch || 'main',
      private: repo.private,
      clone_url: repo.clone_url,
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      stargazers_count: repo.stargazers_count,
      open_issues_count: repo.open_issues_count,
    }));
  }

  async getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
    const { data } = await this.octokit.pulls.list({
      owner,
      repo,
      state,
      per_page: 100,
    });
    
    // The pulls.list endpoint doesn't include comment counts, but we can get them from the issues API
    // Since every PR is also an issue, we can fetch the issues to get comment counts
    const issuesData = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state: state === 'all' ? 'all' : state as 'open' | 'closed',
      per_page: 100,
    });
    
    // Create a map of issue number to comment count
    const commentCounts = new Map<number, number>();
    issuesData.data.forEach(issue => {
      if (issue.pull_request) {
        commentCounts.set(issue.number, issue.comments);
      }
    });
    
    // Fetch detailed PR data for each PR to get file stats
    // Note: This requires additional API calls but is necessary for file stats
    const detailedPRs = await Promise.all(
      data.map(async (pr) => {
        try {
          const { data: detailedPR } = await this.octokit.pulls.get({
            owner,
            repo,
            pull_number: pr.number,
          });
          
          return {
            ...pr,
            comments: commentCounts.get(pr.number) || 0,
            changed_files: detailedPR.changed_files,
            additions: detailedPR.additions,
            deletions: detailedPR.deletions,
            merged: detailedPR.merged,
            merged_at: detailedPR.merged_at
          };
        } catch (error) {
          console.error(`Failed to fetch details for PR #${pr.number}:`, error);
          // Fallback to basic PR data without stats
          return {
            ...pr,
            comments: commentCounts.get(pr.number) || 0,
            changed_files: undefined,
            additions: undefined,
            deletions: undefined
          };
        }
      })
    );
    
    return detailedPRs as unknown as PullRequest[];
  }

  async getPullRequest(owner: string, repo: string, pullNumber: number) {
    const { data } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });
    
    // Get comment count from issues API
    const issueData = await this.octokit.issues.get({
      owner,
      repo,
      issue_number: pullNumber,
    });
    
    return {
      ...data,
      comments: issueData.data.comments,
      changed_files: (data as any).changed_files,
      additions: (data as any).additions,
      deletions: (data as any).deletions
    } as PullRequest;
  }

  async getIssue(owner: string, repo: string, issueNumber: number) {
    const { data } = await this.octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });
    
    return data as Issue;
  }

  async getIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
    const { data } = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state,
      per_page: 100,
    });
    
    // Filter out pull requests - GitHub API returns both issues and PRs from this endpoint
    // Pull requests have a pull_request property
    const issues = data.filter(item => !('pull_request' in item));
    
    return issues as Issue[];
  }

  async getPullRequestFiles(owner: string, repo: string, pullNumber: number) {
    const { data } = await this.octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });
    
    return data as File[];
  }

  async getPullRequestComments(owner: string, repo: string, pullNumber: number) {
    const [issueComments, reviewComments] = await Promise.all([
      this.octokit.issues.listComments({
        owner,
        repo,
        issue_number: pullNumber,
        per_page: 100,
      }),
      this.octokit.pulls.listReviewComments({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      }),
    ]);
    
    return [...issueComments.data, ...reviewComments.data] as Comment[];
  }

  async getPullRequestReviews(owner: string, repo: string, pullNumber: number) {
    const { data } = await this.octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });
    
    return data as Review[];
  }

  async createReview(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string,
    event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES',
    comments?: Array<{
      path: string;
      line: number;
      side?: 'LEFT' | 'RIGHT';
      body: string;
    }>
  ) {
    const { data } = await this.octokit.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      body,
      event,
      comments,
    });
    
    return data;
  }

  async createComment(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string,
    path?: string,
    line?: number,
    side?: 'LEFT' | 'RIGHT'
  ) {
    if (path && line) {
      const { data } = await this.octokit.pulls.createReviewComment({
        owner,
        repo,
        pull_number: pullNumber,
        body,
        path,
        line,
        side,
        commit_id: await this.getLatestCommitSha(owner, repo, pullNumber),
      });
      return data;
    } else {
      const { data } = await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body,
      });
      return data;
    }
  }

  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge',
    commitTitle?: string,
    commitMessage?: string
  ) {
    const { data } = await this.octokit.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
      merge_method: mergeMethod,
      commit_title: commitTitle,
      commit_message: commitMessage,
    });
    
    return data;
  }

  async closePullRequest(owner: string, repo: string, pullNumber: number) {
    const { data } = await this.octokit.pulls.update({
      owner,
      repo,
      pull_number: pullNumber,
      state: 'closed',
    });
    
    return data;
  }

  async requestReviewers(
    owner: string,
    repo: string,
    pullNumber: number,
    reviewers: string[]
  ) {
    const { data } = await this.octokit.pulls.requestReviewers({
      owner,
      repo,
      pull_number: pullNumber,
      reviewers,
    });
    
    return data;
  }

  async addLabels(
    owner: string,
    repo: string,
    pullNumber: number,
    labels: string[]
  ) {
    const { data } = await this.octokit.issues.addLabels({
      owner,
      repo,
      issue_number: pullNumber,
      labels,
    });
    
    return data;
  }

  async removeLabel(
    owner: string,
    repo: string,
    pullNumber: number,
    label: string
  ) {
    await this.octokit.issues.removeLabel({
      owner,
      repo,
      issue_number: pullNumber,
      name: label,
    });
  }

  async getLatestCommitSha(owner: string, repo: string, pullNumber: number) {
    const { data } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });
    
    return data.head.sha;
  }

  async searchPullRequests(query: string) {
    const { data } = await this.octokit.search.issuesAndPullRequests({
      q: `${query} type:pr`,
      per_page: 100,
    });
    
    return data.items;
  }

  async getIssueComments(owner: string, repo: string, issueNumber: number): Promise<Comment[]> {
    const { data } = await this.octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
    });
    
    return data as Comment[];
  }

  async createIssueComment(owner: string, repo: string, issueNumber: number, body: string): Promise<Comment> {
    const { data } = await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
    
    return data as Comment;
  }

  async updateIssue(owner: string, repo: string, issueNumber: number, body: string): Promise<Issue> {
    const { data } = await this.octokit.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
    
    return data as Issue;
  }

  async updateIssueComment(owner: string, repo: string, commentId: number, body: string): Promise<Comment> {
    const { data } = await this.octokit.issues.updateComment({
      owner,
      repo,
      comment_id: commentId,
      body,
    });
    
    return data as Comment;
  }

  async deleteIssueComment(owner: string, repo: string, commentId: number): Promise<void> {
    await this.octokit.issues.deleteComment({
      owner,
      repo,
      comment_id: commentId,
    });
  }

  async getCurrentUser() {
    const { data } = await this.octokit.users.getAuthenticated();
    return data;
  }
}
