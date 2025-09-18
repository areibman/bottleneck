import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GitPullRequest } from "lucide-react";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import Dropdown, { DropdownOption } from "../components/Dropdown";
import { detectAgentName } from "../utils/agentIcons";
import { cn } from "../utils/cn";
import WelcomeView from "./WelcomeView";
import { PullRequest } from "../services/github";
import { PRTreeView } from "../components/PRTreeView";
import type { SortByType, PRWithMetadata } from "../types/prList";

const sortOptions: DropdownOption<SortByType>[] = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Recently created" },
];

export default function PRListView() {
  const navigate = useNavigate();
  const {
    pullRequests,
    loading,
    selectedRepo,
    fetchPRDetails,
    bulkUpdatePRs,
    currentRepoKey,
    pendingRepoKey,
  } = usePRStore();
  const { selectedPRs, selectPR, deselectPR, clearSelection, theme } =
    useUIStore();
  const [sortBy, setSortBy] = useState<SortByType>("updated");
  const [selectedAuthors, setSelectedAuthors] = useState<Set<string>>(new Set(["all"]));
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  const authorDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (authorDropdownRef.current && !authorDropdownRef.current.contains(event.target as Node)) {
        setShowAuthorDropdown(false);
      }
    };

    if (showAuthorDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAuthorDropdown]);

  const selectedRepoKey = useMemo(() => {
    if (!selectedRepo) return null;
    return `${selectedRepo.owner}/${selectedRepo.name}`;
  }, [selectedRepo]);

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

    return "manual";
  }, []);

  const authors = useMemo(() => {
    const authorMap = new Map<string, { login: string; avatar_url: string }>();
    pullRequests.forEach((pr) => {
      authorMap.set(pr.user.login, pr.user);
    });
    return Array.from(authorMap.values());
  }, [pullRequests]);

  const handleAuthorToggle = useCallback((authorLogin: string) => {
    setSelectedAuthors(prev => {
      const newSet = new Set(prev);
      if (authorLogin === "all") {
        if (newSet.has("all")) {
          // If "all" is selected and clicked, deselect all
          return new Set();
        } else {
          // Select all
          return new Set(["all", ...authors.map(a => a.login)]);
        }
      } else {
        // Toggle individual author
        if (newSet.has(authorLogin)) {
          newSet.delete(authorLogin);
          newSet.delete("all"); // Remove "all" if deselecting an individual
        } else {
          newSet.add(authorLogin);
          // Check if all authors are now selected
          if (authors.every(a => newSet.has(a.login))) {
            newSet.add("all");
          }
        }
      }
      return newSet;
    });
  }, [authors]);


  // Extract common prefix from PR title for sub-grouping
  const getTitlePrefix = useCallback((title: string): string => {
    // Remove PR number if present (e.g., "#1234 Title" -> "Title")
    const withoutNumber = title.replace(/^#?\d+\s*/, "");

    // Extract prefix before colon or first few words
    const colonMatch = withoutNumber.match(/^([^:]+):/);
    if (colonMatch) {
      return colonMatch[1].trim();
    }

    // Get first 3-4 words as prefix
    const words = withoutNumber.split(/\s+/);
    const prefixWords = words.slice(0, Math.min(3, words.length));
    return prefixWords.join(" ");
  }, []);

  // Cache date parsing in a separate map to avoid modifying objects
  const parsedDates = useMemo(() => {
    const dateMap = new Map<string, { updated: number; created: number }>();

    if (!selectedRepo) {
      return dateMap;
    }

    pullRequests.forEach((pr, key) => {
      const baseOwner = pr.base?.repo?.owner?.login;
      const baseName = pr.base?.repo?.name;

      if (baseOwner === selectedRepo.owner && baseName === selectedRepo.name) {
        dateMap.set(key, {
          updated: new Date(pr.updated_at).getTime(),
          created: new Date(pr.created_at).getTime(),
        });
      }
    });

    return dateMap;
  }, [pullRequests, selectedRepo]);

  const getFilteredPRs = useMemo(() => {
    if (!selectedRepo) {
      return [];
    }

    let prs = Array.from(pullRequests.values()).filter((pr) => {
      const baseOwner = pr.base?.repo?.owner?.login;
      const baseName = pr.base?.repo?.name;
      return (
        baseOwner === selectedRepo.owner && baseName === selectedRepo.name
      );
    });

    // Apply author filter
    if (!selectedAuthors.has("all") && selectedAuthors.size > 0) {
      prs = prs.filter((pr) => selectedAuthors.has(pr.user.login));
    } else if (selectedAuthors.size === 0) {
      // No authors selected, show no PRs
      prs = [];
    }

    // Sort using cached dates from the map
    prs.sort((a, b) => {
      const aKey = `${a.base.repo.owner.login}/${a.base.repo.name}#${a.number}`;
      const bKey = `${b.base.repo.owner.login}/${b.base.repo.name}#${b.number}`;
      const aDates = parsedDates.get(aKey) || { updated: 0, created: 0 };
      const bDates = parsedDates.get(bKey) || { updated: 0, created: 0 };

      switch (sortBy) {
        case "updated":
          return bDates.updated - aDates.updated;
        case "created":
          return bDates.created - aDates.created;
        default:
          return 0;
      }
    });

    return prs;
  }, [
    pullRequests,
    parsedDates,
    selectedAuthors,
    sortBy,
    selectedRepo,
  ]);

  // Pre-compute PR metadata for grouping
  const prsWithMetadata = useMemo<PRWithMetadata[]>(() => {
    return getFilteredPRs.map((pr) => ({
      pr,
      agent: getAgentFromPR(pr),
      titlePrefix: getTitlePrefix(pr.title),
      author: pr.user?.login || "unknown",
      labelNames: pr.labels?.map((label: any) => label.name) || [],
    }));
  }, [getFilteredPRs, getAgentFromPR, getTitlePrefix]);

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

  const handleMergeSelected = useCallback(() => {
    // TODO: Implement merge functionality
    console.log("Merging PRs:", Array.from(selectedPRs));
  }, [selectedPRs]);

  const handleCloseSelected = useCallback(() => {
    // TODO: Implement close functionality
    console.log("Closing PRs:", Array.from(selectedPRs));
  }, [selectedPRs]);

  const hasSelection = selectedPRs.size > 0;

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
                  onClick={handleMergeSelected}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-xs font-medium transition-colors",
                    theme === "dark"
                      ? "text-green-400 hover:text-green-300 hover:bg-green-900/20"
                      : "text-green-600 hover:text-green-700 hover:bg-green-50",
                  )}
                >
                  Merge
                </button>

                <button
                  onClick={handleCloseSelected}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-xs font-medium transition-colors",
                    theme === "dark"
                      ? "text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      : "text-red-600 hover:text-red-700 hover:bg-red-50",
                  )}
                >
                  Close
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
                onChange={setSortBy}
                labelPrefix="Sort by: "
              />

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
                              className="w-5 h-5 rounded-full flex-shrink-0"
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
                                    className="w-5 h-5 rounded-full border-2 border-gray-800"
                                    style={{
                                      borderColor: theme === "dark" ? "#1f2937" : "#ffffff"
                                    }}
                                  />
                                ) : null;
                              })}
                            {selectedAuthors.size > 3 && (
                              <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium border-2",
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
                            {selectedAuthors.has("all")
                              ? "All"
                              : selectedAuthors.size === 0
                                ? "None"
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
                          checked={selectedAuthors.has("all")}
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
            theme={theme}
            prsWithMetadata={prsWithMetadata}
            selectedPRs={selectedPRs}
            sortBy={sortBy}
            onTogglePRSelection={handleCheckboxChange}
            onToggleGroupSelection={handleGroupSelection}
            onPRClick={handlePRClick}
          />
        )}
      </div>
    </div>
  );
}
