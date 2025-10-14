import { useEffect, useRef } from "react";
import { Issue } from "../../../services/github";

export function useIssueDevelopmentLoader(
  owner: string | undefined,
  repo: string | undefined,
  issues: Map<string, Issue>,
  refreshIssueLinks: (owner: string, repo: string, issueNumber: number) => Promise<void>,
) {
  const fetchedRef = useRef<Set<string>>(new Set());
  const lastIssuesMapRef = useRef<Map<string, Issue> | null>(null);

  // Clear cache when repo changes
  useEffect(() => {
    fetchedRef.current.clear();
    lastIssuesMapRef.current = null;
  }, [owner, repo]);

  // Detect if issues Map was replaced (e.g., on fetchIssues) and clean up stale cache entries
  useEffect(() => {
    if (lastIssuesMapRef.current !== issues && issues.size > 0) {
      // Remove cache entries for issues that no longer have development data
      const keysToRemove: string[] = [];
      for (const cacheKey of fetchedRef.current) {
        const issue = issues.get(cacheKey);
        if (issue) {
          const hasData = (typeof issue.linkedBranches !== "undefined" && issue.linkedBranches !== null) ||
            (typeof issue.linkedPRs !== "undefined" && issue.linkedPRs !== null);
          if (!hasData) {
            keysToRemove.push(cacheKey);
          }
        } else {
          // Issue no longer exists in the map
          keysToRemove.push(cacheKey);
        }
      }

      if (keysToRemove.length > 0) {
        keysToRemove.forEach(key => fetchedRef.current.delete(key));
      }

      lastIssuesMapRef.current = issues;
    }
  }, [issues]);

  useEffect(() => {
    if (!owner || !repo || issues.size === 0) {
      return;
    }

    const toFetch: Issue[] = [];
    const maxPerBatch = 10;

    for (const issue of issues.values()) {
      const cacheKey = `${owner}/${repo}#${issue.number}`;

      // Check if development data has been fetched (not just defined as empty arrays)
      const hasLoadedDevelopmentData =
        (typeof issue.linkedBranches !== "undefined" && issue.linkedBranches !== null) ||
        (typeof issue.linkedPRs !== "undefined" && issue.linkedPRs !== null);

      if (hasLoadedDevelopmentData) {
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

    if (toFetch.length === 0) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      for (const issue of toFetch) {
        if (cancelled) break;
        try {
          await refreshIssueLinks(owner, repo, issue.number);
        } catch (error) {
          console.error(
            `[DEV LOADER] ❌ Failed to fetch development info for issue #${issue.number}`,
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
