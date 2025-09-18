import { useMemo } from "react";
import {
  UncontrolledTreeEnvironment,
  Tree,
  TreeItem,
  TreeItemIndex,
  StaticTreeDataProvider,
} from "react-complex-tree";
import "react-complex-tree/lib/style-modern.css";
import {
  GitPullRequest,
  GitPullRequestDraft,
  GitMerge,
  X,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  FolderOpen,
  FileText,
} from "lucide-react";
import { cn } from "../utils/cn";
import { AgentIcon } from "./AgentIcon";
import type { PullRequest } from "../services/github";
import type { PRWithMetadata, SortByType } from "../types/prList";

interface TreeData {
  type: "task" | "pr";
  pr?: PullRequest;
  taskPrefix?: string;
  count?: number;
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
      const taskKey = `task-${prefix}`;
      items[taskKey] = {
        index: taskKey,
        isFolder: true,
        children: [],
        data: {
          type: "task",
          taskPrefix: prefix,
          count: taskPRs.length,
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
}: PRTreeViewProps) {
  const treeItems = useMemo(
    () => buildTreeItems(prsWithMetadata),
    [prsWithMetadata]
  );

  const treeDataProvider = useMemo(
    () => new StaticTreeDataProvider<TreeData>(treeItems),
    [treeItems]
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <UncontrolledTreeEnvironment
        dataProvider={treeDataProvider}
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
                "flex items-center w-full py-1 px-2 rounded cursor-pointer",
                item.data.type === "pr" && "text-sm",
                item.data.type === "task" && "text-sm"
              )}
              onClick={handleClick}
              style={{
                // Force override any inherited styles from react-complex-tree
                backgroundColor: isSelected
                  ? (theme === "dark" ? "rgb(55 65 81)" : "rgb(239 246 255)")
                  : "transparent",
                color: theme === "dark" ? "rgb(243 244 246)" : "rgb(17 24 39)",
                // Add hover effect via onMouseEnter/onMouseLeave if needed
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = theme === "dark" ? "rgb(31 41 55)" : "rgb(243 244 246)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {item.isFolder ? (
                <>
                  {(rest as any).arrow}
                  <FolderOpen className="w-4 h-4 mr-2 text-gray-500" />
                </>
              ) : (
                <>
                  <span
                    className={cn(
                      "mr-2",
                      item.data.pr?.state === "open"
                        ? "text-green-400"
                        : item.data.pr?.merged
                          ? "text-purple-400"
                          : "text-red-400"
                    )}
                  >
                    {item.data.pr?.draft ? (
                      <GitPullRequestDraft className="w-4 h-4" />
                    ) : item.data.pr?.merged ? (
                      <GitMerge className="w-4 h-4" />
                    ) : item.data.pr?.state === "open" ? (
                      <GitPullRequest className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </span>

                  {item.data.type === "pr" && item.data.pr && (
                    <>
                      <img
                        src={item.data.pr.user.avatar_url}
                        alt={item.data.pr.user.login}
                        className="w-5 h-5 rounded-full mr-2 flex-shrink-0"
                        title={item.data.pr.user.login}
                      />
                      {prAgent && (
                        <div title={prAgent === "manual" ? "Manual PR" : prAgent}>
                          <AgentIcon
                            agentName={prAgent}
                            className="mr-2 flex-shrink-0"
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              <span className="flex-1 truncate">{title}</span>

              {item.data.type === "pr" && item.data.pr && (
                <div className="flex items-center space-x-2 ml-2">
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

                  {/* External link */}
                  <a
                    href={`https://github.com/${item.data.pr.base.repo.owner.login}/${item.data.pr.base.repo.name}/pull/${item.data.pr.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "p-1 rounded transition-colors",
                      theme === "dark"
                        ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                        : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                    )}
                    title="Open in GitHub"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {item.data.count && (
                <span
                  className={cn(
                    "text-xs ml-2",
                    theme === "dark" ? "text-gray-500" : "text-gray-600"
                  )}
                >
                  ({item.data.count})
                </span>
              )}
            </div>
          );
        }}
      >
        <Tree treeId="pr-list-tree" rootItem="root" />
      </UncontrolledTreeEnvironment>
    </div>
  );
}