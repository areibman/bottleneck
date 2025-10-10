import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GitPullRequest } from "lucide-react";
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

  const sortBy = prListFilters.sortBy;
  const selectedAuthors = useMemo(
    () => new Set(prListFilters.selectedAuthors),
    [prListFilters.selectedAuthors],
  );
  const selectedStatuses = useMemo(
    () => new Set<StatusType>(prListFilters.selectedStatuses),
    [prListFilters.selectedStatuses],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (authorDropdownRef.current && !authorDropdownRef.current.contains(event.target as Node)) {
        setShowAuthorDropdown(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };

    if (showAuthorDropdown || showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAuthorDropdown, showStatusDropdown]);


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


  // Simplified filtering logic - cleaner and more maintainable
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

    // Step 2: Apply filters
    const filteredPRs = repoFilteredPRs.filter((pr) => {
      // Author filter
      const authorMatches = selectedAuthors.size === 0 ||
        selectedAuthors.has("all") ||
        selectedAuthors.has(pr.user.login);

      // Status filter
      const prStatus = getPRStatus(pr);
      const statusMatches = selectedStatuses.size === 0 ||
        selectedStatuses.has(prStatus);

      // Both filters must pass
      return authorMatches && statusMatches;
    });

    // Step 3: Sort PRs
    const sortedPRs = [...filteredPRs].sort((a, b) => {
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
    sortBy,
    selectedRepo,
    getPRStatus,
  ]);

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
            </div>
          )}
        </div>
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
            key={`${Array.from(selectedStatuses).join('-')}-${Array.from(selectedAuthors).join('-')}-${getFilteredPRs.length}`}
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
