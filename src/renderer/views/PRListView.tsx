import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  GitPullRequest,
  GitPullRequestDraft,
  GitMerge,
  X,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Bot,
  User,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import Dropdown, { DropdownOption } from "../components/Dropdown";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../utils/cn";
import WelcomeView from "./WelcomeView";
import { PullRequest } from "../services/github";

const PRItem = React.memo(
  ({
    pr,
    isNested,
    onPRClick,
    onCheckboxChange,
    isSelected,
    theme,
  }: {
    pr: PullRequest;
    isNested?: boolean;
    onPRClick: (pr: PullRequest) => void;
    onCheckboxChange: (prId: string, checked: boolean) => void;
    isSelected: boolean;
    theme: "light" | "dark";
  }) => {
    const prId = `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;

    const handleRowClick = (e: React.MouseEvent) => {
      // If clicking on checkbox or its label area, toggle selection
      const target = e.target as HTMLElement;
      const isCheckboxArea = target.closest(".checkbox-area");

      if (e.metaKey || e.ctrlKey || isCheckboxArea) {
        // Multi-select with cmd/ctrl or clicking checkbox area
        e.stopPropagation();
        onCheckboxChange(prId, !isSelected);
      } else if (e.shiftKey) {
        // Range select with shift (to be implemented)
        e.stopPropagation();
        onCheckboxChange(prId, true);
      }
      // Removed automatic navigation on row click
    };

    const handleContentClick = (e: React.MouseEvent) => {
      // Only navigate if clicking on the content area
      if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.stopPropagation();
        onPRClick(pr);
      }
    };

    return (
      <div
        className={cn(
          "px-4 py-3 select-none",
          theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-100",
          isSelected && (theme === "dark" ? "bg-gray-800" : "bg-gray-100"),
          isNested && "pl-12",
        )}
        onClick={handleRowClick}
      >
        <div className="flex items-center space-x-3">
          {/* Checkbox with larger click area */}
          <div className="checkbox-area flex items-center -ml-2 pl-2 pr-2 py-2 -my-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onCheckboxChange(prId, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-4 h-4 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer",
                theme === "dark"
                  ? "border-gray-600 bg-gray-700 text-blue-500"
                  : "border-gray-300 bg-white text-blue-600",
              )}
            />
          </div>

          {/* PR Icon/Status */}
          <div
            className="flex-shrink-0 flex items-center"
            title={
              pr.draft
                ? "Draft"
                : pr.merged
                  ? "Merged"
                  : pr.state === "open"
                    ? "Open"
                    : "Closed"
            }
          >
            {pr.draft ? (
              <GitPullRequestDraft className="w-5 h-5 text-gray-400" />
            ) : pr.merged ? (
              <GitMerge className="w-5 h-5 text-purple-400" />
            ) : pr.state === "open" ? (
              <GitPullRequest className="w-5 h-5 text-green-400" />
            ) : (
              <X className="w-5 h-5 text-red-400" />
            )}
          </div>

          {/* Author Avatar */}
          <div className="flex-shrink-0 flex items-center">
            <img
              src={pr.user.avatar_url}
              alt={pr.user.login}
              className={cn(
                "w-8 h-8 rounded-full border",
                theme === "dark" ? "border-gray-700" : "border-gray-300",
              )}
              title={`Author: ${pr.user.login}`}
            />
          </div>

          {/* PR Details - Clickable content area */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={handleContentClick}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3
                  className={cn(
                    "text-sm font-medium truncate",
                    theme === "dark" ? "text-white" : "text-gray-900",
                  )}
                >
                  {pr.title}
                  {pr.draft && (
                    <span
                      className={cn(
                        "ml-2 text-xs px-1.5 py-0.5 rounded",
                        theme === "dark"
                          ? "bg-gray-700 text-gray-400"
                          : "bg-gray-200 text-gray-600",
                      )}
                    >
                      Draft
                    </span>
                  )}
                </h3>

                <div
                  className={cn(
                    "flex items-center mt-1 text-xs space-x-3",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  <span>#{pr.number}</span>
                  <span>
                    {formatDistanceToNow(new Date(pr.updated_at), {
                      addSuffix: true,
                    })}
                  </span>
                  {pr.comments > 0 && (
                    <span className="flex items-center">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      {pr.comments}
                    </span>
                  )}
                  {/* File change statistics - Force display for debugging */}
                  <span className="flex items-center space-x-1.5">
                    <span className="text-gray-500">•</span>
                    <span className="flex items-center">
                      <FileText className="w-3 h-3 mr-1" />
                      <span>{pr.changed_files || 0}</span>
                    </span>
                    <span className="text-green-500 font-semibold">
                      +{pr.additions || 0}
                    </span>
                    <span className="text-red-500 font-semibold">
                      −{pr.deletions || 0}
                    </span>
                  </span>
                </div>

                {/* Labels */}
                {pr.labels.length > 0 && (
                  <div className="flex items-center mt-2 space-x-1">
                    {pr.labels.slice(0, 3).map((label: any) => (
                      <span
                        key={label.name}
                        className="px-2 py-0.5 text-xs rounded"
                        style={{
                          backgroundColor: `#${label.color}30`,
                          color: `#${label.color}`,
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                    {pr.labels.length > 3 && (
                      <span
                        className={cn(
                          "text-xs",
                          theme === "dark" ? "text-gray-500" : "text-gray-600",
                        )}
                      >
                        +{pr.labels.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right side info - Not clickable */}
              <div
                className="flex items-center space-x-3 ml-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Approval Status */}
                <div className="flex items-center space-x-2">
                  {pr.state === "open" && !pr.merged && (
                    <div className="flex items-center space-x-1">
                      {pr.approvalStatus === "approved" ? (
                        <div
                          className="flex items-center"
                          title={`Approved by ${pr.approvedBy?.map((r) => r.login).join(", ")}`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span
                            className={cn(
                              "ml-1 text-xs",
                              theme === "dark"
                                ? "text-green-400"
                                : "text-green-600",
                            )}
                          >
                            Approved
                          </span>
                        </div>
                      ) : pr.approvalStatus === "changes_requested" ? (
                        <div
                          className="flex items-center"
                          title={`Changes requested by ${pr.changesRequestedBy?.map((r) => r.login).join(", ")}`}
                        >
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span
                            className={cn(
                              "ml-1 text-xs",
                              theme === "dark"
                                ? "text-red-400"
                                : "text-red-600",
                            )}
                          >
                            Changes
                          </span>
                        </div>
                      ) : pr.approvalStatus === "pending" ? (
                        <div
                          className="flex items-center"
                          title="Review pending"
                        >
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <span
                            className={cn(
                              "ml-1 text-xs",
                              theme === "dark"
                                ? "text-yellow-400"
                                : "text-yellow-600",
                            )}
                          >
                            Pending
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center" title="No reviews">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span
                            className={cn(
                              "ml-1 text-xs",
                              theme === "dark"
                                ? "text-gray-400"
                                : "text-gray-600",
                            )}
                          >
                            No review
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Review status avatars */}
                {pr.requested_reviewers.length > 0 && (
                  <div className="flex -space-x-2">
                    {pr.requested_reviewers.slice(0, 3).map((reviewer: any) => (
                      <img
                        key={reviewer.login}
                        src={reviewer.avatar_url}
                        alt={reviewer.login}
                        className={cn(
                          "w-6 h-6 rounded-full border-2",
                          theme === "dark" ? "border-gray-800" : "border-white",
                        )}
                        title={`Review requested: ${reviewer.login}`}
                      />
                    ))}
                  </div>
                )}

                {/* GitHub Link */}
                <a
                  href={`https://github.com/${pr.base.repo.owner.login}/${pr.base.repo.name}/pull/${pr.number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className={cn(
                    "p-1 rounded transition-colors",
                    theme === "dark"
                      ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                      : "hover:bg-gray-100 text-gray-600 hover:text-gray-900",
                  )}
                  title="Open in GitHub"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                {/* More actions */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    // Handle more actions
                  }}
                  className={cn(
                    "p-1 rounded",
                    theme === "dark"
                      ? "hover:bg-gray-700"
                      : "hover:bg-gray-100",
                  )}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

type SortByType = "updated" | "created" | "title";

const sortOptions: DropdownOption<SortByType>[] = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Recently created" },
  { value: "title", label: "Title" },
];

type GroupByType = "none" | "agent" | "author" | "label";

const groupOptions: DropdownOption<GroupByType>[] = [
  { value: "none", label: "No grouping" },
  { value: "agent", label: "By agent" },
  { value: "author", label: "By author" },
  { value: "label", label: "By label" },
];

export default function PRListView() {
  const navigate = useNavigate();
  const {
    pullRequests,
    filters,
    setFilters,
    loading,
    fetchPullRequests,
    selectedRepo,
    fetchPRDetails,
  } = usePRStore();
  const { selectedPRs, selectPR, deselectPR, clearSelection, theme } =
    useUIStore();
  const [sortBy, setSortBy] = useState<"updated" | "created" | "title">(
    "updated",
  );
  const [groupBy, setGroupBy] = useState<GroupByType>("agent");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  // Function to fetch detailed PR data in the background
  const fetchDetailedPRsInBackground = useCallback(
    async (prs: PullRequest[]) => {
      if (!selectedRepo) return;

      // Fetch details for each PR in parallel
      const detailPromises = prs.map((pr) =>
        fetchPRDetails(selectedRepo.owner, selectedRepo.name, pr.number).catch(
          (error) => {
            console.error(
              `Failed to fetch details for PR #${pr.number}:`,
              error,
            );
            return null;
          },
        ),
      );

      // Execute all fetches in parallel but don't wait for them
      Promise.all(detailPromises).then((results) => {
        const successCount = results.filter((r) => r !== null).length;
        console.log(
          `Successfully fetched details for ${successCount}/${prs.length} sibling PRs`,
        );
      });
    },
    [selectedRepo, fetchPRDetails],
  );

  useEffect(() => {
    // Fetch PRs when the selected repo changes
    // The TopBar also calls fetchPullRequests, but this ensures we always have the right data
    if (selectedRepo) {
      // The store will handle deduplication and clearing old data
      fetchPullRequests(selectedRepo.owner, selectedRepo.name);
    }
  }, [selectedRepo?.id, fetchPullRequests]); // Depend on repo ID and fetchPullRequests

  // Extract agent from PR (e.g., "cursor" from branch name or title)
  const getAgentFromPR = useCallback((pr: PullRequest): string => {
    // Check if branch name starts with an agent prefix (e.g., "cursor/")
    const branchName = pr.head?.ref || "";
    const agentMatch = branchName.match(/^([^/]+)\//);
    if (agentMatch) {
      return agentMatch[1];
    }

    // Check if title contains agent marker
    const titleLower = pr.title.toLowerCase();
    if (titleLower.includes("cursor") || branchName.includes("cursor")) {
      return "cursor";
    }

    // Check for AI-generated label
    const hasAILabel = pr.labels?.some(
      (label: any) =>
        label.name.toLowerCase().includes("ai") ||
        label.name.toLowerCase().includes("cursor"),
    );
    if (hasAILabel) {
      return "cursor";
    }

    return "manual";
  }, []);

  const authors = useMemo(() => {
    const authorMap = new Map<string, { login: string; avatar_url: string }>();
    pullRequests.forEach((pr) => {
      authorMap.set(pr.user.login, pr.user);
    });
    const authorOptions: DropdownOption<string>[] = [
      { value: "all", label: "All Authors" },
      ...Array.from(authorMap.values()).map((author) => ({
        value: author.login,
        label: author.login,
        icon: (
          <img
            src={author.avatar_url}
            alt={author.login}
            className="w-4 h-4 rounded-full"
          />
        ),
      })),
    ];
    return authorOptions;
  }, [pullRequests]);

  const agents = useMemo(() => {
    const agentSet = new Set<string>();
    pullRequests.forEach((pr) => {
      agentSet.add(getAgentFromPR(pr));
    });

    const agentOptions: DropdownOption<string>[] = [
      { value: "all", label: "All Agents" },
      ...Array.from(agentSet).map((agent) => ({
        value: agent,
        label: agent,
      })),
    ];

    return agentOptions;
  }, [pullRequests, getAgentFromPR]);

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
    const dateMap = new Map();
    pullRequests.forEach((pr, key) => {
      dateMap.set(key, {
        updated: new Date(pr.updated_at).getTime(),
        created: new Date(pr.created_at).getTime(),
      });
    });
    return dateMap;
  }, [pullRequests]);

  const getFilteredPRs = useMemo(() => {
    let prs = Array.from(pullRequests.values());

    // Apply filters
    prs = prs.filter((pr) => {
      if (filters.author !== "all" && pr.user.login !== filters.author) {
        return false;
      }
      if (filters.agent !== "all" && getAgentFromPR(pr) !== filters.agent) {
        return false;
      }
      return true;
    });

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
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return prs;
  }, [pullRequests, parsedDates, filters, sortBy, getAgentFromPR]);

  // Pre-compute PR metadata for grouping
  const prsWithMetadata = useMemo(() => {
    return getFilteredPRs.map((pr) => ({
      pr,
      agent: getAgentFromPR(pr),
      titlePrefix: getTitlePrefix(pr.title),
      author: pr.user?.login || "unknown",
      labelNames: pr.labels?.map((label: any) => label.name) || [],
    }));
  }, [getFilteredPRs, getAgentFromPR, getTitlePrefix]);

  // Group PRs by agent and then by title prefix
  const groupedPRs = useMemo(() => {
    if (groupBy === "none") {
      return { ungrouped: prsWithMetadata.map((item) => item.pr) };
    }

    const groups: Record<string, Record<string, any[]>> = {};

    if (groupBy === "agent") {
      // Group by agent first
      prsWithMetadata.forEach(({ pr, agent, titlePrefix }) => {
        if (!groups[agent]) {
          groups[agent] = {};
        }

        // Sub-group by title prefix within agent
        if (!groups[agent][titlePrefix]) {
          groups[agent][titlePrefix] = [];
        }
        groups[agent][titlePrefix].push(pr);
      });
    } else if (groupBy === "author") {
      // Group by author
      prsWithMetadata.forEach(({ pr, author }) => {
        if (!groups[author]) {
          groups[author] = { all: [] };
        }
        groups[author].all.push(pr);
      });
    } else if (groupBy === "label") {
      // Group by labels
      prsWithMetadata.forEach(({ pr, labelNames }) => {
        if (labelNames.length > 0) {
          labelNames.forEach((labelName: string) => {
            if (!groups[labelName]) {
              groups[labelName] = { all: [] };
            }
            groups[labelName].all.push(pr);
          });
        } else {
          if (!groups["unlabeled"]) {
            groups["unlabeled"] = { all: [] };
          }
          groups["unlabeled"].all.push(pr);
        }
      });
    }

    return groups;
  }, [prsWithMetadata, groupBy]);

  const toggleGroup = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  const handlePRClick = useCallback(
    (pr: PullRequest) => {
      // Find if this PR belongs to a task subgroup and fetch all siblings
      let navigationState = {};

      if (groupBy === "agent") {
        const prMetadata = prsWithMetadata.find((item) => item.pr.id === pr.id);
        if (prMetadata) {
          const { agent, titlePrefix } = prMetadata;

          // Find all sibling PRs in the same task group
          const siblingPRs = prsWithMetadata
            .filter(
              (item) =>
                item.agent === agent && item.titlePrefix === titlePrefix,
            )
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
              currentAgent: agent,
            };
          }
        }
      }

      navigate(
        `/pulls/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`,
        { state: navigationState },
      );
    },
    [navigate, groupBy, prsWithMetadata, fetchDetailedPRsInBackground],
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
              {selectedRepo && (
                <span
                  className={cn(
                    "ml-2 text-sm",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  in {selectedRepo.name}
                </span>
              )}
              <span
                className={cn(
                  "ml-2 text-sm",
                  theme === "dark" ? "text-gray-500" : "text-gray-600",
                )}
              >
                ({getFilteredPRs.length})
              </span>
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

          <div className="flex items-center space-x-2">
            <Dropdown<SortByType>
              options={sortOptions}
              value={sortBy}
              onChange={setSortBy}
              labelPrefix="Sort by: "
            />
            <Dropdown<GroupByType>
              options={groupOptions}
              value={groupBy}
              onChange={setGroupBy}
              labelPrefix="Group by: "
            />
            <Dropdown
              options={authors}
              value={filters.author}
              onChange={(value) => setFilters({ author: value })}
              labelPrefix="Author: "
            />
            <Dropdown
              options={agents}
              value={filters.agent}
              onChange={(value) => setFilters({ agent: value })}
              labelPrefix="Agent: "
            />
          </div>
        </div>
      </div>

      {/* PR List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
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
        ) : groupBy === "none" ||
          Object.keys(groupedPRs).includes("ungrouped") ? (
          // No grouping - flat list
          <div
            className={cn(
              "divide-y",
              theme === "dark" ? "divide-gray-700" : "divide-gray-200",
            )}
          >
            {((groupedPRs as any).ungrouped || getFilteredPRs).map(
              (pr: PullRequest) => (
                <PRItem
                  key={pr.id}
                  pr={pr}
                  onPRClick={handlePRClick}
                  onCheckboxChange={handleCheckboxChange}
                  isSelected={selectedPRs.has(
                    `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`,
                  )}
                  theme={theme}
                />
              ),
            )}
          </div>
        ) : (
          // Grouped display
          <div
            className={cn(
              "divide-y",
              theme === "dark" ? "divide-gray-700" : "divide-gray-200",
            )}
          >
            {Object.entries(groupedPRs).map(([agentName, subGroups]) => {
              const agentKey = `agent-${agentName}`;
              const isAgentCollapsed = collapsedGroups.has(agentKey);
              const totalPRs = Object.values(subGroups).reduce(
                (sum: number, prs: any) => sum + prs.length,
                0,
              );

              // Get all PR IDs in this agent group
              const allAgentPRIds: string[] = [];
              Object.values(subGroups).forEach((prs: any) => {
                prs.forEach((pr: any) => {
                  allAgentPRIds.push(
                    `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`,
                  );
                });
              });
              const allAgentSelected = allAgentPRIds.every((id) =>
                selectedPRs.has(id),
              );
              const someAgentSelected = allAgentPRIds.some((id) =>
                selectedPRs.has(id),
              );

              return (
                <div key={agentName}>
                  {/* Agent Group Header */}
                  <div
                    className={cn(
                      "px-4 py-2 flex items-center justify-between",
                      theme === "dark"
                        ? "bg-gray-750 hover:bg-gray-700"
                        : "bg-gray-100 hover:bg-gray-200",
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-0.5 hover:bg-gray-600 rounded"
                        onClick={() => toggleGroup(agentKey)}
                      >
                        {isAgentCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="checkbox"
                        checked={allAgentSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (allAgentSelected) {
                            // Deselect all
                            allAgentPRIds.forEach((id) => deselectPR(id));
                          } else {
                            // Select all
                            allAgentPRIds.forEach((id) => selectPR(id));
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "w-4 h-4 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer",
                          theme === "dark"
                            ? "border-gray-600 bg-gray-700 text-blue-500"
                            : "border-gray-300 bg-white text-blue-600",
                        )}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate =
                              someAgentSelected && !allAgentSelected;
                          }
                        }}
                      />
                      {agentName === "cursor" ? (
                        <Bot className="w-4 h-4 text-purple-400" />
                      ) : (
                        <User className="w-4 h-4 text-blue-400" />
                      )}
                      <span
                        className="font-medium text-sm cursor-pointer"
                        onClick={() => toggleGroup(agentKey)}
                      >
                        {agentName === "ai"
                          ? "AI Generated"
                          : agentName === "manual"
                            ? "Manual PRs"
                            : agentName}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          theme === "dark" ? "text-gray-400" : "text-gray-600",
                        )}
                      >
                        ({totalPRs})
                      </span>
                    </div>
                  </div>

                  {/* Agent Group Content */}
                  {!isAgentCollapsed && (
                    <div>
                      {Object.entries(subGroups).map(([prefix, prefixPRs]) => {
                        const prefixKey = `${agentKey}-${prefix}`;
                        const isPrefixCollapsed =
                          collapsedGroups.has(prefixKey);
                        const hasMultiplePRs = (prefixPRs as any[]).length > 1;

                        if (!hasMultiplePRs || prefix === "all") {
                          // Single PR or no sub-grouping needed
                          return (prefixPRs as any[]).map((pr: any) => (
                            <PRItem
                              key={pr.id}
                              pr={pr}
                              isNested={groupBy === "agent"}
                              onPRClick={handlePRClick}
                              onCheckboxChange={handleCheckboxChange}
                              isSelected={selectedPRs.has(
                                `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`,
                              )}
                              theme={theme}
                            />
                          ));
                        }

                        // Check if all PRs in this group are selected
                        const groupPRIds = (prefixPRs as any[]).map(
                          (pr) =>
                            `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`,
                        );
                        const allSelected = groupPRIds.every((id) =>
                          selectedPRs.has(id),
                        );
                        const someSelected = groupPRIds.some((id) =>
                          selectedPRs.has(id),
                        );

                        return (
                          <div key={prefix}>
                            {/* Prefix Sub-group Header */}
                            <div
                              className={cn(
                                "pl-8 pr-4 py-2 flex items-center justify-between border-l-2",
                                theme === "dark"
                                  ? "bg-gray-800 hover:bg-gray-750 border-gray-600"
                                  : "bg-gray-50 hover:bg-gray-100 border-gray-300",
                              )}
                            >
                              <div className="flex items-center space-x-2">
                                <button
                                  className="p-0.5 hover:bg-gray-600 rounded"
                                  onClick={() => toggleGroup(prefixKey)}
                                >
                                  {isPrefixCollapsed ? (
                                    <ChevronRight className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </button>
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (allSelected) {
                                      // Deselect all
                                      groupPRIds.forEach((id) =>
                                        deselectPR(id),
                                      );
                                    } else {
                                      // Select all
                                      groupPRIds.forEach((id) => selectPR(id));
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className={cn(
                                    "w-4 h-4 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer",
                                    theme === "dark"
                                      ? "border-gray-600 bg-gray-700 text-blue-500"
                                      : "border-gray-300 bg-white text-blue-600",
                                  )}
                                  ref={(el) => {
                                    if (el) {
                                      el.indeterminate =
                                        someSelected && !allSelected;
                                    }
                                  }}
                                />
                                <span
                                  className={cn(
                                    "text-sm cursor-pointer",
                                    theme === "dark"
                                      ? "text-gray-300"
                                      : "text-gray-700",
                                  )}
                                  onClick={() => toggleGroup(prefixKey)}
                                >
                                  {prefix}
                                </span>
                                <span
                                  className={cn(
                                    "text-xs",
                                    theme === "dark"
                                      ? "text-gray-500"
                                      : "text-gray-600",
                                  )}
                                >
                                  ({(prefixPRs as any[]).length})
                                </span>
                              </div>
                            </div>

                            {/* Prefix Sub-group PRs */}
                            {!isPrefixCollapsed && (
                              <div>
                                {(prefixPRs as any[]).map((pr: any) => (
                                  <PRItem
                                    key={pr.id}
                                    pr={pr}
                                    isNested
                                    onPRClick={handlePRClick}
                                    onCheckboxChange={handleCheckboxChange}
                                    isSelected={selectedPRs.has(
                                      `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`,
                                    )}
                                    theme={theme}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
