import { useEffect, useRef } from "react";
import { Issue } from "../../../services/github";

export function useIssueDevelopmentLoader(
  owner: string | undefined,
  repo: string | undefined,
  issues: Map<string, Issue>,
  refreshIssueLinks: (owner: string, repo: string, issueNumber: number) => Promise<void>,
) {
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchedRef.current.clear();
  }, [owner, repo]);

  useEffect(() => {
    if (!owner || !repo || issues.size === 0) return;

    const toFetch: Issue[] = [];
    const maxPerBatch = 10;

    for (const issue of issues.values()) {
      const cacheKey = `${owner}/${repo}#${issue.number}`;
      const hasDevelopmentData =
        typeof issue.linkedBranches !== "undefined" ||
        typeof issue.linkedPRs !== "undefined";

      if (hasDevelopmentData) {
        fetchedRef.current.add(cacheKey);
        continue;
      }

      if (fetchedRef.current.has(cacheKey)) {
        continue;
      }

      fetchedRef.current.add(cacheKey);
      toFetch.push(issue);

      if (toFetch.length >= maxPerBatch) {
        break;
      }
    }

    if (toFetch.length === 0) return;

    let cancelled = false;

    const load = async () => {
      for (const issue of toFetch) {
        if (cancelled) break;
        try {
          await refreshIssueLinks(owner, repo, issue.number);
        } catch (error) {
          console.error(
            `[TRACKER] ❌ Failed to fetch development info for issue #${issue.number}`,
            error,
          );
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [owner, repo, issues, refreshIssueLinks]);
}
