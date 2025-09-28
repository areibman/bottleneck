import type { PullRequest } from "../../services/github";
import type { PRState } from "../prStore";

type SetState = (
  partial:
    | Partial<PRState>
    | ((state: PRState) => Partial<PRState>),
  replace?: boolean,
) => void;

type GetState = () => PRState;

const parseJSONField = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== "string") {
    return value as T;
  }

  try {
    const parsed = JSON.parse(value) as T;
    return parsed ?? fallback;
  } catch (error) {
    console.warn("[PRStore] Failed to parse JSON field", { value, error });
    return fallback;
  }
};

const mapRowToPullRequest = (
  row: any,
  owner: string,
  repo: string,
): PullRequest => {
  const assignees = parseJSONField(row?.assignees, []) as PullRequest["assignees"];
  const reviewers = parseJSONField(row?.reviewers, []) as PullRequest["requested_reviewers"];
  const labels = parseJSONField(row?.labels, []) as PullRequest["labels"];

  return {
    id: row?.id ?? 0,
    number: row?.number ?? 0,
    title: row?.title ?? "",
    body: row?.body ?? null,
    state: row?.state ?? "open",
    draft: Boolean(row?.draft),
    merged: Boolean(row?.merged),
    mergeable:
      row?.mergeable === null || row?.mergeable === undefined
        ? null
        : Boolean(row?.mergeable),
    merge_commit_sha: row?.merge_commit_sha ?? null,
    head: {
      ref: row?.head_ref ?? "",
      sha: row?.head_sha ?? "",
      repo:
        row?.head_repo_owner && row?.head_repo_name
          ? {
            name: row.head_repo_name,
            owner: { login: row.head_repo_owner },
          }
          : null,
    },
    base: {
      ref: row?.base_ref ?? "",
      sha: row?.base_sha ?? "",
      repo: {
        name: repo,
        owner: { login: owner },
      },
    },
    user: {
      login: row?.author_login ?? "unknown",
      avatar_url: row?.author_avatar_url ?? "",
    },
    assignees,
    requested_reviewers: reviewers,
    labels,
    comments: row?.comments ?? 0,
    created_at: row?.created_at ?? new Date().toISOString(),
    updated_at: row?.updated_at ?? row?.created_at ?? new Date().toISOString(),
    closed_at: row?.closed_at ?? null,
    merged_at: row?.merged_at ?? null,
    changed_files: row?.changed_files ?? undefined,
    additions: row?.additions ?? undefined,
    deletions: row?.deletions ?? undefined,
    approvalStatus: row?.approval_status ?? undefined,
    approvedBy: row?.approved_by
      ? (parseJSONField(row.approved_by, []) as PullRequest["approvedBy"])
      : undefined,
    changesRequestedBy: row?.changes_requested_by
      ? (parseJSONField(row.changes_requested_by, []) as PullRequest["changesRequestedBy"])
      : undefined,
  };
};

interface LoadRepoFromCacheParams {
  owner: string;
  repo: string;
  getState: GetState;
  setState: SetState;
  groupPRsByPrefix: () => void;
}

export const loadRepoFromCache = async ({
  owner,
  repo,
  getState,
  setState,
  groupPRsByPrefix,
}: LoadRepoFromCacheParams): Promise<boolean> => {
  if (!window.electron?.db) {
    return false;
  }

  const repoFullName = `${owner}/${repo}`;

  try {
    const repoResult = (await window.electron.db.query(
      "SELECT id FROM repositories WHERE owner = ? AND name = ?",
      [owner, repo],
    )) as { success: boolean; data?: Array<{ id: number }>; error?: string };

    if (!repoResult?.success || !repoResult.data?.length) {
      const { selectedRepo } = getState();
      if (selectedRepo?.owner === owner && selectedRepo?.name === repo) {
        setState({
          pullRequests: new Map(),
          currentRepoKey: repoFullName,
        });
        groupPRsByPrefix();
      }
      return false;
    }

    const repoId = repoResult.data[0].id;

    const prsResult = (await window.electron.db.query(
      `SELECT * FROM pull_requests WHERE repository_id = ? ORDER BY updated_at DESC`,
      [repoId],
    )) as { success: boolean; data?: any[]; error?: string };

    if (!prsResult?.success || !prsResult.data) {
      return false;
    }

    const prs = prsResult.data.map((row) =>
      mapRowToPullRequest(row, owner, repo),
    );

    const prMap = new Map<string, PullRequest>();
    prs.forEach((pr) => {
      prMap.set(`${repoFullName}#${pr.number}`, pr);
    });

    const { selectedRepo } = getState();
    if (selectedRepo?.owner !== owner || selectedRepo?.name !== repo) {
      return prMap.size > 0;
    }

    setState({
      pullRequests: prMap,
      currentRepoKey: repoFullName,
    });

    groupPRsByPrefix();

    return prMap.size > 0;
  } catch (error) {
    console.error(
      `[PRStore] Failed to load cached PRs for ${repoFullName}:`,
      error,
    );
    return false;
  }
};
