import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PullRequest } from "../../services/github";
import { usePRStore } from "../../stores/prStore";
import { useUIStore } from "../../stores/uiStore";
import { detectAgentName } from "../../utils/agentIcons";

interface NavigationState {
  siblingPRs?: any[];
  currentTaskGroup?: string;
  currentAgent?: string;
}

export function usePRNavigation(
  owner: string | undefined,
  repo: string | undefined,
  number: string | undefined,
) {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchPullRequests, pullRequests, fetchPRDetails, bulkUpdatePRs } =
    usePRStore();
  const { setPRNavigationState } = useUIStore();

  const [navigationState, setNavigationState] =
    useState<NavigationState | null>(location.state as NavigationState | null);

  const getAgentFromPR = useCallback((pr: PullRequest): string => {
    const branchName = pr.head?.ref || "";
    const labelNames = (pr.labels ?? [])
      .map((label: any) => label?.name)
      .filter(Boolean) as string[];

    const detected = detectAgentName(
      branchName,
      pr.title,
      pr.body,
      pr.user?.login,
      pr.head?.ref,
      ...labelNames,
    );

    if (detected) {
      return detected;
    }

    const hasAILabel = labelNames.some((labelName) =>
      labelName.toLowerCase().includes("ai"),
    );
    if (hasAILabel) {
      return "ai";
    }

    return "unknown";
  }, []);

  const getTitlePrefix = useCallback((title: string): string => {
    const withoutNumber = title.replace(/^#?\d+\s*/, "");
    const colonMatch = withoutNumber.match(/^([^:]+):/);
    if (colonMatch) {
      return colonMatch[1].trim();
    }
    const words = withoutNumber.split(/\s+/);
    const prefixWords = words.slice(0, Math.min(3, words.length));
    return prefixWords.join(" ");
  }, []);

  const fetchSiblingPRs = useCallback(
    async (currentPR: PullRequest) => {
      if (!owner || !repo) return;

      // First ensure we have all PRs for this repo
      await fetchPullRequests(owner, repo);

      // Get all PRs from the store
      const allPRs = Array.from(pullRequests.values()).filter(
        (pr) =>
          pr.base.repo.owner.login === owner && pr.base.repo.name === repo,
      );

      if (allPRs.length === 0) return;

      // Find siblings based on agent and title prefix
      const currentAgent = getAgentFromPR(currentPR);
      const currentPrefix = getTitlePrefix(currentPR.title);

      const siblingPRs = allPRs.filter((pr) => {
        const prAgent = getAgentFromPR(pr);
        const prPrefix = getTitlePrefix(pr.title);
        return prAgent === currentAgent && prPrefix === currentPrefix;
      });

      if (siblingPRs.length > 1) {
        console.log(
          `Found ${siblingPRs.length} sibling PRs for task: ${currentPrefix}`,
        );

        // Fetch detailed data for all siblings in parallel
        const detailPromises = siblingPRs.map((pr) =>
          fetchPRDetails(owner, repo, pr.number, {
            updateStore: false,
          }).catch((error) => {
            console.error(
              `Failed to fetch details for PR #${pr.number}:`,
              error,
            );
            return pr; // Return the basic PR data if fetch fails
          }),
        );

        const detailedPRs = await Promise.all(detailPromises);
        const validPRs = detailedPRs.filter(
          (pr) => pr !== null,
        ) as PullRequest[];

        // Update the navigation state with fetched siblings
        const newNavState = {
          siblingPRs: validPRs.map((p) => ({
            id: p.id,
            number: p.number,
            title: p.title,
            state: p.state,
            draft: p.draft,
            merged: p.merged,
            user: p.user,
            created_at: p.created_at,
            updated_at: p.updated_at,
            approvalStatus: p.approvalStatus,
            additions: p.additions,
            deletions: p.deletions,
            changed_files: p.changed_files,
          })),
          currentTaskGroup: currentPrefix,
          currentAgent: currentAgent,
        };

        setNavigationState(newNavState);

        // Cache the detailed PRs in the store
        if (validPRs.length > 0) {
          bulkUpdatePRs(validPRs);
        }
      }
    },
    [
      owner,
      repo,
      fetchPullRequests,
      pullRequests,
      getAgentFromPR,
      getTitlePrefix,
      fetchPRDetails,
      bulkUpdatePRs,
    ],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we have sibling PRs and not typing in an input
      if (
        !navigationState?.siblingPRs ||
        navigationState.siblingPRs.length <= 1
      )
        return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const currentIndex = navigationState.siblingPRs.findIndex(
        (p) => p.number === parseInt(number || "0"),
      );

      // Alt/Option + Arrow keys for navigation
      if (e.altKey) {
        if (e.key === "ArrowLeft" && currentIndex > 0) {
          e.preventDefault();
          const prevPR = navigationState.siblingPRs[currentIndex - 1];
          navigate(`/pulls/${owner}/${repo}/${prevPR.number}`, {
            state: navigationState,
          });
        } else if (
          e.key === "ArrowRight" &&
          currentIndex < navigationState.siblingPRs.length - 1
        ) {
          e.preventDefault();
          const nextPR = navigationState.siblingPRs[currentIndex + 1];
          navigate(`/pulls/${owner}/${repo}/${nextPR.number}`, {
            state: navigationState,
          });
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigationState, number, owner, repo, navigate]);

  // Update browser history state when navigation state changes
  useEffect(() => {
    if (navigationState?.siblingPRs && navigationState.siblingPRs.length > 1) {
      // Update the current history entry with the navigation state
      window.history.replaceState(
        { ...window.history.state, usr: navigationState },
        "",
      );
    }
  }, [navigationState]);

  // Update UI store with navigation state
  useEffect(() => {
    if (navigationState && number) {
      setPRNavigationState({
        ...navigationState,
        currentPRNumber: number,
      });
    }
    return () => {
      // Clear navigation state when leaving PR detail view
      setPRNavigationState(null);
    };
  }, [navigationState, number, setPRNavigationState]);

  return {
    navigationState,
    setNavigationState,
    fetchSiblingPRs,
  };
}
