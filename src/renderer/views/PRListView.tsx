import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GitPullRequest, Tag, X, Search } from "lucide-react";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { useAuthStore } from "../stores/authStore";
import Dropdown, { DropdownOption } from "../components/Dropdown";
import { detectAgentName } from "../utils/agentIcons";
import { getTitlePrefix } from "../utils/prUtils";
import { getPRStatus, PRStatusType } from "../utils/prStatus";
import { cn } from "../utils/cn";
import WelcomeView from "./WelcomeView";
import { GitHubAPI, PullRequest } from "../services/github";
import { PRTreeView } from "../components/PRTreeView";
import type { SortByType, PRWithMetadata } from "../types/prList";
import { getLabelColors } from "../utils/labelColors";

type StatusType = PRStatusType; // Use the centralized type

const sortOptions: DropdownOption<SortByType>[] = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Recently created" },
];

const statusOptions = [
  { value: "open" as StatusType, label: "Open" },
  { value: "draft" as StatusType, label: "Draft" },
  { value: "merged" as StatusType, label: "Merged" },
  { value: "closed" as StatusType, label: "Closed" },
];

export default function PRListView() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    pullRequests,
    loading,
    selectedRepo,
    fetchPRDetails,
    fetchPullRequests,
    bulkUpdatePRs,
    currentRepoKey,
    pendingRepoKey,
  } = usePRStore();
  const {
    selectedPRs,
    selectPR,
    deselectPR,
    clearSelection,
    theme,
    prListFilters,
    setPRListFilters,
  } = useUIStore();
  const { token } = useAuthStore();
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  const authorDropdownRef = useRef<HTMLDivElement>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const labelDropdownRef = useRef<HTMLDivElement>(null);
  const [labelSearch, setLabelSearch] = useState("");
  const [repoLabels, setRepoLabels] = useState<Array<{ name: string; color: string }>>([]);

  const sortBy = prListFilters.sortBy;
  const selectedAuthors = useMemo(
    () => new Set(prListFilters.selectedAuthors),
    [prListFilters.selectedAuthors],
  );
  const selectedStatuses = useMemo(
    () => new Set<StatusType>(prListFilters.selectedStatuses),
    [prListFilters.selectedStatuses],
  );
  const selectedLabels = useMemo(
    () => new Set(prListFilters.selectedLabels),
    [prListFilters.selectedLabels],
  );
  const labelMode = prListFilters.labelMode;
  const includeNoLabel = prListFilters.includeNoLabel;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (authorDropdownRef.current && !authorDropdownRef.current.contains(event.target as Node)) {
        setShowAuthorDropdown(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(event.target as Node)) {
        setShowLabelDropdown(false);
      }
    };

    if (showAuthorDropdown || showStatusDropdown || showLabelDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAuthorDropdown, showStatusDropdown, showLabelDropdown]);


  // Removed automatic stats fetching - was causing performance issues
  // Stats will be included in the optimized GraphQL query instead

  const selectedRepoKey = useMemo(() => {
    if (!selectedRepo) return null;
    return `${selectedRepo.owner}/${selectedRepo.name}`;
  }, [selectedRepo]);

  // Auto-fetch PRs when we have a selected repo but no matching data
  useEffect(() => {
    if (selectedRepoKey && selectedRepo && !loading && currentRepoKey !== selectedRepoKey) {
      fetchPullRequests(selectedRepo.owner, selectedRepo.name);
    }
  }, [selectedRepoKey, currentRepoKey, loading, selectedRepo, fetchPullRequests]);

  const dataMatchesSelectedRepo = useMemo(() => {
    if (!selectedRepoKey) return false;
    return currentRepoKey === selectedRepoKey;
  }, [currentRepoKey, selectedRepoKey]);

  const showLoadingPlaceholder =
    loading && !dataMatchesSelectedRepo && !!selectedRepoKey;

  const showRefreshingIndicator =
    loading && dataMatchesSelectedRepo && pendingRepoKey === selectedRepoKey;

  // Fetch repository labels
  useEffect(() => {
    const fetchLabels = async () => {
      if (!selectedRepo) {
        setRepoLabels([]);
        return;
      }
      try {
        let authToken = token;
        if (!authToken && typeof window !== "undefined" && window.electron) {
          try {
            authToken = await window.electron.auth.getToken();
          } catch {}
        }
        if (!authToken) return;
        if (authToken === "dev-token") {
          const labelMap = new Map<string, string>();
          Array.from(pullRequests.values()).forEach((pr) => {
            const baseOwner = pr.base?.repo?.owner?.login;
            const baseName = pr.base?.repo?.name;
            if (baseOwner === selectedRepo.owner && baseName === selectedRepo.name) {
              (pr.labels || []).forEach((l: any) => {
                if (l?.name && !labelMap.has(l.name)) labelMap.set(l.name, l.color || "999999");
              });
            }
          });
          setRepoLabels(Array.from(labelMap.entries()).map(([name, color]) => ({ name, color })));
        } else {
          const api = new GitHubAPI(authToken);
          const labels = await api.getRepositoryLabels(selectedRepo.owner, selectedRepo.name);
          setRepoLabels(labels);
        }
      } catch (e) {
        console.error("Failed to fetch repository labels:", e);
      }
    };
    fetchLabels();
  }, [selectedRepo, token, pullRequests]);

  // Function to fetch detailed PR data in the background
  const fetchDetailedPRsInBackground = useCallback(
    (prs: PullRequest[]) => {
      if (!selectedRepo) return;

      const detailPromises = prs.map((pr) =>
        fetchPRDetails(selectedRepo.owner, selectedRepo.name, pr.number, {
          updateStore: false,
        }).catch((error) => {
          console.error(
            `Failed to fetch details for PR #${pr.number}:`,
            error,
          );
          return null;
        }),
      );

      Promise.all(detailPromises).then((results) => {
        const validPRs = results.filter(
          (result): result is PullRequest => result !== null,
        );

        if (validPRs.length > 0) {
          bulkUpdatePRs(validPRs);
        }

        console.log(
          `Successfully fetched details for ${validPRs.length}/${prs.length} sibling PRs`,
        );
      });
    },
    [selectedRepo, fetchPRDetails, bulkUpdatePRs],
  );

  // Extract agent from PR (e.g., "cursor" from branch name or title)
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

  const authors = useMemo(() => {
    const authorMap = new Map<string, { login: string; avatar_url: string }>();
    pullRequests.forEach((pr) => {
      authorMap.set(pr.user.login, pr.user);
    });
    return Array.from(authorMap.values());
  }, [pullRequests]);

  const handleAuthorToggle = useCallback(
    (authorLogin: string) => {
      setPRListFilters(prev => {
        const newSet = new Set(prev.selectedAuthors);
        if (authorLogin === "all") {
          if (newSet.size === 0 || !newSet.has("all")) {
            const allAuthors = new Set([
              "all",
              ...authors.map((author) => author.login),
            ]);
            return {
              ...prev,
              selectedAuthors: Array.from(allAuthors),
            };
          }

          return {
            ...prev,
            selectedAuthors: [],
          };
        }

        if (newSet.has(authorLogin)) {
          newSet.delete(authorLogin);
          newSet.delete("all");
        } else {
          newSet.add(authorLogin);
          if (authors.every((author) => newSet.has(author.login))) {
            newSet.add("all");
          }
        }

        return {
          ...prev,
          selectedAuthors: Array.from(newSet),
        };
      });
    },
    [authors, setPRListFilters],
  );

  // Use the centralized getPRStatus utility
  // No need for useCallback since getPRStatus is a pure function

  const handleStatusToggle = useCallback(
    (status: StatusType | "all") => {
      setPRListFilters(prev => {
        if (status === "all") {
          if (
            prev.selectedStatuses.length === 0 ||
            prev.selectedStatuses.length < statusOptions.length
          ) {
            return {
              ...prev,
              selectedStatuses: statusOptions.map((option) => option.value),
            };
          }

          return {
            ...prev,
            selectedStatuses: [],
          };
        }

        const nextStatuses = new Set<StatusType>(prev.selectedStatuses);
        if (nextStatuses.has(status)) {
          nextStatuses.delete(status);
        } else {
          nextStatuses.add(status);
        }

        return {
          ...prev,
          selectedStatuses: Array.from(nextStatuses),
        };
      });
    },
    [setPRListFilters],
  );

  // Label filter handlers
  const toggleLabel = useCallback((labelName: string) => {
    setPRListFilters(prev => {
      const current = new Set(prev.selectedLabels);
      if (current.has(labelName)) current.delete(labelName); else current.add(labelName);
      return { ...prev, selectedLabels: Array.from(current) };
    });
  }, [setPRListFilters]);

  const clearAllLabels = useCallback(() => {
    setPRListFilters(prev => ({ ...prev, selectedLabels: [], includeNoLabel: false }));
  }, [setPRListFilters]);

  const setLabelModeValue = useCallback((mode: "OR" | "AND" | "NOT" | "ONLY") => {
    setPRListFilters(prev => ({ ...prev, labelMode: mode }));
  }, [setPRListFilters]);

  const toggleIncludeNoLabel = useCallback(() => {
    setPRListFilters(prev => ({ ...prev, includeNoLabel: !prev.includeNoLabel }));
  }, [setPRListFilters]);

  // URL sync: read initial params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const labelsParam = params.get("labels");
    const modeParam = params.get("labelMode");
    const noLabelParam = params.get("noLabel");
    if (labelsParam || modeParam || noLabelParam) {
      setPRListFilters(prev => ({
        ...prev,
        selectedLabels: labelsParam ? labelsParam.split(",").map(decodeURIComponent).filter(Boolean) : prev.selectedLabels,
        labelMode: (modeParam as any) || prev.labelMode,
        includeNoLabel: noLabelParam === "1",
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL sync: write params when filters change
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (prListFilters.selectedLabels.length > 0) {
      params.set("labels", prListFilters.selectedLabels.map(encodeURIComponent).join(","));
    } else {
      params.delete("labels");
    }
    if (prListFilters.labelMode && prListFilters.labelMode !== "OR") {
      params.set("labelMode", prListFilters.labelMode);
    } else {
      params.delete("labelMode");
    }
    if (prListFilters.includeNoLabel) {
      params.set("noLabel", "1");
    } else {
      params.delete("noLabel");
    }
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [prListFilters.selectedLabels, prListFilters.labelMode, prListFilters.includeNoLabel, navigate, location.pathname, location.search]);


  // Filtering logic with author, status, then labels
  const getFilteredPRs = useMemo(() => {
    if (!selectedRepo) {
      return [];
    }

    // Step 1: Filter PRs by repository
    const repoFilteredPRs = Array.from(pullRequests.values()).filter((pr) => {
      const baseOwner = pr.base?.repo?.owner?.login;
      const baseName = pr.base?.repo?.name;
      return baseOwner === selectedRepo.owner && baseName === selectedRepo.name;
    });

    // Step 2: Apply author and status filters
    const authorStatusFilteredPRs = repoFilteredPRs.filter((pr) => {
      const authorMatches = selectedAuthors.size === 0 ||
        selectedAuthors.has("all") ||
        selectedAuthors.has(pr.user.login);

      const prStatus = getPRStatus(pr);
      const statusMatches = selectedStatuses.size === 0 ||
        selectedStatuses.has(prStatus);

      return authorMatches && statusMatches;
    });

    // Step 3: Apply label filters
    const labelFilteredPRs = authorStatusFilteredPRs.filter((pr) => {
      const prLabelNames = new Set<string>((pr.labels || []).map((l: any) => l?.name).filter(Boolean));
      const hasNoLabels = prLabelNames.size === 0;

      if (selectedLabels.size === 0 && !includeNoLabel) return true;

      const hasAnySelected = Array.from(selectedLabels).some((name) => prLabelNames.has(name));
      const hasAllSelected = Array.from(selectedLabels).every((name) => prLabelNames.has(name));
      const isExactMatch = prLabelNames.size === selectedLabels.size && hasAllSelected;

      switch (labelMode) {
        case "OR":
          return (selectedLabels.size > 0 ? hasAnySelected : false) || (includeNoLabel && hasNoLabels);
        case "AND":
          return (selectedLabels.size > 0 ? hasAllSelected : true) || (includeNoLabel && hasNoLabels);
        case "NOT":
          return !hasAnySelected && (!includeNoLabel ? true : hasNoLabels || true);
        case "ONLY":
          if (selectedLabels.size === 0 && includeNoLabel) return hasNoLabels;
          if (selectedLabels.size === 0) return false;
          return isExactMatch || (includeNoLabel && hasNoLabels);
        default:
          return true;
      }
    });

    // Step 4: Sort PRs
    const sortedPRs = [...labelFilteredPRs].sort((a, b) => {
      const aDate = sortBy === "updated"
        ? new Date(a.updated_at).getTime()
        : new Date(a.created_at).getTime();
      const bDate = sortBy === "updated"
        ? new Date(b.updated_at).getTime()
        : new Date(b.created_at).getTime();

      return bDate - aDate; // Descending order (newest first)
    });

    return sortedPRs;
  }, [
    pullRequests,
    selectedAuthors,
    selectedStatuses,
    selectedLabels,
    labelMode,
    includeNoLabel,
    sortBy,
    selectedRepo,
    getPRStatus,
  ]);

  // Compute label counts from author+status filtered pool (before label filter)
  const labelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!selectedRepo) return counts;
    const repoFilteredPRs = Array.from(pullRequests.values()).filter((pr) => {
      const baseOwner = pr.base?.repo?.owner?.login;
      const baseName = pr.base?.repo?.name;
      return baseOwner === selectedRepo.owner && baseName === selectedRepo.name;
    });
    const pool = repoFilteredPRs.filter((pr) => {
      const authorMatches = selectedAuthors.size === 0 || selectedAuthors.has("all") || selectedAuthors.has(pr.user.login);
      const prStatus = getPRStatus(pr);
      const statusMatches = selectedStatuses.size === 0 || selectedStatuses.has(prStatus);
      return authorMatches && statusMatches;
    });
    pool.forEach((pr) => {
      const seen = new Set<string>();
      (pr.labels || []).forEach((l: any) => {
        if (!l?.name || seen.has(l.name)) return;
        seen.add(l.name);
        counts.set(l.name, (counts.get(l.name) || 0) + 1);
      });
    });
    return counts;
  }, [pullRequests, selectedRepo, selectedAuthors, selectedStatuses, getPRStatus]);

  // Pre-compute PR metadata for grouping
  const prsWithMetadata = useMemo<PRWithMetadata[]>(() => {
    return getFilteredPRs.map((pr) => ({
      pr,
      agent: getAgentFromPR(pr),
      titlePrefix: getTitlePrefix(pr.title, pr.head?.ref),
      author: pr.user?.login || "unknown",
      labelNames: pr.labels?.map((label: any) => label.name) || [],
    }));
  }, [getFilteredPRs, getAgentFromPR]);

  const handlePRClick = useCallback(
    (pr: PullRequest) => {
      // Find if this PR belongs to a task subgroup and fetch all siblings
      let navigationState = {};

      const prMetadata = prsWithMetadata.find((item) => item.pr.id === pr.id);
      if (prMetadata) {
        const { titlePrefix } = prMetadata;

        // Find all sibling PRs in the same task group
        const siblingPRs = prsWithMetadata
          .filter((item) => item.titlePrefix === titlePrefix)
          .map((item) => item.pr);

        if (siblingPRs.length > 1) {
          console.log(
            `Fetching detailed data for ${siblingPRs.length} sibling PRs in task: ${titlePrefix}`,
          );

          // Fetch detailed data for all siblings in the background
          fetchDetailedPRsInBackground(siblingPRs);

          // Pass sibling PRs to the detail view via navigation state
          navigationState = {
            siblingPRs: siblingPRs.map((p) => ({
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
            currentTaskGroup: titlePrefix,
          };
        }
      }

      navigate(
        `/pulls/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`,
        { state: navigationState },
      );
    },
    [navigate, prsWithMetadata, fetchDetailedPRsInBackground],
  );

  const handleCheckboxChange = useCallback(
    (prId: string, checked: boolean) => {
      if (checked) {
        selectPR(prId);
      } else {
        deselectPR(prId);
      }
    },
    [selectPR, deselectPR],
  );

  const handleGroupSelection = useCallback(
    (prIds: string[], checked: boolean) => {
      if (checked) {
        prIds.forEach((id) => selectPR(id));
      } else {
        prIds.forEach((id) => deselectPR(id));
      }
    },
    [selectPR, deselectPR],
  );

  const closableSelectedPRIds = useMemo(() => {
    const ids: string[] = [];
    for (const id of selectedPRs) {
      const pr = pullRequests.get(id);
      if (pr && pr.state === "open" && !pr.merged) {
        ids.push(id);
      }
    }
    return ids;
  }, [selectedPRs, pullRequests]);

  const closePRIds = useCallback(
    async (prIds: string[]) => {
      if (isClosing || prIds.length === 0) {
        return;
      }

      const uniqueIds = Array.from(new Set(prIds));
      const closableIds = uniqueIds.filter((id) => {
        const pr = pullRequests.get(id);
        return pr && pr.state === "open" && !pr.merged;
      });

      if (closableIds.length === 0) {
        return;
      }

      let authToken = token;

      if (!authToken && typeof window !== "undefined" && window.electron) {
        try {
          authToken = await window.electron.auth.getToken();
        } catch (error) {
          console.error("Failed to resolve auth token:", error);
        }
      }

      if (!authToken) {
        alert("You need to sign in before closing pull requests.");
        return;
      }

      setIsClosing(true);

      const updatedPRs: PullRequest[] = [];
      const closedIds: string[] = [];
      const errors: string[] = [];

      try {
        if (authToken === "dev-token") {
          const closedAt = new Date().toISOString();
          for (const id of closableIds) {
            const pr = pullRequests.get(id);
            if (!pr) continue;
            updatedPRs.push({
              ...pr,
              state: "closed",
              draft: false,
              merged: false,
              closed_at: closedAt,
            });
            closedIds.push(id);
          }
        } else {
          const api = new GitHubAPI(authToken);
          for (const id of closableIds) {
            const pr = pullRequests.get(id);
            if (!pr) continue;
            try {
              const closedData = await api.closePullRequest(
                pr.base.repo.owner.login,
                pr.base.repo.name,
                pr.number,
              );

              const mergedClosedData: PullRequest = {
                ...pr,
                ...closedData,
                state: "closed" as const,
                draft: false,
                merged: closedData?.merged ?? pr.merged,
                closed_at: closedData?.closed_at ?? new Date().toISOString(),
                // Ensure array fields are always arrays, not null
                assignees: closedData?.assignees ?? pr.assignees ?? [],
                requested_reviewers: closedData?.requested_reviewers ?? pr.requested_reviewers ?? [],
              };

              updatedPRs.push(mergedClosedData);
              closedIds.push(id);
            } catch (error: any) {
              console.error(`Failed to close PR #${pr?.number}:`, error);
              const message =
                error?.response?.data?.message || error?.message || "Unknown error";
              if (pr) {
                errors.push(`PR #${pr.number}: ${message}`);
              } else {
                errors.push(message);
              }
            }
          }
        }

        if (updatedPRs.length > 0) {
          bulkUpdatePRs(updatedPRs);
          closedIds.forEach((id) => deselectPR(id));
        }

        if (errors.length > 0) {
          alert(`Some pull requests could not be closed:\n${errors.join("\n")}`);
        }
      } finally {
        setIsClosing(false);
      }
    },
    [isClosing, pullRequests, token, bulkUpdatePRs, deselectPR],
  );

  const handleCloseSelected = useCallback(async () => {
    await closePRIds(closableSelectedPRIds);
  }, [closePRIds, closableSelectedPRIds]);

  const handleCloseGroup = useCallback(
    async (prIds: string[]) => {
      await closePRIds(prIds);
    },
    [closePRIds],
  );

  const hasSelection = selectedPRs.size > 0;
  const hasClosableSelection = closableSelectedPRIds.length > 0;

  // Show welcome view if no repository is selected
  if (!selectedRepo) {
    return <WelcomeView />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={cn(
          "p-4 border-b",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-gray-50 border-gray-200",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold flex items-center">
              <GitPullRequest className="w-5 h-5 mr-2" />
              Pull Requests
              <span
                className={cn(
                  "ml-2 text-sm",
                  theme === "dark" ? "text-gray-500" : "text-gray-600",
                )}
              >
                ({getFilteredPRs.length})
              </span>
              {showRefreshingIndicator && (
                <span
                  className={cn(
                    "ml-2 text-xs",
                    theme === "dark" ? "text-gray-400" : "text-gray-500",
                  )}
                >
                  Refreshing…
                </span>
              )}
            </h1>
            {/* Selection help text or bulk actions */}
            {hasSelection ? (
              <div className="ml-4 flex items-center space-x-3">
                <span
                  className={cn(
                    "text-sm",
                    theme === "dark" ? "text-gray-300" : "text-gray-600",
                  )}
                >
                  {selectedPRs.size} selected
                </span>

                <button
                  onClick={handleCloseSelected}
                  disabled={!hasClosableSelection || isClosing}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-xs font-medium transition-colors",
                    theme === "dark"
                      ? "text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      : "text-red-600 hover:text-red-700 hover:bg-red-50",
                    (!hasClosableSelection || isClosing) &&
                    "opacity-50 cursor-not-allowed pointer-events-none",
                  )}
                >
                  {isClosing ? "Closing…" : "Close"}
                </button>

                <button
                  onClick={clearSelection}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-xs font-medium transition-colors",
                    theme === "dark"
                      ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                      : "text-gray-600 hover:text-gray-700 hover:bg-gray-100",
                  )}
                >
                  Clear
                </button>
              </div>
            ) : (
              <span
                className={cn(
                  "ml-4 text-xs",
                  theme === "dark" ? "text-gray-500" : "text-gray-600",
                )}
              >
                ⌘/Ctrl+Click to multi-select
              </span>
            )}
          </div>

          {!hasSelection && (
            <div className="flex items-center space-x-2">
              <Dropdown<SortByType>
                options={sortOptions}
                value={sortBy}
                onChange={(value) =>
                  setPRListFilters({ sortBy: value as SortByType })
                }
                labelPrefix="Sort by: "
              />

              {/* Status filter dropdown */}
              <div className="relative" ref={statusDropdownRef}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className={cn(
                    "px-3 py-1.5 rounded border flex items-center space-x-2 text-xs min-w-[120px]",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
                      : "bg-white border-gray-300 hover:bg-gray-100"
                  )}
                >
                  <span>Status:</span>
                  <span className={cn(
                    "truncate",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    {selectedStatuses.size === 0
                      ? "All"
                      : selectedStatuses.size === statusOptions.length
                        ? "All"
                        : `${selectedStatuses.size} selected`}
                  </span>
                </button>

                {showStatusDropdown && (
                  <div
                    className={cn(
                      "absolute top-full mt-1 right-0 z-50 min-w-[150px] rounded-md shadow-lg border",
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700"
                        : "bg-white border-gray-200"
                    )}
                  >
                    <div className="p-2">
                      {/* Select All option */}
                      <label
                        className={cn(
                          "flex items-center space-x-2 p-2 rounded cursor-pointer",
                          theme === "dark"
                            ? "hover:bg-gray-700"
                            : "hover:bg-gray-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStatuses.size === 0 || selectedStatuses.size === statusOptions.length}
                          onChange={() => handleStatusToggle("all")}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">All Statuses</span>
                      </label>

                      <div className={cn(
                        "my-1 border-t",
                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                      )} />

                      {/* Individual status options */}
                      {statusOptions.map(status => (
                        <label
                          key={status.value}
                          className={cn(
                            "flex items-center space-x-2 p-2 rounded cursor-pointer",
                            theme === "dark"
                              ? "hover:bg-gray-700"
                              : "hover:bg-gray-50"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStatuses.has(status.value)}
                            onChange={() => handleStatusToggle(status.value)}
                            className="rounded"
                          />
                          <span className="text-sm">{status.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Author filter with checkbox list */}
              <div className="relative" ref={authorDropdownRef}>
                <button
                  onClick={() => setShowAuthorDropdown(!showAuthorDropdown)}
                  className={cn(
                    "px-3 py-1.5 rounded border flex items-center space-x-2 text-xs min-w-[150px] max-w-[250px]",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
                      : "bg-white border-gray-300 hover:bg-gray-100"
                  )}
                >
                  {selectedAuthors.size === 1 && !selectedAuthors.has("all") ? (
                    <>
                      {(() => {
                        const authorLogin = Array.from(selectedAuthors)[0];
                        const author = authors.find(a => a.login === authorLogin);
                        return author ? (
                          <>
                            <img
                              src={author.avatar_url}
                              alt={author.login}
                              className="w-4 h-4 rounded-full flex-shrink-0"
                            />
                            <span className={cn(
                              "truncate",
                              theme === "dark" ? "text-gray-300" : "text-gray-700"
                            )}>
                              {author.login}
                            </span>
                          </>
                        ) : (
                          <span className={cn(
                            "truncate",
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                          )}>
                            {authorLogin}
                          </span>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      {selectedAuthors.size > 1 && !selectedAuthors.has("all") ? (
                        <>
                          <div className="flex -space-x-2">
                            {Array.from(selectedAuthors)
                              .slice(0, 3)
                              .map(authorLogin => {
                                const author = authors.find(a => a.login === authorLogin);
                                return author ? (
                                  <img
                                    key={author.login}
                                    src={author.avatar_url}
                                    alt={author.login}
                                    className="w-4 h-4 rounded-full border border-gray-800"
                                    style={{
                                      borderColor: theme === "dark" ? "#1f2937" : "#ffffff"
                                    }}
                                  />
                                ) : null;
                              })}
                            {selectedAuthors.size > 3 && (
                              <div className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium border",
                                theme === "dark"
                                  ? "bg-gray-700 text-gray-300 border-gray-800"
                                  : "bg-gray-200 text-gray-700 border-white"
                              )}>
                                +{selectedAuthors.size - 3}
                              </div>
                            )}
                          </div>
                          <span className={cn(
                            "truncate",
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                          )}>
                            {selectedAuthors.size} selected
                          </span>
                        </>
                      ) : (
                        <>
                          <span>Authors:</span>
                          <span className={cn(
                            "truncate",
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                          )}>
                            {selectedAuthors.size === 0 || selectedAuthors.has("all")
                              ? "All"
                              : `${selectedAuthors.size} selected`}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </button>

                {showAuthorDropdown && (
                  <div
                    className={cn(
                      "absolute top-full mt-1 right-0 z-50 min-w-[200px] rounded-md shadow-lg border",
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700"
                        : "bg-white border-gray-200"
                    )}
                  >
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {/* All Authors option */}
                      <label
                        className={cn(
                          "flex items-center space-x-2 p-2 rounded cursor-pointer",
                          theme === "dark"
                            ? "hover:bg-gray-700"
                            : "hover:bg-gray-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAuthors.size === 0 || selectedAuthors.has("all")}
                          onChange={() => handleAuthorToggle("all")}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">All Authors</span>
                      </label>

                      <div className={cn(
                        "my-1 border-t",
                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                      )} />

                      {/* Individual authors */}
                      {authors.map(author => (
                        <label
                          key={author.login}
                          className={cn(
                            "flex items-center space-x-2 p-2 rounded cursor-pointer",
                            theme === "dark"
                              ? "hover:bg-gray-700"
                              : "hover:bg-gray-50"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAuthors.has(author.login)}
                            onChange={() => handleAuthorToggle(author.login)}
                            className="rounded"
                          />
                          <img
                            src={author.avatar_url}
                            alt={author.login}
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-sm">{author.login}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Label filter dropdown */}
              <div className="relative" ref={labelDropdownRef}>
                <button
                  onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                  className={cn(
                    "px-3 py-1.5 rounded border flex items-center space-x-2 text-xs min-w-[160px]",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
                      : "bg-white border-gray-300 hover:bg-gray-100"
                  )}
                >
                  <Tag className={cn("w-3.5 h-3.5", theme === "dark" ? "text-gray-300" : "text-gray-700")} />
                  <span>Labels:</span>
                  <span className={cn(
                    "truncate",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    {selectedLabels.size === 0 && !includeNoLabel
                      ? "All"
                      : `${selectedLabels.size + (includeNoLabel ? 1 : 0)} selected (${labelMode})`}
                  </span>
                </button>

                {showLabelDropdown && (
                  <div
                    className={cn(
                      "absolute top-full mt-1 right-0 z-50 min-w-[300px] max-w-[360px] rounded-md shadow-lg border",
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700"
                        : "bg-white border-gray-200"
                    )}
                  >
                    <div className="p-2 max-h-[380px] overflow-y-auto">
                      {/* Search */}
                      <div className="flex items-center mb-2 px-2 py-1 rounded border"
                        style={{
                          borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                          backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
                        }}
                      >
                        <Search className={cn("w-4 h-4 mr-2", theme === "dark" ? "text-gray-400" : "text-gray-500")} />
                        <input
                          value={labelSearch}
                          onChange={(e) => setLabelSearch(e.target.value)}
                          placeholder="Search labels..."
                          className={cn("flex-1 text-xs outline-none bg-transparent",
                            theme === "dark" ? "text-gray-200 placeholder-gray-400" : "text-gray-800 placeholder-gray-400"
                          )}
                        />
                      </div>

                      {/* Quick Filters */}
                      <div className="mb-2">
                        <div className={cn("text-xs font-semibold mb-1",
                          theme === "dark" ? "text-gray-400" : "text-gray-600")}>Quick Filters</div>
                        {[{name:"bug", icon:"🐛"},{name:"feature", icon:"✨"},{name:"documentation", icon:"📝"},{name:"critical", icon:"🚨"},{name:"needs-review", icon:"👀"}].map((q) => {
                          const found = repoLabels.find(l => l.name.toLowerCase() === q.name.toLowerCase());
                          const color = found?.color || "6b7280";
                          const labelColors = getLabelColors(color, theme);
                          return (
                            <button
                              key={q.name}
                              onClick={() => toggleLabel(found?.name || q.name)}
                              className={cn(
                                "inline-flex items-center px-2 py-1 mr-1 mb-1 rounded text-xs border",
                                selectedLabels.has(found?.name || q.name)
                                  ? (theme === "dark" ? "border-blue-400" : "border-blue-500")
                                  : (theme === "dark" ? "border-gray-700" : "border-gray-200")
                              )}
                              style={{ backgroundColor: labelColors.backgroundColor, color: labelColors.color }}
                            >
                              <span className="mr-1">{q.icon}</span>
                              {found?.name || q.name}
                            </button>
                          );
                        })}
                      </div>

                      <div className={cn("my-2 border-t", theme === "dark" ? "border-gray-700" : "border-gray-200")} />

                      {/* All Labels */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className={cn("text-xs font-semibold",
                            theme === "dark" ? "text-gray-400" : "text-gray-600")}>All Labels ({repoLabels.length})
                          </div>
                          <button onClick={clearAllLabels} className={cn("text-xs",
                            theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900")}>Clear all</button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {repoLabels
                            .filter(l => l.name.toLowerCase().includes(labelSearch.toLowerCase()))
                            .sort((a, b) => {
                              const ca = labelCounts.get(a.name) || 0;
                              const cb = labelCounts.get(b.name) || 0;
                              if (cb !== ca) return cb - ca;
                              return a.name.localeCompare(b.name);
                            })
                            .map((label) => {
                              const labelColors = getLabelColors(label.color, theme);
                              const count = labelCounts.get(label.name) || 0;
                              return (
                                <label
                                  key={label.name}
                                  className={cn(
                                    "flex items-center justify-between p-2 rounded cursor-pointer",
                                    theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"
                                  )}
                                >
                                  <span className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedLabels.has(label.name)}
                                      onChange={() => toggleLabel(label.name)}
                                      className="rounded mr-2"
                                    />
                                    <span
                                      className="w-3 h-3 rounded inline-block mr-2"
                                      style={{ backgroundColor: `#${label.color}` }}
                                    />
                                    <span className="text-sm" style={{ color: labelColors.color }}>{label.name}</span>
                                  </span>
                                  <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>{count}</span>
                                </label>
                              );
                            })}
                        </div>
                      </div>

                      <div className={cn("my-2 border-t", theme === "dark" ? "border-gray-700" : "border-gray-200")} />

                      {/* No Label option */}
                      <label className={cn("flex items-center p-2 rounded cursor-pointer mb-2",
                        theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50")}
                      >
                        <input type="checkbox" className="rounded mr-2" checked={includeNoLabel} onChange={toggleIncludeNoLabel} />
                        <span className="text-sm">PRs without any labels</span>
                      </label>

                      {/* Filter Logic */}
                      <div>
                        <div className={cn("text-xs font-semibold mb-1",
                          theme === "dark" ? "text-gray-400" : "text-gray-600")}>Filter logic</div>
                        {(["OR","AND","NOT","ONLY"] as const).map(m => (
                          <label key={m} className={cn("flex items-center p-2 rounded cursor-pointer",
                            theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50")}
                          >
                            <input type="radio" name="label-mode" className="mr-2" checked={labelMode === m} onChange={() => setLabelModeValue(m)} />
                            <span className="text-sm">{m}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected label chips */}
        {(selectedLabels.size > 0 || includeNoLabel) && (
          <div className="mt-3 flex items-center flex-wrap gap-2">
            {Array.from(selectedLabels).map((name) => {
              const repoLabel = repoLabels.find(l => l.name === name);
              const color = repoLabel?.color || "6b7280";
              const colors = getLabelColors(color, theme);
              return (
                <span key={name} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  style={{ backgroundColor: colors.backgroundColor, color: colors.color }}
                >
                  {name}
                  <button className="ml-1" onClick={() => toggleLabel(name)}>
                    <X className={cn("w-3 h-3", theme === "dark" ? "text-gray-300" : "text-gray-700")} />
                  </button>
                </span>
              );
            })}
            {includeNoLabel && (
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700")}
              >
                No Label
                <button className="ml-1" onClick={toggleIncludeNoLabel}>
                  <X className={cn("w-3 h-3", theme === "dark" ? "text-gray-300" : "text-gray-700")} />
                </button>
              </span>
            )}
            <button onClick={clearAllLabels} className={cn("text-xs underline ml-1",
              theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900")}>Clear all</button>
          </div>
        )}
      </div>

      {/* PR List */}
      <div className="flex-1 overflow-y-auto">
        {showLoadingPlaceholder ? (
          <div className="flex items-center justify-center h-64">
            <div
              className={cn(
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              Loading pull requests...
            </div>
          </div>
        ) : getFilteredPRs.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center h-64",
              theme === "dark" ? "text-gray-400" : "text-gray-600",
            )}
          >
            <GitPullRequest className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No pull requests found</p>
            {selectedRepo ? (
              <p className="text-sm mt-2">No PRs in {selectedRepo.full_name}</p>
            ) : (
              <p className="text-sm mt-2">
                Select a repository to view pull requests
              </p>
            )}
          </div>
        ) : (
          <PRTreeView
            key={`${Array.from(selectedStatuses).join('-')}-${Array.from(selectedAuthors).join('-')}-${Array.from(selectedLabels).join('-')}-${labelMode}-${includeNoLabel}`}
            theme={theme}
            prsWithMetadata={prsWithMetadata}
            selectedPRs={selectedPRs}
            sortBy={sortBy}
            onTogglePRSelection={handleCheckboxChange}
            onToggleGroupSelection={handleGroupSelection}
            onPRClick={handlePRClick}
            onCloseGroup={handleCloseGroup}
          />
        )}
      </div>
    </div>
  );
}
