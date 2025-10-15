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
  const isFetchingRef = useRef<boolean>(false);

  // Clear cache when repo changes
  useEffect(() => {
    fetchedRef.current.clear();
    lastIssuesMapRef.current = null;
  }, [owner, repo]);

  // Detect if issues Map was replaced (e.g., on fetchIssues) and clean up stale cache entries
  // Note: Only clear cache on repo change, not on every Map update (which happens constantly)
  useEffect(() => {
    if (lastIssuesMapRef.current !== issues && issues.size > 0) {
      // Only clean up if this is actually a different set of issues (different repo)
      // Check by comparing a few issue keys - if they're different, clear cache
      const currentKeys = Array.from(issues.keys()).slice(0, 3).join(',');
      const lastKeys = lastIssuesMapRef.current
        ? Array.from(lastIssuesMapRef.current.keys()).slice(0, 3).join(',')
        : '';

      if (currentKeys !== lastKeys) {
        // Different set of issues (repo changed), clear cache
        console.log('[DEV LOADER] 🔄 Detected repo change, clearing cache');
        fetchedRef.current.clear();
      }

      lastIssuesMapRef.current = issues;
    }
  }, [issues]);

  useEffect(() => {
    if (!owner || !repo || issues.size === 0) {
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    const toFetch: Issue[] = [];
    const maxPerBatch = 10; // Conservative limit to avoid rate limiting

    for (const issue of issues.values()) {
      const cacheKey = `${owner}/${repo}#${issue.number}`;

      // Check if development data has been fetched
      const hasLoadedDevelopmentData =
        (typeof issue.linkedPRs !== "undefined" && issue.linkedPRs !== null);

      if (hasLoadedDevelopmentData) {
        fetchedRef.current.add(cacheKey);
        continue;
      }

      // Skip if already attempted to fetch
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
    isFetchingRef.current = true;

    // RATE LIMIT PROTECTION: Fetch conservatively with delays
    // - Smaller batches (2 at a time)
    // - 300ms delay between batches
    // This prevents rate limiting while still loading reasonably fast
    const load = async () => {
      const batchSize = 2; // Very conservative to avoid rate limits
      const delayBetweenBatches = 300; // ms delay between batches

      console.log(`[DEV LOADER] 📦 Fetching development info for ${toFetch.length} issues in batches of ${batchSize}`);

      for (let i = 0; i < toFetch.length; i += batchSize) {
        if (cancelled) break;

        const batch = toFetch.slice(i, i + batchSize);

        // Fetch batch in parallel
        await Promise.all(
          batch.map(issue =>
            refreshIssueLinks(owner, repo, issue.number).catch(error => {
              console.error(
                `[DEV LOADER] ❌ Failed to fetch development info for issue #${issue.number}`,
                error,
              );
            })
          )
        );

        // Add delay between batches to respect rate limits
        if (i + batchSize < toFetch.length && !cancelled) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      console.log(`[DEV LOADER] ✅ Completed fetching development info`);
      isFetchingRef.current = false;
    };

    load();

    return () => {
      cancelled = true;
      isFetchingRef.current = false;
    };
  }, [owner, repo, issues, refreshIssueLinks]);
}
