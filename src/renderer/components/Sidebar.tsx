import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  GitPullRequest,
  GitBranch,
  Settings,
  // Terminal, // TODO: Re-enable terminal tab when ready
  Filter,
  Plus,
  FolderOpen,
  Bot,
  User,
  AlertCircle,
  X,
  GitPullRequestDraft,
  GitMerge,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
  TreeItem,
  TreeItemIndex,
} from "react-complex-tree";
import "react-complex-tree/lib/style-modern.css";
import { cn } from "../utils/cn";
import { usePRStore, PRFilterType } from "../stores/prStore";
import { useIssueStore } from "../stores/issueStore";
import { useUIStore } from "../stores/uiStore";
import Dropdown, { DropdownOption } from "./Dropdown";

interface SidebarProps {
  className?: string;
  width?: number;
  onWidthChange?: (width: number) => void;
}

type TreeData = {
  type: "agent" | "task" | "pr";
  pr?: any;
  count?: number;
};

export default function Sidebar({
  className,
  width = 256,
  onWidthChange,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { statusFilters, setFilter, pullRequests } = usePRStore();
  const {
    issues,
    filters: issueFilters,
    setFilter: setIssueFilter,
    resetFilters: resetIssueFilters,
  } = useIssueStore();
  const { theme, setSidebarWidth, prNavigationState } = useUIStore();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Extract agent from PR (e.g., "cursor" from branch name or title)
  const getAgentFromPR = useCallback((pr: any): string => {
    const branchName = pr.head?.ref || "";
    const agentMatch = branchName.match(/^([^/]+)\//);
    if (agentMatch) {
      return agentMatch[1];
    }

    const titleLower = pr.title.toLowerCase();
    if (titleLower.includes("cursor") || branchName.includes("cursor")) {
      return "cursor";
    }

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

  // Extract common prefix from PR title for sub-grouping
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

  const treeItems = useMemo(() => {
    let prs = Array.from(pullRequests.values());

    // Apply filters
    if (statusFilters.length > 0) {
      prs = prs.filter((pr) => {
        return statusFilters.some((filter) => {
          switch (filter) {
            case "open":
              return pr.state === "open" && !pr.draft;
            case "draft":
              return !!pr.draft;
            case "review-requested":
              return (
                pr.requested_reviewers && pr.requested_reviewers.length > 0
              );
            case "merged":
              return !!pr.merged;
            case "closed":
              return pr.state === "closed" && !pr.merged;
            default:
              return false;
          }
        });
      });
    }

    const items: Record<TreeItemIndex, TreeItem<TreeData>> = {
      root: {
        index: "root",
        isFolder: true,
        children: [],
        data: { type: "agent" },
      },
    };

    const agentGroups: Record<string, any[]> = {};

    prs.forEach((pr) => {
      const agent = getAgentFromPR(pr);
      if (!agentGroups[agent]) {
        agentGroups[agent] = [];
      }
      agentGroups[agent].push(pr);
    });

    for (const agentName in agentGroups) {
      const agentKey = `agent-${agentName}`;
      items[agentKey] = {
        index: agentKey,
        isFolder: true,
        children: [],
        data: {
          type: "agent",
          count: agentGroups[agentName].length,
        },
      };
      (items.root.children as TreeItemIndex[]).push(agentKey);

      const taskGroups: Record<string, any[]> = {};
      agentGroups[agentName].forEach((pr) => {
        const prefix = getTitlePrefix(pr.title);
        if (!taskGroups[prefix]) {
          taskGroups[prefix] = [];
        }
        taskGroups[prefix].push(pr);
      });

      for (const prefix in taskGroups) {
        const taskPRs = taskGroups[prefix];
        if (taskPRs.length > 1) {
          const taskKey = `${agentKey}-${prefix}`;
          items[taskKey] = {
            index: taskKey,
            isFolder: true,
            children: [],
            data: {
              type: "task",
              count: taskPRs.length,
            },
          };
          (items[agentKey].children as TreeItemIndex[]).push(taskKey);

          taskPRs.forEach((pr) => {
            const prKey = `pr-${pr.id}`;
            items[prKey] = {
              index: prKey,
              children: [],
              data: {
                type: "pr",
                pr,
              },
            };
            (items[taskKey].children as TreeItemIndex[]).push(prKey);
          });
        } else {
          const pr = taskPRs[0];
          const prKey = `pr-${pr.id}`;
          items[prKey] = {
            index: prKey,
            children: [],
            data: {
              type: "pr",
              pr,
            },
          };
          (items[agentKey].children as TreeItemIndex[]).push(prKey);
        }
      }
    }

    return items;
  }, [pullRequests, statusFilters, getAgentFromPR, getTitlePrefix]);

  const treeDataProvider: StaticTreeDataProvider<TreeData> = useMemo(() => {
    return new StaticTreeDataProvider<TreeData>(treeItems);
  }, [treeItems]);

  const handlePRClick = (pr: any) => {
    navigate(
      `/pulls/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`,
    );
  };

  // Extract available labels and assignees from issues
  const { availableLabels, availableAssignees } = useMemo(() => {
    const labelsMap = new Map<string, { name: string; color: string }>();
    const assigneesMap = new Map<
      string,
      { login: string; avatar_url: string }
    >();

    issues.forEach((issue) => {
      issue.labels.forEach((label) => {
        if (!labelsMap.has(label.name)) {
          labelsMap.set(label.name, label);
        }
      });

      issue.assignees.forEach((assignee) => {
        if (!assigneesMap.has(assignee.login)) {
          assigneesMap.set(assignee.login, assignee);
        }
      });
    });

    return {
      availableLabels: Array.from(labelsMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      availableAssignees: Array.from(assigneesMap.values()).sort((a, b) =>
        a.login.localeCompare(b.login),
      ),
    };
  }, [issues]);

  const toggleLabel = (labelName: string) => {
    setIssueFilter(
      "labels",
      issueFilters.labels.includes(labelName)
        ? issueFilters.labels.filter((l) => l !== labelName)
        : [...issueFilters.labels, labelName],
    );
  };

  // Create dropdown options for labels
  const labelDropdownOptions = useMemo((): DropdownOption[] => {
    if (availableLabels.length === 0) {
      return [{ value: "none", label: "No labels available" }];
    }
    return [
      { value: "manage", label: "Manage labels..." },
      ...availableLabels.map((label) => ({
        value: label.name,
        label: label.name,
        icon: (
          <span
            className="w-3 h-3 rounded inline-block"
            style={{ backgroundColor: `#${label.color}` }}
          />
        ),
      })),
    ];
  }, [availableLabels]);

  const handleLabelDropdownChange = (value: string) => {
    if (value === "manage" || value === "none") {
      return; // Do nothing for these special values
    }
    toggleLabel(value);
  };

  // Create dropdown options for assignees
  const assigneeDropdownOptions = useMemo((): DropdownOption[] => {
    const baseOptions: DropdownOption[] = [
      { value: "all", label: "All Issues" },
      { value: "assigned", label: "Assigned" },
      { value: "unassigned", label: "Unassigned" },
    ];

    if (availableAssignees.length > 0) {
      const assigneeOptions = availableAssignees.map((assignee) => ({
        value: assignee.login,
        label: assignee.login,
        icon: (
          <img
            src={assignee.avatar_url}
            alt={assignee.login}
            className="w-4 h-4 rounded-full"
          />
        ),
      }));
      return [...baseOptions, ...assigneeOptions];
    }

    return baseOptions;
  }, [availableAssignees]);

  const navItems = [
    { path: "/pulls", icon: GitPullRequest, label: "Pull Requests" },
    { path: "/issues", icon: AlertCircle, label: "Issues" },
    { path: "/branches", icon: GitBranch, label: "Branches" },
    { path: "/settings", icon: Settings, label: "Settings" },
    // TODO: Re-enable terminal tab when ready
    // { path: '/terminal', icon: Terminal, label: 'Terminal' },
  ];

  // Calculate real counts from actual PR data
  const prArray = Array.from(pullRequests.values());
  const prFilters: { id: PRFilterType; label: string; count: number }[] = [
    {
      id: "open",
      label: "Open",
      count: prArray.filter((pr) => pr.state === "open" && !pr.draft).length,
    },
    {
      id: "draft",
      label: "Drafts",
      count: prArray.filter((pr) => pr.draft).length,
    },
    {
      id: "review-requested",
      label: "Review Requested",
      count: prArray.filter(
        (pr) => pr.requested_reviewers && pr.requested_reviewers.length > 0,
      ).length,
    },
    {
      id: "merged",
      label: "Merged",
      count: prArray.filter((pr) => pr.merged).length,
    },
    {
      id: "closed",
      label: "Closed",
      count: prArray.filter((pr) => pr.state === "closed" && !pr.merged).length,
    },
  ];

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.min(
        Math.max(startWidthRef.current + deltaX, 200),
        500,
      );

      if (onWidthChange) {
        onWidthChange(newWidth);
      }
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, onWidthChange, setSidebarWidth]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  // Don't render anything when width is 0 (sidebar hidden)
  if (width === 0) {
    return null;
  }

  return (
    <aside
      ref={sidebarRef}
      className={cn("relative", className)}
      style={{ width: `${width}px` }}
    >
      <div
        className={cn(
          "flex flex-col h-full overflow-hidden border-r",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-gray-50 border-gray-200",
        )}
      >
        {/* Search */}
        {/* TODO: Re-enable search when ready */}
        {/* <div className={cn(
        "p-4 border-b",
        theme === 'dark' ? "border-gray-700" : "border-gray-200"
      )}>
        <div className="relative">
          <Search className={cn(
            "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4",
            theme === 'dark' ? "text-gray-500" : "text-gray-400"
          )} />
          <input
            type="text"
            placeholder="Search PRs..."
            className={cn(
              "pl-10 w-full px-3 py-2 rounded-md text-sm ",
              theme === 'dark'
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-400 border"
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div> */}

        {/* Navigation */}
        <nav className="p-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn("sidebar-item", {
                    active: isActive,
                  })
                }
              >
                <item.icon className="w-4 h-4 mr-3" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Issue Filters - Only show when on Issues view */}
        {location.pathname.startsWith("/issues") && (
          <>
            <div
              className={cn(
                "px-4 py-2 border-t",
                theme === "dark" ? "border-gray-700" : "border-gray-200",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h3
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Filters
                </h3>
                {(issueFilters.status !== "all" ||
                  issueFilters.labels.length > 0 ||
                  issueFilters.assignee !== "all") && (
                    <button
                      onClick={resetIssueFilters}
                      className={cn(
                        "text-xs px-2 py-1 rounded",
                        theme === "dark"
                          ? "text-gray-400 hover:text-white hover:bg-gray-800"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                      )}
                    >
                      Reset
                    </button>
                  )}
              </div>

              <div className="space-y-3">
                {/* Status Filter */}
                <div>
                  <label
                    className={cn(
                      "block text-xs font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Status
                  </label>
                  <div className="space-y-1">
                    {["all", "open", "closed"].map((status) => (
                      <label key={status} className="flex items-center">
                        <input
                          type="radio"
                          name="issue-status"
                          value={status}
                          checked={issueFilters.status === status}
                          onChange={(e) =>
                            setIssueFilter("status", e.target.value as any)
                          }
                          className="mr-2"
                        />
                        <span
                          className={cn(
                            "text-sm capitalize",
                            theme === "dark"
                              ? "text-gray-300"
                              : "text-gray-700",
                          )}
                        >
                          {status === "all" ? "All Issues" : status}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Labels Filter */}
                <div>
                  <label
                    className={cn(
                      "block text-xs font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Labels
                  </label>
                  <Dropdown
                    options={labelDropdownOptions}
                    value={issueFilters.labels.length > 0 ? "manage" : "manage"}
                    onChange={handleLabelDropdownChange}
                    buttonClassName="text-xs"
                    menuClassName="max-h-48 overflow-y-auto"
                    labelPrefix={
                      issueFilters.labels.length > 0
                        ? `${issueFilters.labels.length} selected`
                        : "Select labels"
                    }
                  />

                  {issueFilters.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {issueFilters.labels.map((labelName) => {
                        const label = availableLabels.find(
                          (l) => l.name === labelName,
                        );
                        return label ? (
                          <span
                            key={labelName}
                            className="inline-flex items-center px-1 py-0.5 text-xs rounded"
                            style={{
                              backgroundColor: `#${label.color}30`,
                              color: `#${label.color}`,
                            }}
                          >
                            {labelName}
                            <button
                              onClick={() => toggleLabel(labelName)}
                              className="ml-1 hover:opacity-70"
                            >
                              <X className="w-2 h-2" />
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Assignee Filter */}
                <div>
                  <label
                    className={cn(
                      "block text-xs font-medium mb-1",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    Assignee
                  </label>
                  <Dropdown
                    options={assigneeDropdownOptions}
                    value={issueFilters.assignee}
                    onChange={(value) => setIssueFilter("assignee", value)}
                    buttonClassName="text-xs"
                    menuClassName="max-h-48 overflow-y-auto"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* PR Navigation Tabs - Show when inside a PR detail view with siblings */}
        {location.pathname.match(/^\/pulls\/[^\/]+\/[^\/]+\/\d+$/) &&
          prNavigationState?.siblingPRs &&
          prNavigationState.siblingPRs.length > 1 && (
            <div
              className={cn(
                "px-4 py-2 border-t",
                theme === "dark" ? "border-gray-700" : "border-gray-200",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h3
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  {prNavigationState.currentTaskGroup || "Related PRs"} (
                  {prNavigationState.siblingPRs.length})
                </h3>
              </div>
              <div className="space-y-1">
                {prNavigationState.siblingPRs.map((siblingPR) => {
                  const isCurrentPR =
                    siblingPR.number.toString() ===
                    prNavigationState.currentPRNumber;
                  const isPROpen =
                    siblingPR.state === "open" && !siblingPR.merged;
                  const isPRDraft = siblingPR.draft;
                  const isPRMerged = siblingPR.merged;

                  return (
                    <div
                      key={siblingPR.id}
                      onClick={() => {
                        if (!isCurrentPR) {
                          const pathParts = location.pathname.split("/");
                          const owner = pathParts[2];
                          const repo = pathParts[3];
                          navigate(
                            `/pulls/${owner}/${repo}/${siblingPR.number}`,
                            {
                              state: prNavigationState,
                            },
                          );
                        }
                      }}
                      className={cn(
                        "px-3 py-2 rounded flex items-center space-x-2 cursor-pointer transition-colors",
                        isCurrentPR
                          ? theme === "dark"
                            ? "bg-blue-900/30 border border-blue-700"
                            : "bg-blue-50 border border-blue-200"
                          : theme === "dark"
                            ? "hover:bg-gray-700"
                            : "hover:bg-gray-100",
                        isCurrentPR && "cursor-default",
                      )}
                    >
                      <div className="flex-shrink-0">
                        {isPRDraft ? (
                          <GitPullRequestDraft className="w-4 h-4 text-gray-400" />
                        ) : isPRMerged ? (
                          <GitMerge className="w-4 h-4 text-purple-400" />
                        ) : isPROpen ? (
                          <GitPullRequest className="w-4 h-4 text-green-400" />
                        ) : (
                          <X className="w-4 h-4 text-red-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              isCurrentPR
                                ? theme === "dark"
                                  ? "text-blue-300"
                                  : "text-blue-700"
                                : theme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-700",
                            )}
                          >
                            #{siblingPR.number}
                          </span>
                          {isCurrentPR && (
                            <span
                              className={cn(
                                "ml-2 text-xs px-1 py-0.5 rounded",
                                theme === "dark"
                                  ? "bg-blue-700 text-blue-200"
                                  : "bg-blue-200 text-blue-800",
                              )}
                            >
                              Current
                            </span>
                          )}
                          {siblingPR.approvalStatus === "approved" && (
                            <CheckCircle2
                              className="w-3 h-3 text-green-500 ml-auto"
                            />
                          )}
                          {siblingPR.approvalStatus === "changes_requested" && (
                            <XCircle
                              className="w-3 h-3 text-red-500 ml-auto"
                            />
                          )}
                        </div>
                        <div
                          className={cn(
                            "text-xs truncate mt-0.5",
                            theme === "dark"
                              ? "text-gray-400"
                              : "text-gray-600",
                          )}
                        >
                          {siblingPR.title}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          {siblingPR.changed_files !== undefined && (
                            <span
                              className={cn(
                                "text-xs",
                                theme === "dark"
                                  ? "text-gray-500"
                                  : "text-gray-600",
                              )}
                            >
                              {siblingPR.changed_files} file
                              {siblingPR.changed_files !== 1 ? "s" : ""}
                            </span>
                          )}
                          {siblingPR.additions !== undefined && (
                            <span className="text-xs text-green-500">
                              +{siblingPR.additions}
                            </span>
                          )}
                          {siblingPR.deletions !== undefined && (
                            <span className="text-xs text-red-500">
                              -{siblingPR.deletions}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* PR Filters - Only show when on PR list view */}
        {location.pathname === "/pulls" && (
          <>
            <div
              className={cn(
                "px-4 py-2 border-t",
                theme === "dark" ? "border-gray-700" : "border-gray-200",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h3
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Filters
                </h3>
                <button
                  className={cn(
                    "",
                    theme === "dark"
                      ? "text-gray-400 hover:text-white"
                      : "text-gray-600 hover:text-gray-900",
                  )}
                >
                  <Filter className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1">
                {prFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setFilter(filter.id)}
                    className={cn("sidebar-item w-full text-left", {
                      active: statusFilters.includes(filter.id),
                    })}
                  >
                    <span className="flex-1">{filter.label}</span>
                    <span
                      className={cn(
                        "text-xs",
                        theme === "dark" ? "text-gray-500" : "text-gray-600",
                      )}
                    >
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* PR Groups */}
            <div
              className={cn(
                "px-4 py-2 border-t flex-1 overflow-y-auto",
                theme === "dark" ? "border-gray-700" : "border-gray-200",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h3
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Groups
                </h3>
                <button
                  className={cn(
                    "",
                    theme === "dark"
                      ? "text-gray-400 hover:text-white"
                      : "text-gray-600 hover:text-gray-900",
                  )}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1">
                <UncontrolledTreeEnvironment
                  dataProvider={treeDataProvider}
                  getItemTitle={(item) => {
                    if (item.data.type === "agent") {
                      const agentName = (item.index as string).replace(
                        "agent-",
                        "",
                      );
                      return agentName === "manual" ? "Manual PRs" : agentName;
                    }
                    if (item.data.type === "task") {
                      const prefix = (item.index as string)
                        .split("-")
                        .slice(2)
                        .join("-");
                      return prefix;
                    }
                    if (item.data.type === "pr" && item.data.pr) {
                      return `#${item.data.pr.number} ${item.data.pr.title}`;
                    }
                    return "";
                  }}
                  viewState={{
                    "pr-groups": {
                      expandedItems: Object.values(treeItems)
                        .filter((item) => item.isFolder)
                        .map((item) => item.index),
                    },
                  }}
                  onPrimaryAction={(item) => {
                    if (item.data.type === "pr" && item.data.pr) {
                      handlePRClick(item.data.pr);
                    }
                  }}
                  renderItemTitle={({ title, item, ...rest }) => (
                    <div
                      className={cn(
                        "flex items-center w-full",
                        item.data.type === "pr" && "text-xs",
                        item.data.type === "task" && "text-xs",
                      )}
                    >
                      {item.isFolder ? (
                        (rest as any).arrow
                      ) : (
                        <span
                          className={cn(
                            "mr-2",
                            item.data.pr?.state === "open"
                              ? "text-green-400"
                              : "text-gray-400",
                          )}
                        >
                          ●
                        </span>
                      )}
                      {item.data.type === "agent" &&
                        (item.index.toString().includes("cursor") ? (
                          <Bot className="w-4 h-4 mr-2 text-purple-400" />
                        ) : (
                          <User className="w-4 h-4 mr-2 text-blue-400" />
                        ))}
                      {item.data.type === "task" && (
                        <FolderOpen className="w-3 h-3 mr-1 text-gray-500" />
                      )}
                      {item.data.type === "pr" && item.data.pr && (
                        <img
                          src={item.data.pr.user.avatar_url}
                          alt={item.data.pr.user.login}
                          className="w-5 h-5 rounded-full mr-2 flex-shrink-0"
                        />
                      )}
                      <span className="flex-1 truncate">{title}</span>
                      {item.data.type === "pr" && item.data.pr && (
                        <div className="flex items-center space-x-2 ml-2">
                          {item.data.pr.changed_files !== undefined && (
                            <span
                              className={cn(
                                "text-xs",
                                theme === "dark"
                                  ? "text-gray-500"
                                  : "text-gray-600",
                              )}
                            >
                              {item.data.pr.changed_files} file
                              {item.data.pr.changed_files !== 1 ? "s" : ""}
                            </span>
                          )}
                          {item.data.pr.additions !== undefined && (
                            <span className="text-xs text-green-500">
                              +{item.data.pr.additions}
                            </span>
                          )}
                          {item.data.pr.deletions !== undefined && (
                            <span className="text-xs text-red-500">
                              -{item.data.pr.deletions}
                            </span>
                          )}
                        </div>
                      )}
                      {item.data.count && (
                        <span
                          className={cn(
                            "text-xs",
                            theme === "dark"
                              ? "text-gray-500"
                              : "text-gray-600",
                          )}
                        >
                          ({item.data.count})
                        </span>
                      )}
                    </div>
                  )}
                >
                  <Tree treeId="pr-groups" rootItem="root" />
                </UncontrolledTreeEnvironment>
              </div>
            </div>
          </>
        )}

        {/* Saved Filters */}
        <div
          className={cn(
            "p-4 border-t mt-auto",
            theme === "dark" ? "border-gray-700" : "border-gray-200",
          )}
        >
          <button className="btn btn-secondary w-full text-sm">
            <Plus className="w-4 h-4 mr-2" />
            New Filter
          </button>
        </div>
      </div>

      {/* Resize handle */}
      <div
        className={cn(
          "absolute top-0 right-0 w-1 h-full cursor-col-resize",
          isResizing ? "bg-blue-500" : "",
          !isResizing && theme === "dark" ? "hover:bg-blue-400" : "",
          !isResizing && theme === "light" ? "hover:bg-blue-500" : "",
        )}
        onMouseDown={handleResizeStart}
        style={{
          touchAction: "none",
        }}
      />
    </aside>
  );
}
