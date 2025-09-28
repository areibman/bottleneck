import type { PullRequest, Repository } from "../../services/github";

export const storePRsInDB = async (
  prs: PullRequest[],
  owner: string,
  repo: string,
) => {
  if (!window.electron?.db) {
    return;
  }

  const repoResult = await window.electron.db.query(
    "SELECT id FROM repositories WHERE owner = ? AND name = ?",
    [owner, repo],
  );

  if (
    !repoResult.success ||
    !repoResult.data ||
    repoResult.data.length === 0
  )
    return;

  const repoId = repoResult.data[0].id;

  for (const pr of prs) {
    await window.electron.db.execute(
      `INSERT OR REPLACE INTO pull_requests 
       (id, repository_id, number, title, body, state, draft, merged, mergeable,
        merge_commit_sha, head_ref, head_sha, base_ref, base_sha, author_login,
        author_avatar_url, assignees, reviewers, labels, created_at, updated_at,
        closed_at, merged_at, last_synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        pr.id,
        repoId,
        pr.number,
        pr.title,
        pr.body,
        pr.state,
        pr.draft ? 1 : 0,
        pr.merged ? 1 : 0,
        pr.mergeable ? 1 : 0,
        pr.merge_commit_sha,
        pr.head.ref,
        pr.head.sha,
        pr.base.ref,
        pr.base.sha,
        pr.user.login,
        pr.user.avatar_url,
        JSON.stringify(pr.assignees),
        JSON.stringify(pr.requested_reviewers),
        JSON.stringify(pr.labels),
        pr.created_at,
        pr.updated_at,
        pr.closed_at,
        pr.merged_at,
      ],
    );
  }
};

export const storeReposInDB = async (repos: Repository[]) => {
  if (!window.electron?.db) {
    return;
  }

  for (const repo of repos) {
    await window.electron.db.execute(
      `INSERT OR REPLACE INTO repositories 
       (owner, name, full_name, description, default_branch, private, clone_url, last_synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        repo.owner,
        repo.name,
        repo.full_name,
        repo.description,
        repo.default_branch,
        repo.private ? 1 : 0,
        repo.clone_url,
      ],
    );
  }
};

