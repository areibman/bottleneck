import { Octokit } from "@octokit/rest";

//
export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
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
  // Review status
  approvalStatus?: "approved" | "changes_requested" | "pending" | "none";
  approvedBy?: Array<{
    login: string;
    avatar_url: string;
  }>;
  changesRequestedBy?: Array<{
    login: string;
    avatar_url: string;
  }>;
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
  state: "open" | "closed";
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
  diff_hunk?: string;
  position?: number | null;
  original_position?: number | null;
  line?: number | null;
  original_line?: number | null;
  start_line?: number | null;
  original_start_line?: number | null;
  side?: "LEFT" | "RIGHT";
  start_side?: "LEFT" | "RIGHT" | null;
  commit_id?: string;
  original_commit_id?: string;
  pull_request_review_id?: number;
  in_reply_to_id?: number;
}

export interface Review {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  body: string;
  state:
  | "PENDING"
  | "COMMENTED"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "DISMISSED";
  submitted_at: string | null;
  commit_id: string;
}

export interface File {
  filename: string;
  status:
  | "added"
  | "removed"
  | "modified"
  | "renamed"
  | "copied"
  | "changed"
  | "unchanged";
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
      sort: "updated",
    });

    return data.map((repo) => ({
      id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      default_branch: repo.default_branch || "main",
      private: repo.private,
      clone_url: repo.clone_url,
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      stargazers_count: repo.stargazers_count,
      open_issues_count: repo.open_issues_count,
    }));
  }

  async getPullRequests(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
  ) {
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
      state: state === "all" ? "all" : (state as "open" | "closed"),
      per_page: 100,
    });

    // Create a map of issue number to comment count
    const commentCounts = new Map<number, number>();
    issuesData.data.forEach((issue) => {
      if (issue.pull_request) {
        commentCounts.set(issue.number, issue.comments);
      }
    });

    // Fetch detailed PR data and reviews for each PR
    const detailedPRs = await Promise.all(
      data.map(async (pr) => {
        try {
          const [detailedPRResponse, reviewsResponse] = await Promise.all([
            this.octokit.pulls.get({
              owner,
              repo,
              pull_number: pr.number,
            }),
            this.octokit.pulls.listReviews({
              owner,
              repo,
              pull_number: pr.number,
              per_page: 100,
            }),
          ]);

          const detailedPR = detailedPRResponse.data;
          const reviews = reviewsResponse.data;

          // Process reviews to determine approval status
          const approvedBy: Array<{ login: string; avatar_url: string }> = [];
          const changesRequestedBy: Array<{
            login: string;
            avatar_url: string;
          }> = [];

          // Get the latest review from each reviewer
          const latestReviews = new Map<string, (typeof reviews)[0]>();
          reviews.forEach((review) => {
            if (
              review.user &&
              review.state !== "PENDING" &&
              review.state !== "COMMENTED"
            ) {
              const existing = latestReviews.get(review.user.login);
              if (
                !existing ||
                new Date(review.submitted_at!) >
                new Date(existing.submitted_at!)
              ) {
                latestReviews.set(review.user.login, review);
              }
            }
          });

          // Categorize reviews
          latestReviews.forEach((review) => {
            if (review.user) {
              if (review.state === "APPROVED") {
                approvedBy.push({
                  login: review.user.login,
                  avatar_url: review.user.avatar_url,
                });
              } else if (review.state === "CHANGES_REQUESTED") {
                changesRequestedBy.push({
                  login: review.user.login,
                  avatar_url: review.user.avatar_url,
                });
              }
            }
          });

          // Determine overall approval status
          let approvalStatus:
            | "approved"
            | "changes_requested"
            | "pending"
            | "none" = "none";
          if (changesRequestedBy.length > 0) {
            approvalStatus = "changes_requested";
          } else if (approvedBy.length > 0) {
            approvalStatus = "approved";
          } else if (
            pr.requested_reviewers &&
            pr.requested_reviewers.length > 0
          ) {
            approvalStatus = "pending";
          }

          return {
            ...pr,
            comments: commentCounts.get(pr.number) || 0,
            changed_files: detailedPR.changed_files,
            additions: detailedPR.additions,
            deletions: detailedPR.deletions,
            merged: detailedPR.merged,
            merged_at: detailedPR.merged_at,
            approvalStatus,
            approvedBy,
            changesRequestedBy,
          };
        } catch (error) {
          console.error(`Failed to fetch details for PR #${pr.number}:`, error);
          // Fallback to basic PR data without stats
          return {
            ...pr,
            comments: commentCounts.get(pr.number) || 0,
            changed_files: undefined,
            additions: undefined,
            deletions: undefined,
            approvalStatus: "none" as const,
            approvedBy: [],
            changesRequestedBy: [],
          };
        }
      }),
    );

    return detailedPRs as unknown as PullRequest[];
  }

  async getPullRequest(owner: string, repo: string, pullNumber: number) {
    const [prResponse, issueResponse, reviewsResponse] = await Promise.all([
      this.octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      }),
      this.octokit.issues.get({
        owner,
        repo,
        issue_number: pullNumber,
      }),
      this.octokit.pulls.listReviews({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      }),
    ]);

    const data = prResponse.data;
    const reviews = reviewsResponse.data;

    // Process reviews to determine approval status
    const approvedBy: Array<{ login: string; avatar_url: string }> = [];
    const changesRequestedBy: Array<{ login: string; avatar_url: string }> = [];

    // Get the latest review from each reviewer
    const latestReviews = new Map<string, (typeof reviews)[0]>();
    reviews.forEach((review) => {
      if (
        review.user &&
        review.state !== "PENDING" &&
        review.state !== "COMMENTED"
      ) {
        const existing = latestReviews.get(review.user.login);
        if (
          !existing ||
          new Date(review.submitted_at!) > new Date(existing.submitted_at!)
        ) {
          latestReviews.set(review.user.login, review);
        }
      }
    });

    // Categorize reviews
    latestReviews.forEach((review) => {
      if (review.user) {
        if (review.state === "APPROVED") {
          approvedBy.push({
            login: review.user.login,
            avatar_url: review.user.avatar_url,
          });
        } else if (review.state === "CHANGES_REQUESTED") {
          changesRequestedBy.push({
            login: review.user.login,
            avatar_url: review.user.avatar_url,
          });
        }
      }
    });

    // Determine overall approval status
    let approvalStatus: "approved" | "changes_requested" | "pending" | "none" =
      "none";
    if (changesRequestedBy.length > 0) {
      approvalStatus = "changes_requested";
    } else if (approvedBy.length > 0) {
      approvalStatus = "approved";
    } else if (
      data.requested_reviewers &&
      data.requested_reviewers.length > 0
    ) {
      approvalStatus = "pending";
    }

    return {
      ...data,
      comments: issueResponse.data.comments,
      changed_files: (data as any).changed_files,
      additions: (data as any).additions,
      deletions: (data as any).deletions,
      approvalStatus,
      approvedBy,
      changesRequestedBy,
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

  async getBranches(owner: string, repo: string, defaultBranch = "main") {
    const { data } = await this.octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    // Get additional details for each branch
    const branchesWithDetails = await Promise.all(
      data.map(async (branch) => {
        try {
          // Get the commit details for the branch
          const { data: commit } = await this.octokit.repos.getCommit({
            owner,
            repo,
            ref: branch.commit.sha,
          });

          // Get comparison with default branch to check ahead/behind
          let ahead = 0;
          let behind = 0;
          try {
            const { data: comparison } =
              await this.octokit.repos.compareCommitsWithBasehead({
                owner,
                repo,
                basehead: `${defaultBranch}...${branch.name}`,
              });
            ahead = comparison.ahead_by;
            behind = comparison.behind_by;
          } catch (error) {
            // Comparison might fail for some branches
          }

          return {
            name: branch.name,
            commit: {
              sha: branch.commit.sha,
              author: commit.commit.author?.name || "Unknown",
              authorEmail: commit.commit.author?.email || "",
              message: commit.commit.message,
              date: commit.commit.author?.date || new Date().toISOString(),
            },
            protected: branch.protected,
            ahead,
            behind,
          };
        } catch (error) {
          // If we can't get commit details, return basic info
          return {
            name: branch.name,
            commit: {
              sha: branch.commit.sha,
              author: "Unknown",
              authorEmail: "",
              message: "",
              date: new Date().toISOString(),
            },
            protected: branch.protected,
            ahead: 0,
            behind: 0,
          };
        }
      }),
    );

    return branchesWithDetails;
  }

  async getIssues(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
  ) {
    const { data } = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state,
      per_page: 100,
    });

    // Filter out pull requests - GitHub API returns both issues and PRs from this endpoint
    // Pull requests have a pull_request property
    const issues = data.filter((item) => !("pull_request" in item));

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

  async getPullRequestComments(
    owner: string,
    repo: string,
    pullNumber: number,
  ) {
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

    // Return both types but we'll filter them appropriately in the UI
    // Issue comments are for the conversation tab
    // Review comments are for inline diff comments
    return [...issueComments.data, ...reviewComments.data] as Comment[];
  }

  async getPullRequestConversationComments(
    owner: string,
    repo: string,
    pullNumber: number,
  ) {
    // Only get issue comments for the conversation tab
    const { data } = await this.octokit.issues.listComments({
      owner,
      repo,
      issue_number: pullNumber,
      per_page: 100,
    });

    return data as Comment[];
  }

  async getPullRequestReviewComments(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<Comment[]> {
    const { data } = await this.octokit.pulls.listReviewComments({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });

    return data as Comment[];
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
    event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES",
    comments?: Array<{
      path: string;
      line: number;
      side?: "LEFT" | "RIGHT";
      body: string;
    }>,
  ) {
    // GitHub API requires body for REQUEST_CHANGES but it's optional for APPROVE
    // Empty string is fine for APPROVE but we need actual content for REQUEST_CHANGES
    if (event === "REQUEST_CHANGES" && (!body || body.trim() === "")) {
      throw new Error("Body is required when requesting changes");
    }

    // Get the latest commit SHA for the PR (often required by GitHub API)
    const latestCommitSha = await this.getLatestCommitSha(
      owner,
      repo,
      pullNumber,
    );

    // Build the parameters object
    const params: any = {
      owner,
      repo,
      pull_number: pullNumber,
      event,
      commit_id: latestCommitSha, // This is often required to prevent stale reviews
    };

    // Only include body if it's not empty
    // For APPROVE, body is optional and can be omitted
    // For REQUEST_CHANGES, body is required (checked above)
    if (body && body.trim()) {
      params.body = body;
    }

    // Only include comments if provided
    if (comments && comments.length > 0) {
      params.comments = comments;
    }

    const { data } = await this.octokit.pulls.createReview(params);

    return data;
  }

  async createComment(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string,
    path?: string,
    line?: number,
    side?: "LEFT" | "RIGHT",
    startLine?: number,
    startSide?: "LEFT" | "RIGHT",
    diffHunk?: string,
    position?: number,
  ) {
    if (path && (line || position !== undefined)) {
      const params: any = {
        owner,
        repo,
        pull_number: pullNumber,
        body,
        path,
        commit_id: await this.getLatestCommitSha(owner, repo, pullNumber),
      };

      // Use position-based API when position is provided
      if (position !== undefined) {
        params.position = position;
        if (diffHunk) {
          params.diff_hunk = diffHunk;
        }
      } else if (diffHunk && line) {
        // Use line-based API with diff hunk
        params.diff_hunk = diffHunk;
        params.line = line;
        params.side = side || "RIGHT";
        if (startLine && startLine !== line) {
          params.start_line = startLine;
          params.start_side = startSide || side || "RIGHT";
        }
      } else if (line) {
        // Fallback to the old API (might fail for some diffs)
        params.line = line;
        params.side = side;
        params.start_line = startLine;
        params.start_side = startSide;
      }

      const { data } = await this.octokit.pulls.createReviewComment(params);
      return data as Comment;
    } else {
      const { data } = await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body,
      });
      return data as Comment;
    }
  }

  async replyToReviewComment(
    owner: string,
    repo: string,
    pullNumber: number,
    commentId: number,
    body: string,
  ): Promise<Comment> {
    const { data } = await this.octokit.pulls.createReplyForReviewComment({
      owner,
      repo,
      pull_number: pullNumber,
      comment_id: commentId,
      body,
    });

    return data as Comment;
  }

  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    mergeMethod: "merge" | "squash" | "rebase" = "merge",
    commitTitle?: string,
    commitMessage?: string,
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
      state: "closed",
    });

    return data;
  }

  async requestReviewers(
    owner: string,
    repo: string,
    pullNumber: number,
    reviewers: string[],
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
    labels: string[],
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
    label: string,
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

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): Promise<string> {
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ("content" in data) {
      // Content is base64 encoded, decode in main process
      return window.electron.utils.fromBase64(data.content);
    }

    throw new Error("Could not retrieve file content.");
  }

  async searchPullRequests(query: string) {
    const { data } = await this.octokit.search.issuesAndPullRequests({
      q: `${query} type:pr`,
      per_page: 100,
    });

    return data.items;
  }

  async getIssueComments(
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<Comment[]> {
    const { data } = await this.octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
    });

    return data as Comment[];
  }

  async createIssueComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
  ): Promise<Comment> {
    const { data } = await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });

    return data as Comment;
  }

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
  ): Promise<Issue> {
    const { data } = await this.octokit.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });

    return data as Issue;
  }

  async updateIssueComment(
    owner: string,
    repo: string,
    commentId: number,
    body: string,
  ): Promise<Comment> {
    const { data } = await this.octokit.issues.updateComment({
      owner,
      repo,
      comment_id: commentId,
      body,
    });

    return data as Comment;
  }

  async deleteIssueComment(
    owner: string,
    repo: string,
    commentId: number,
  ): Promise<void> {
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

  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string,
    draft: boolean = false,
  ): Promise<PullRequest> {
    const { data } = await this.octokit.pulls.create({
      owner,
      repo,
      title,
      body,
      head,
      base,
      draft,
    });

    return {
      ...data,
      comments: 0,
      approvalStatus: "none",
      approvedBy: [],
      changesRequestedBy: [],
    } as PullRequest;
  }
}
