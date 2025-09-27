export interface GitHubCheckRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required" | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
  details_url: string | null;
  check_suite: {
    id: number;
    status: "queued" | "in_progress" | "completed";
    conclusion: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required" | null;
    created_at: string;
    updated_at: string;
    head_sha: string;
    head_branch: string;
    pull_requests: Array<{
      number: number;
      head: {
        ref: string;
        sha: string;
      };
      base: {
        ref: string;
        sha: string;
      };
    }>;
  };
  app: {
    id: number;
    name: string;
    owner: {
      login: string;
    };
  };
  output: {
    title: string | null;
    summary: string | null;
    text: string | null;
  };
}

export interface CheckStatus {
  branch: string;
  checkRuns: GitHubCheckRun[];
  lastUpdated: number;
  overallStatus: "success" | "failure" | "pending" | "no-checks";
  summary: {
    total: number;
    success: number;
    failure: number;
    pending: number;
    skipped: number;
  };
}

export interface CheckStatusMap {
  [repoKey: string]: {
    [branchName: string]: CheckStatus;
  };
}

export interface CheckRunFilters {
  status?: "success" | "failure" | "pending" | "no-checks";
  app?: string;
  conclusion?: string;
}

export interface CheckStatusSettings {
  autoRefresh: boolean;
  refreshInterval: number; // in milliseconds
  showDetails: boolean;
  groupByStatus: boolean;
  notifications: {
    enabled: boolean;
    onFailure: boolean;
    onSuccess: boolean;
  };
}