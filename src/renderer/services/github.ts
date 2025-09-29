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

export interface ReviewThread {
  id: string;
  path?: string | null;
  line?: number | null;
  original_line?: number | null;
  start_line?: number | null;
  original_start_line?: number | null;
  state: "pending" | "resolved";
  comments: Comment[];
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
  ): Promise<PullRequest[]> {
    // Use lightweight GraphQL query for better performance
    // Only fetch essential fields, not nested reviews/comments
    return this.getPullRequestsGraphQLLight(owner, repo, state);
  }

  // GraphQL implementation (kept for reference but not used)
  private async getPullRequestsGraphQL(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
  ): Promise<PullRequest[]> {
    // Use GraphQL to fetch all PR data in a single request
    const stateFilter = state === "all" ? "" : `, states: [${state.toUpperCase()}]`;

    const query = `
      query ($owner: String!, $name: String!, $after: String) {
        repository(owner: $owner, name: $name) {
          pullRequests(first: 100, after: $after${stateFilter}, orderBy: {field: UPDATED_AT, direction: DESC}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              databaseId
              number
              title
              body
              state
              isDraft
              merged
              mergeable
              mergeCommit {
                oid
              }
              headRef {
                name
                target {
                  oid
                }
                repository {
                  name
                  owner {
                    login
                  }
                }
              }
              baseRef {
                name
                target {
                  oid
                }
                repository {
                  name
                  owner {
                    login
                  }
                }
              }
              author {
                login
                avatarUrl
              }
              assignees(first: 10) {
                nodes {
                  login
                  avatarUrl
                }
              }
              reviewRequests(first: 10) {
                nodes {
                  requestedReviewer {
                    ... on User {
                      login
                      avatarUrl
                    }
                    ... on Team {
                      name
                    }
                  }
                }
              }
              labels(first: 10) {
                nodes {
                  name
                  color
                }
              }
              comments {
                totalCount
              }
              createdAt
              updatedAt
              closedAt
              mergedAt
              changedFiles
              additions
              deletions
              latestReviews(first: 30) {
                nodes {
                  author {
                    login
                    avatarUrl
                  }
                  state
                  submittedAt
                }
              }
            }
          }
        }
      }
    `;

    const pullRequests: PullRequest[] = [];
    let hasNextPage = true;
    let after: string | null = null;

    // Paginate through all PRs (GraphQL allows max 100 per page)
    while (hasNextPage) {
      try {
        const response: any = await this.octokit.graphql(query, {
          owner,
          name: repo,
          after,
        });

        const prData = response?.repository?.pullRequests;
        if (!prData) break;

        hasNextPage = prData.pageInfo.hasNextPage;
        after = prData.pageInfo.endCursor;

        for (const pr of prData.nodes) {
          if (!pr) continue;

          // Process reviews to determine approval status
          const approvedBy: Array<{ login: string; avatar_url: string }> = [];
          const changesRequestedBy: Array<{ login: string; avatar_url: string }> = [];

          // Get the latest review from each reviewer
          const latestReviews = new Map<string, any>();
          if (pr.latestReviews?.nodes) {
            pr.latestReviews.nodes.forEach((review: any) => {
              if (
                review?.author &&
                review.state !== "PENDING" &&
                review.state !== "COMMENTED"
              ) {
                const existing = latestReviews.get(review.author.login);
                if (
                  !existing ||
                  new Date(review.submittedAt) > new Date(existing.submittedAt)
                ) {
                  latestReviews.set(review.author.login, review);
                }
              }
            });
          }

          // Categorize reviews
          latestReviews.forEach((review) => {
            if (review.state === "APPROVED") {
              approvedBy.push({
                login: review.author.login,
                avatar_url: review.author.avatarUrl,
              });
            } else if (review.state === "CHANGES_REQUESTED") {
              changesRequestedBy.push({
                login: review.author.login,
                avatar_url: review.author.avatarUrl,
              });
            }
          });

          // Determine overall approval status
          let approvalStatus: "approved" | "changes_requested" | "pending" | "none" = "none";
          if (changesRequestedBy.length > 0) {
            approvalStatus = "changes_requested";
          } else if (approvedBy.length > 0) {
            approvalStatus = "approved";
          } else if (pr.reviewRequests?.nodes && pr.reviewRequests.nodes.length > 0) {
            approvalStatus = "pending";
          }

          // Extract requested reviewers (users only, skip teams for now)
          const requestedReviewers = pr.reviewRequests?.nodes
            ?.filter((req: any) => req?.requestedReviewer?.login)
            .map((req: any) => ({
              login: req.requestedReviewer.login,
              avatar_url: req.requestedReviewer.avatarUrl,
            })) || [];

          pullRequests.push({
            id: pr.databaseId ?? pr.number,
            number: pr.number,
            title: pr.title,
            body: pr.body,
            state: pr.state.toLowerCase() as "open" | "closed",
            draft: pr.isDraft,
            merged: pr.merged,
            mergeable: pr.mergeable === "MERGEABLE" ? true : pr.mergeable === "CONFLICTING" ? false : null,
            merge_commit_sha: pr.mergeCommit?.oid || null,
            head: {
              ref: pr.headRef?.name || "",
              sha: pr.headRef?.target?.oid || "",
              repo: pr.headRef?.repository ? {
                name: pr.headRef.repository.name,
                owner: {
                  login: pr.headRef.repository.owner.login,
                },
              } : null,
            },
            base: {
              ref: pr.baseRef?.name || "",
              sha: pr.baseRef?.target?.oid || "",
              repo: {
                name: pr.baseRef?.repository?.name || repo,
                owner: {
                  login: pr.baseRef?.repository?.owner?.login || owner,
                },
              },
            },
            user: {
              login: pr.author?.login || "ghost",
              avatar_url: pr.author?.avatarUrl || "",
            },
            assignees: pr.assignees?.nodes?.map((a: any) => ({
              login: a.login,
              avatar_url: a.avatarUrl,
            })) || [],
            requested_reviewers: requestedReviewers,
            labels: pr.labels?.nodes?.map((l: any) => ({
              name: l.name,
              color: l.color,
            })) || [],
            comments: pr.comments?.totalCount || 0,
            created_at: pr.createdAt,
            updated_at: pr.updatedAt,
            closed_at: pr.closedAt,
            merged_at: pr.mergedAt,
            changed_files: pr.changedFiles,
            additions: pr.additions,
            deletions: pr.deletions,
            approvalStatus,
            approvedBy,
            changesRequestedBy,
          });
        }

        // Only fetch first page for now to avoid rate limits
        // You can remove this break to fetch all pages if needed
        if (pullRequests.length >= 100) break;
      } catch (error) {
        console.error("Failed to fetch pull requests via GraphQL:", error);
        throw error;
      }
    }

    return pullRequests;
  }

  // Lightweight GraphQL query - only essential fields for list view
  private async getPullRequestsGraphQLLight(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
  ): Promise<PullRequest[]> {
    console.time(`GraphQL fetch for ${owner}/${repo}`);
    const stateFilter = state === "all" ? "" : `, states: [${state.toUpperCase()}]`;

    // Much simpler query - no nested reviews, minimal nested objects
    const query = `
      query ($owner: String!, $name: String!, $after: String) {
        repository(owner: $owner, name: $name) {
          pullRequests(first: 100, after: $after${stateFilter}, orderBy: {field: UPDATED_AT, direction: DESC}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              databaseId
              number
              title
              body
              state
              isDraft
              merged
              mergeable
              mergeCommit {
                oid
              }
              headRefName
              baseRefName
              author {
                login
                avatarUrl
              }
              assignees(first: 5) {
                nodes {
                  login
                  avatarUrl
                }
              }
              labels(first: 10) {
                nodes {
                  name
                  color
                }
              }
              createdAt
              updatedAt
              closedAt
              mergedAt
              changedFiles
              additions
              deletions
            }
          }
        }
      }
    `;

    const pullRequests: PullRequest[] = [];
    let hasNextPage = true;
    let after: string | null = null;
    let pageCount = 0;
    const maxPages = 1; // Only fetch first page initially for fast load

    try {
      while (hasNextPage && pageCount < maxPages) {
        const response: any = await this.octokit.graphql(query, {
          owner,
          name: repo,
          after,
        });

        const prData = response?.repository?.pullRequests;
        if (!prData) break;

        hasNextPage = prData.pageInfo.hasNextPage;
        after = prData.pageInfo.endCursor;

        for (const pr of prData.nodes) {
          if (!pr) continue;

          pullRequests.push({
            id: pr.databaseId ?? pr.number,
            number: pr.number,
            title: pr.title,
            body: pr.body || "",
            state: pr.state.toLowerCase() as "open" | "closed",
            draft: pr.isDraft || false,
            merged: pr.merged || false,
            mergeable: pr.mergeable === "MERGEABLE" ? true : pr.mergeable === "CONFLICTING" ? false : null,
            merge_commit_sha: pr.mergeCommit?.oid || null,
            head: {
              ref: pr.headRefName || "",
              sha: "", // Not needed for list view
              repo: {
                name: repo,
                owner: {
                  login: owner,
                },
              },
            },
            base: {
              ref: pr.baseRefName || "",
              sha: "", // Not needed for list view
              repo: {
                name: repo,
                owner: {
                  login: owner,
                },
              },
            },
            user: {
              login: pr.author?.login || "ghost",
              avatar_url: pr.author?.avatarUrl || "",
            },
            assignees: pr.assignees?.nodes?.map((a: any) => ({
              login: a.login,
              avatar_url: a.avatarUrl,
            })) || [],
            requested_reviewers: [], // Will fetch if needed in detail view
            labels: pr.labels?.nodes?.map((l: any) => ({
              name: l.name,
              color: l.color,
            })) || [],
            comments: 0, // Will fetch if needed in detail view
            created_at: pr.createdAt,
            updated_at: pr.updatedAt,
            closed_at: pr.closedAt,
            merged_at: pr.mergedAt,
            // These are now included in the lightweight query!
            changed_files: pr.changedFiles ?? 0,
            additions: pr.additions ?? 0,
            deletions: pr.deletions ?? 0,
            approvalStatus: "none" as const, // Will fetch if needed
            approvedBy: [],
            changesRequestedBy: [],
          });
        }

        pageCount++;

        // Only fetch first 100 PRs initially for fast load
        // Users rarely need to see more than the most recent 100 PRs
        // Additional pages can be fetched on-demand if needed
      }
    } catch (error) {
      console.error("GraphQL query failed, falling back to REST:", error);
      console.timeEnd(`GraphQL fetch for ${owner}/${repo}`);
      // Fallback to REST if GraphQL fails
      return this.getPullRequestsREST(owner, repo, state);
    }

    console.log(`Fetched ${pullRequests.length} PRs via lightweight GraphQL`);
    console.timeEnd(`GraphQL fetch for ${owner}/${repo}`);
    return pullRequests;
  }

  // REST implementation optimized for performance
  private async getPullRequestsREST(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
  ): Promise<PullRequest[]> {
    const pullRequests: PullRequest[] = [];
    let page = 1;
    const perPage = 100; // GitHub's max per page

    try {
      while (true) {
        const { data } = await this.octokit.pulls.list({
          owner,
          repo,
          state,
          sort: "updated",
          direction: "desc",
          per_page: perPage,
          page,
        });

        if (data.length === 0) break;

        // Map PR data - REST API provides most fields we need
        for (const pr of data) {
          pullRequests.push({
            id: pr.id,
            number: pr.number,
            title: pr.title,
            body: pr.body || "",
            state: pr.state as "open" | "closed",
            draft: pr.draft || false,
            merged: pr.merged_at !== null,
            mergeable: pr.mergeable || null,
            merge_commit_sha: pr.merge_commit_sha || null,
            head: pr.head,
            base: pr.base,
            user: pr.user ? {
              login: pr.user.login,
              avatar_url: pr.user.avatar_url,
            } : {
              login: "ghost",
              avatar_url: "",
            },
            assignees: pr.assignees?.map(a => ({
              login: a.login,
              avatar_url: a.avatar_url,
            })) || [],
            requested_reviewers: Array.isArray(pr.requested_reviewers)
              ? pr.requested_reviewers.filter((r: any) => r.login).map((r: any) => ({
                login: r.login,
                avatar_url: r.avatar_url,
              }))
              : [],
            labels: pr.labels?.map(l => ({
              name: l.name,
              color: l.color,
            })) || [],
            comments: pr.comments || 0,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            closed_at: pr.closed_at,
            merged_at: pr.merged_at,
            // REST API list endpoint doesn't provide these fields
            // We'll fetch them separately for visible PRs
            changed_files: undefined,
            additions: undefined,
            deletions: undefined,
            // Review status will be fetched on-demand for detail view
            approvalStatus: "none" as const,
            approvedBy: [],
            changesRequestedBy: [],
          });
        }

        // Stop if we got less than a full page
        if (data.length < perPage) break;

        // Limit total PRs to avoid excessive API calls
        // Frontend will handle filtering, so we don't need all PRs
        if (pullRequests.length >= 300) {
          console.log(`Fetched ${pullRequests.length} PRs, stopping pagination for performance`);
          break;
        }

        page++;
      }
    } catch (error) {
      console.error("Failed to fetch pull requests via REST API:", error);
      throw error;
    }

    console.log(`Fetched ${pullRequests.length} pull requests via REST API`);
    return pullRequests;
  }

  // Fetch statistics for multiple PRs efficiently
  async fetchPRStatistics(
    owner: string,
    repo: string,
    prNumbers: number[]
  ): Promise<Map<number, { additions: number; deletions: number; changed_files: number }>> {
    const stats = new Map();

    // Fetch in parallel with rate limiting
    const batchSize = 10; // Process 10 at a time to avoid rate limits
    for (let i = 0; i < prNumbers.length; i += batchSize) {
      const batch = prNumbers.slice(i, i + batchSize);
      const promises = batch.map(async (prNumber) => {
        try {
          const { data } = await this.octokit.pulls.get({
            owner,
            repo,
            pull_number: prNumber,
          });
          return {
            number: prNumber,
            additions: data.additions || 0,
            deletions: data.deletions || 0,
            changed_files: data.changed_files || 0,
          };
        } catch (error) {
          console.error(`Failed to fetch stats for PR #${prNumber}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      results.forEach((result) => {
        if (result) {
          stats.set(result.number, {
            additions: result.additions,
            deletions: result.deletions,
            changed_files: result.changed_files,
          });
        }
      });
    }

    return stats;
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
        per_page: 500,
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
      per_page: 500,
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
      per_page: 500,
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
      per_page: 500,
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
        per_page: 500,
      }),
      this.octokit.pulls.listReviewComments({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 500,
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
      per_page: 500,
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
      per_page: 500,
    });

    return data as Comment[];
  }

  async getPullRequestReviewThreads(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<ReviewThread[]> {
    const threads: ReviewThread[] = [];
    let hasNextPage = true;
    let after: string | null = null;

    const query = `
      query ($owner: String!, $name: String!, $number: Int!, $after: String) {
        repository(owner: $owner, name: $name) {
          pullRequest(number: $number) {
            reviewThreads(first: 50, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                isResolved
                path
                line
                originalLine
                startLine
                originalStartLine
                comments(first: 100) {
                  nodes {
                    databaseId
                    body
                    createdAt
                    updatedAt
                    url
                    diffHunk
                    path
                    line
                    originalLine
                    startLine
                    originalStartLine
                    author {
                      login
                      avatarUrl
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    while (hasNextPage) {
      const response: any = await this.octokit.graphql(query, {
        owner,
        name: repo,
        number: pullNumber,
        after,
      });

      const threadData =
        response?.repository?.pullRequest?.reviewThreads?.nodes ?? [];

      threadData.forEach((thread: any) => {
        if (!thread) return;

        const comments: Comment[] = (thread.comments?.nodes ?? [])
          .filter((node: any) => node && node.databaseId)
          .map((node: any) => {
            const side = node.originalLine && !node.line ? "LEFT" : "RIGHT";

            return {
              id: node.databaseId,
              body: node.body || "",
              user: {
                login: node.author?.login || "ghost",
                avatar_url: node.author?.avatarUrl || "",
              },
              created_at: node.createdAt,
              updated_at: node.updatedAt,
              html_url: node.url || "",
              path: node.path || undefined,
              diff_hunk: node.diffHunk || undefined,
              line: node.line,
              original_line: node.originalLine,
              start_line: node.startLine,
              original_start_line: node.originalStartLine,
              side,
              start_side: undefined,
              position: null,
              original_position: null,
              commit_id: undefined,
              original_commit_id: undefined,
              pull_request_review_id: undefined,
              in_reply_to_id: undefined,
            };
          });

        threads.push({
          id: thread.id,
          path: thread.path,
          line: thread.line,
          original_line: thread.originalLine,
          start_line: thread.startLine,
          original_start_line: thread.originalStartLine,
          state: thread.isResolved ? "resolved" : "pending",
          comments,
        });
      });

      const pageInfo =
        response?.repository?.pullRequest?.reviewThreads?.pageInfo;
      hasNextPage = Boolean(pageInfo?.hasNextPage);
      after = pageInfo?.endCursor ?? null;
    }

    return threads;
  }

  async updateReviewThreadResolution(
    owner: string,
    repo: string,
    pullNumber: number,
    threadId: string,
    resolved: boolean,
  ): Promise<ReviewThread> {
    const mutation = resolved
      ? `mutation ($threadId: ID!) {
          resolveReviewThread(input: { threadId: $threadId }) {
            thread {
              id
              isResolved
              path
              line
              originalLine
              startLine
              originalStartLine
            }
          }
        }`
      : `mutation ($threadId: ID!) {
          unresolveReviewThread(input: { threadId: $threadId }) {
            thread {
              id
              isResolved
              path
              line
              originalLine
              startLine
              originalStartLine
            }
          }
        }`;

    const response: any = await this.octokit.graphql(mutation, {
      threadId,
    });

    const thread =
      response?.resolveReviewThread?.thread ||
      response?.unresolveReviewThread?.thread;

    if (!thread) {
      throw new Error("Failed to update review thread resolution");
    }

    return {
      id: thread.id,
      path: thread.path,
      line: thread.line,
      original_line: thread.originalLine,
      start_line: thread.startLine,
      original_start_line: thread.originalStartLine,
      state: thread.isResolved ? "resolved" : "pending",
      comments: [],
    };
  }

  async getPullRequestReviews(owner: string, repo: string, pullNumber: number) {
    const { data } = await this.octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 500,
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
      } else if (line) {
        // Use line-based positioning for multi-line comments
        params.line = line;
        params.side = side || "RIGHT";
        if (startLine && startLine !== line) {
          params.start_line = startLine;
          params.start_side = startSide || side || "RIGHT";
        }
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
      per_page: 500,
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

  async updatePullRequestDraft(
    owner: string,
    repo: string,
    pullNumber: number,
    draft: boolean,
  ): Promise<PullRequest> {
    // First, get the current PR data
    const currentPR = await this.getPullRequest(owner, repo, pullNumber);

    // GitHub doesn't have a direct endpoint to toggle draft status
    // We need to use GraphQL API for this
    const mutation = draft
      ? `mutation($pullRequestId: ID!) {
          convertPullRequestToDraft(input: { pullRequestId: $pullRequestId }) {
            pullRequest {
              id
              number
              isDraft
            }
          }
        }`
      : `mutation($pullRequestId: ID!) {
          markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {
            pullRequest {
              id
              number
              isDraft
            }
          }
        }`;

    // Get the PR node ID
    const { data: prData } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    const response: any = await this.octokit.graphql(mutation, {
      pullRequestId: prData.node_id,
    });

    console.log("GraphQL mutation response:", response);

    // Get the isDraft value from the GraphQL response
    const isDraft = draft
      ? response.convertPullRequestToDraft?.pullRequest?.isDraft
      : response.markPullRequestReadyForReview?.pullRequest?.isDraft;

    console.log("GraphQL isDraft result:", isDraft, "Expected draft state:", draft);

    // Return the current PR with the updated draft status
    // This avoids potential caching issues with immediately refetching
    return {
      ...currentPR,
      draft: isDraft !== undefined ? isDraft : draft,
    };
  }

  async starRepository(owner: string, repo: string): Promise<void> {
    try {
      await this.octokit.rest.activity.starRepoForAuthenticatedUser({
        owner,
        repo,
      });
    } catch (error) {
      console.error(`Failed to star repository ${owner}/${repo}:`, error);
      throw error;
    }
  }

  async unstarRepository(owner: string, repo: string): Promise<void> {
    try {
      await this.octokit.rest.activity.unstarRepoForAuthenticatedUser({
        owner,
        repo,
      });
    } catch (error) {
      console.error(`Failed to unstar repository ${owner}/${repo}:`, error);
      throw error;
    }
  }
}
