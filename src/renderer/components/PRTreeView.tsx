import { useMemo, useState } from "react";
import {
  UncontrolledTreeEnvironment,
  Tree,
  TreeItem,
  TreeItemIndex,
  StaticTreeDataProvider,
} from "react-complex-tree";
import "react-complex-tree/lib/style-modern.css";
import "./PRTreeView.css";
import {
  GitPullRequest,
  GitPullRequestArrow,
  GitMerge,
  X,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
} from "lucide-react";
import { cn } from "../utils/cn";
import { getPRIcon, getPRColorClass } from "../utils/prStatus";
import { AgentIcon } from "./AgentIcon";
import type { PullRequest } from "../services/github";
import type { PRWithMetadata, SortByType } from "../types/prList";

interface TreeData {
  type: "task" | "pr";
  pr?: PullRequest;
  taskPrefix?: string;
  taskAgent?: string;
  count?: number;
  isInTaskGroup?: boolean;
  mostRecentDate?: { created: string; updated: string };
  hasMergedPR?: boolean;
  taskPRIds?: string[];
  closablePRIds?: string[];
}

const getPRId = (pr: PullRequest) =>
  `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;

// Build tree data with only task grouping (no agent level)
function buildTreeItems(
  prsWithMetadata: PRWithMetadata[]
): Record<TreeItemIndex, TreeItem<TreeData>> {
  const items: Record<TreeItemIndex, TreeItem<TreeData>> = {
    root: {
      index: "root",
      isFolder: true,
      children: [],
      data: { type: "task" },
    },
  };

  // Group by task/prompt prefix
  const taskGroups: Record<string, PRWithMetadata[]> = {};

  prsWithMetadata.forEach((item) => {
    const prefix = item.titlePrefix;
    if (!taskGroups[prefix]) {
      taskGroups[prefix] = [];
    }
    taskGroups[prefix].push(item);
  });

  for (const prefix in taskGroups) {
    const taskPRs = taskGroups[prefix];

    if (taskPRs.length > 1) {
      // Multiple PRs with same prefix - create task group
      // Get the most common agent in this task group
      const agentCounts = new Map<string, number>();
      taskPRs.forEach(item => {
        const count = agentCounts.get(item.agent) || 0;
        agentCounts.set(item.agent, count + 1);
      });
      const taskAgent = Array.from(agentCounts.entries())
        .sort((a, b) => b[1] - a[1])[0][0];

      // Find the most recent created and updated dates
      let mostRecentCreated = taskPRs[0].pr.created_at;
      let mostRecentUpdated = taskPRs[0].pr.updated_at;

      taskPRs.forEach(item => {
        if (new Date(item.pr.created_at) > new Date(mostRecentCreated)) {
          mostRecentCreated = item.pr.created_at;
        }
        if (new Date(item.pr.updated_at) > new Date(mostRecentUpdated)) {
          mostRecentUpdated = item.pr.updated_at;
        }
      });

      const taskPRIds = taskPRs.map((item) => getPRId(item.pr));
      const closablePRIds = taskPRs
        .filter((item) => item.pr.state === "open" && !item.pr.merged)
        .map((item) => getPRId(item.pr));
      const hasMergedPR = taskPRs.some((item) => item.pr.merged);

      const taskKey = `task-${prefix}`;
      items[taskKey] = {
        index: taskKey,
        isFolder: true,
        children: [],
        data: {
          type: "task",
          taskPrefix: prefix,
          taskAgent: taskAgent,
          count: taskPRs.length,
          mostRecentDate: {
            created: mostRecentCreated,
            updated: mostRecentUpdated,
          },
          taskPRIds,
          closablePRIds,
          hasMergedPR,
        },
      };
      (items.root.children as TreeItemIndex[]).push(taskKey);

      taskPRs.forEach((item) => {
        const prKey = `pr-${item.pr.id}`;
        items[prKey] = {
          index: prKey,
          children: [],
          data: {
            type: "pr",
            pr: item.pr,
            isInTaskGroup: true,
          },
        };
        (items[taskKey].children as TreeItemIndex[]).push(prKey);
      });
    } else {
      // Single PR - add directly under root
      const item = taskPRs[0];
      const prKey = `pr-${item.pr.id}`;
      items[prKey] = {
        index: prKey,
        children: [],
        data: {
          type: "pr",
          pr: item.pr,
          isInTaskGroup: false,
        },
      };
      (items.root.children as TreeItemIndex[]).push(prKey);
    }
  }

  return items;
}

interface PRTreeViewProps {
  theme: "light" | "dark";
  prsWithMetadata: PRWithMetadata[];
  selectedPRs: Set<string>;
  sortBy: SortByType;
  onTogglePRSelection: (prId: string, checked: boolean) => void;
  onToggleGroupSelection: (prIds: string[], checked: boolean) => void;
  onPRClick: (pr: PullRequest) => void;
  onCloseGroup: (prIds: string[]) => void;
}

// Helper function to format date and time
function formatDateTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Format time as HH:MM AM/PM
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // If today, show "Today at HH:MM AM/PM"
  if (diffDays === 0) {
    return `Today at ${timeStr}`;
  }

  // If yesterday, show "Yesterday at HH:MM AM/PM"
  if (diffDays === 1) {
    return `Yesterday at ${timeStr}`;
  }

  // If within this year, show "MMM DD at HH:MM AM/PM"
  if (d.getFullYear() === now.getFullYear()) {
    const dateStr = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    return `${dateStr} at ${timeStr}`;
  }

  // Otherwise show "MMM DD, YYYY at HH:MM AM/PM"
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return `${dateStr} at ${timeStr}`;
}

export function PRTreeView({
  theme,
  prsWithMetadata,
  selectedPRs,
  sortBy,
  onTogglePRSelection,
  onToggleGroupSelection,
  onPRClick,
  onCloseGroup,
}: PRTreeViewProps) {
  const treeItems = useMemo(
    () => buildTreeItems(prsWithMetadata),
    [prsWithMetadata]
  );

  const treeDataProvider = useMemo(
    () => new StaticTreeDataProvider<TreeData>(treeItems),
    [treeItems]
  );

  const [hoveredGroup, setHoveredGroup] = useState<TreeItemIndex | null>(null);

  return (
    <span className="pr-tree-view-container">
      <div className="flex-1 overflow-y-auto">
        <UncontrolledTreeEnvironment
          dataProvider={treeDataProvider}
          renderDepthOffset={24}
          getItemTitle={(item) => {
            if (item.data.type === "task" && item.data.taskPrefix) {
              return item.data.taskPrefix;
            }

            if (item.data.type === "pr" && item.data.pr) {
              return `#${item.data.pr.number} ${item.data.pr.title}`;
            }

            return "";
          }}
          viewState={{
            "pr-list-tree": {
              expandedItems: Object.values(treeItems)
                .filter((item) => item.isFolder)
                .map((item) => item.index),
            },
          }}
          onPrimaryAction={(item) => {
            if (item.data.type === "pr" && item.data.pr) {
              onPRClick(item.data.pr);
            }
          }}
          renderItemTitle={({ title, item, ...rest }) => {
            const isSelected = item.data.type === "pr" && item.data.pr ? selectedPRs.has(getPRId(item.data.pr)) : false;
            // Get agent name from PR metadata
            const prAgent = item.data.type === "pr" && item.data.pr
              ? prsWithMetadata.find(m => m.pr.id === item.data.pr!.id)?.agent
              : undefined;
            const rootChildren = (treeItems.root.children ?? []) as TreeItemIndex[];
            const topLevelIndex = rootChildren.indexOf(item.index);
            const isTopLevel = topLevelIndex !== -1;
            const isFirstTopLevel = topLevelIndex === 0;
            const separatorColor =
              theme === "dark"
                ? "rgba(148, 163, 184, 0.25)"
                : "rgba(148, 163, 184, 0.35)";

            const handleClick = (e: React.MouseEvent) => {
              if (item.data.type === "pr" && item.data.pr) {
                if (e.metaKey || e.ctrlKey) {
                  // Multi-select mode
                  e.preventDefault();
                  e.stopPropagation();
                  onTogglePRSelection(getPRId(item.data.pr), !isSelected);
                }
              } else if (item.data.type === "task") {
                // Group selection on CMD/CTRL click
                if (e.metaKey || e.ctrlKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  // Get all PR IDs in this group
                  const prIds: string[] = [];
                  const collectPRIds = (nodeIndex: TreeItemIndex) => {
                    const node = treeItems[nodeIndex];
                    if (node?.data.type === "pr" && node.data.pr) {
                      prIds.push(getPRId(node.data.pr));
                    }
                    if (node?.children) {
                      node.children.forEach(collectPRIds);
                    }
                  };
                  if (item.children) {
                    item.children.forEach(collectPRIds);
                  }
                  // Toggle all PRs in group
                  const allSelected = prIds.every(id => selectedPRs.has(id));
                  onToggleGroupSelection(prIds, !allSelected);
                }
              }
            };

            return (
              <div
                className={cn(
                  "flex items-center w-full py-1 px-2 cursor-pointer",
                  item.data.type === "pr" && "text-sm",
                  item.data.type === "task" && "text-sm",
                  isTopLevel ? "rounded-none" : "rounded"
                )}
                onClick={handleClick}
                style={{
                  // Force override any inherited styles from react-complex-tree
                  backgroundColor: isSelected
                    ? (theme === "dark" ? "rgb(55 65 81)" : "rgb(239 246 255)")
                    : "transparent",
                  color: theme === "dark" ? "rgb(243 244 246)" : "rgb(17 24 39)",
                  borderTop: isTopLevel && isFirstTopLevel
                    ? `1px solid ${separatorColor}`
                    : undefined,
                  borderBottom: isTopLevel
                    ? `1px solid ${separatorColor}`
                    : undefined,
                  height: "52px", // Fixed height to accommodate two-row layout
                  padding: "8px",
                  // Add hover effect via onMouseEnter/onMouseLeave if needed
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = theme === "dark" ? "rgb(31 41 55)" : "rgb(243 244 246)";
                  }
                  if (item.data.type === "task") {
                    setHoveredGroup(item.index);
                  } else {
                    setHoveredGroup(null);
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                  if (item.data.type === "task") {
                    setHoveredGroup((prev) => (prev === item.index ? null : prev));
                  }
                }}
              >
                {item.isFolder ? (
                  <>
                    {/* Left side: Arrow and Icons */}
                    <div className="flex items-center mr-2">
                      {(rest as any).arrow}
                      <div className="w-5 h-5 mr-2 text-gray-500" />
                      {item.data.taskAgent && item.data.taskAgent !== "unknown" && (
                        <div title={item.data.taskAgent}>
                          <AgentIcon
                            agentName={item.data.taskAgent}
                            className="h-5 w-5 flex-shrink-0"
                          />
                        </div>
                      )}
                    </div>

                    {/* Right side: Two-row column layout */}
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      {/* First row: Task/group title */}
                      <div className="flex items-center">
                        <span className="truncate text-sm font-medium">{title}</span>
                        {item.data.count && (
                          <span
                            className={cn(
                              "ml-2 text-xs",
                              theme === "dark" ? "text-gray-500" : "text-gray-600"
                            )}
                          >
                            ({item.data.count} PRs)
                          </span>
                        )}
                        {item.data.hasMergedPR && (
                          <span title="Group contains a merged pull request">
                            <GitMerge
                              className={cn(
                                "ml-2 w-4 h-4",
                                theme === "dark" ? "text-purple-300" : "text-purple-500"
                              )}
                            />
                          </span>
                        )}
                      </div>

                      {/* Second row: Metadata */}
                      {item.data.mostRecentDate && (
                        <div className="flex items-center space-x-3 mt-0.5">
                          <span
                            className={cn(
                              "text-xs",
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            )}
                            title={sortBy === "created"
                              ? `Most recent created: ${new Date(item.data.mostRecentDate.created).toLocaleString()}`
                              : `Most recent updated: ${new Date(item.data.mostRecentDate.updated).toLocaleString()}`
                            }
                          >
                            {sortBy === "created"
                              ? formatDateTime(item.data.mostRecentDate.created)
                              : formatDateTime(item.data.mostRecentDate.updated)
                            }
                          </span>
                        </div>
                      )}
                    </div>

                    {item.data.closablePRIds && item.data.closablePRIds.length > 0 && hoveredGroup === item.index && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          onCloseGroup(item.data.closablePRIds ?? []);
                          setHoveredGroup(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            onCloseGroup(item.data.closablePRIds ?? []);
                            setHoveredGroup(null);
                          }
                        }}
                        className={cn(
                          "ml-3 px-2 py-1 text-xs font-medium rounded border transition-colors cursor-pointer",
                          theme === "dark"
                            ? "border-red-500/60 text-red-300 hover:bg-red-900/40"
                            : "border-red-400 text-red-600 hover:bg-red-50"
                        )}
                      >
                        Close unmerged PRs?
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Left side: Icons */}
                    <div className="flex items-center mr-2">
                      <span
                        className={cn(
                          "mr-2",
                          item.data.pr ? getPRColorClass(item.data.pr) : "text-gray-400"
                        )}
                      >
                        {(() => {
                          if (!item.data.pr) return <X className="w-5 h-5" />;
                          const Icon = getPRIcon(item.data.pr);
                          // Special case: use GitPullRequestArrow instead of GitPullRequest for open PRs
                          if (Icon === GitPullRequest) {
                            return <GitPullRequestArrow className="w-5 h-5" />;
                          }
                          return <Icon className="w-5 h-5" />;
                        })()}
                      </span>

                      {item.data.type === "pr" && item.data.pr && (
                        <>
                          <img
                            src={item.data.pr.user.avatar_url}
                            alt={item.data.pr.user.login}
                            className="w-6 h-6 rounded-full mr-2 flex-shrink-0"
                            title={item.data.pr.user.login}
                          />
                          {prAgent && prAgent !== "unknown" && !item.data.isInTaskGroup && (
                            <div title={prAgent}>
                              <AgentIcon
                                agentName={prAgent}
                                className="h-5 w-5 flex-shrink-0"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Right side: Two-row column layout */}
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      {/* First row: PR number and title */}
                      <div className="flex items-center">
                        <span className="truncate text-sm">{title}</span>
                      </div>

                      {/* Second row: Metadata */}
                      {item.data.type === "pr" && item.data.pr && (
                        <div className="flex items-center space-x-3 mt-0.5">
                          {/* Date display based on sort */}
                          <span
                            className={cn(
                              "text-xs",
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            )}
                            title={sortBy === "created"
                              ? `Created: ${new Date(item.data.pr.created_at).toLocaleString()}`
                              : `Updated: ${new Date(item.data.pr.updated_at).toLocaleString()}`
                            }
                          >
                            {sortBy === "created"
                              ? formatDateTime(item.data.pr.created_at)
                              : formatDateTime(item.data.pr.updated_at)
                            }
                          </span>

                          {item.data.pr.changed_files !== undefined && (
                            <div className="flex items-center space-x-1">
                              <FileText className={cn(
                                "w-3 h-3",
                                theme === "dark" ? "text-gray-500" : "text-gray-600"
                              )} />
                              <span
                                className={cn(
                                  "text-xs",
                                  theme === "dark" ? "text-gray-500" : "text-gray-600"
                                )}
                              >
                                {item.data.pr.changed_files}
                              </span>
                            </div>
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

                          {/* Review status */}
                          {item.data.pr.state === "open" && !item.data.pr.merged && (
                            <div className="flex items-center">
                              {item.data.pr.approvalStatus === "approved" ? (
                                <div title="Approved">
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                </div>
                              ) : item.data.pr.approvalStatus === "changes_requested" ? (
                                <div title="Changes requested">
                                  <XCircle className="w-3 h-3 text-red-500" />
                                </div>
                              ) : item.data.pr.approvalStatus === "pending" ? (
                                <div title="Review pending">
                                  <Clock className="w-3 h-3 text-yellow-500" />
                                </div>
                              ) : (
                                <div title="No review">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* External link on far right */}
                    {item.data.type === "pr" && item.data.pr && (
                      <a
                        href={`https://github.com/${item.data.pr.base.repo.owner.login}/${item.data.pr.base.repo.name}/pull/${item.data.pr.number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "px-2 py-1 rounded transition-colors ml-2 flex items-center space-x-1",
                          theme === "dark"
                            ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                            : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                        )}
                        title="Open in GitHub"
                      >
                        <span className="text-[10px]">Open in Github</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </>
                )}
              </div>
            );
          }}
        >
          <Tree treeId="pr-list-tree" rootItem="root" />
        </UncontrolledTreeEnvironment>
      </div>
    </span>
  );
}
