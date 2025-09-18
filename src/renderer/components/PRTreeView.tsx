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
} from "lucide-react";
import { cn } from "../utils/cn";
import { AgentIcon } from "./AgentIcon";
import type { PullRequest } from "../services/github";
import type { GroupByType, PRWithMetadata } from "../types/prList";

interface TreeData {
  type: "agent" | "task" | "pr";
  pr?: PullRequest;
  agent?: string;
  count?: number;
}

const getPRId = (pr: PullRequest) =>
  `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;

// Build tree data similar to sidebar pattern
function buildTreeItems(
  prsWithMetadata: PRWithMetadata[],
  groupBy: GroupByType
): Record<TreeItemIndex, TreeItem<TreeData>> {
  const items: Record<TreeItemIndex, TreeItem<TreeData>> = {
    root: {
      index: "root",
      isFolder: true,
      children: [],
      data: { type: "agent" },
    },
  };

  if (groupBy === "none") {
    // No grouping - just add all PRs as direct children
    prsWithMetadata.forEach((item) => {
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
    });
    return items;
  }

  // Group by agent first (Author level)
  const agentGroups: Record<string, PRWithMetadata[]> = {};

  prsWithMetadata.forEach((item) => {
    const agent = item.agent;
    if (!agentGroups[agent]) {
      agentGroups[agent] = [];
    }
    agentGroups[agent].push(item);
  });

  for (const agentName in agentGroups) {
    const agentKey = `agent-${agentName}`;
    items[agentKey] = {
      index: agentKey,
      isFolder: true,
      children: [],
      data: {
        type: "agent",
        agent: agentName,
        count: agentGroups[agentName].length,
      },
    };
    (items.root.children as TreeItemIndex[]).push(agentKey);

    // Group by task/prompt within each agent
    const taskGroups: Record<string, PRWithMetadata[]> = {};
    agentGroups[agentName].forEach((item) => {
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
        const taskKey = `${agentKey}-task-${prefix}`;
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
        // Single PR - add directly under agent
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
        (items[agentKey].children as TreeItemIndex[]).push(prKey);
      }
    }
  }

  return items;
}

interface PRTreeViewProps {
  theme: "light" | "dark";
  groupBy: GroupByType;
  prsWithMetadata: PRWithMetadata[];
  selectedPRs: Set<string>;
  onTogglePRSelection: (prId: string, checked: boolean) => void;
  onToggleGroupSelection: (prIds: string[], checked: boolean) => void;
  onPRClick: (pr: PullRequest) => void;
}

export function PRTreeView({
  theme,
  groupBy,
  prsWithMetadata,
  selectedPRs,
  onTogglePRSelection,
  onToggleGroupSelection,
  onPRClick,
}: PRTreeViewProps) {
  const treeItems = useMemo(
    () => buildTreeItems(prsWithMetadata, groupBy),
    [prsWithMetadata, groupBy]
  );

  const treeDataProvider = useMemo(
    () => new StaticTreeDataProvider<TreeData>(treeItems),
    [treeItems]
  );

  return (
    <div className={cn(
      "flex-1 overflow-y-auto",
      theme === "dark" && "[&_.rct-tree-item-arrow]:text-gray-400"
    )}>
      <UncontrolledTreeEnvironment
        dataProvider={treeDataProvider}
        getItemTitle={(item) => {
          if (item.data.type === "agent" && item.data.agent) {
            const agentName = item.data.agent;
            return agentName === "manual" ? "Manual PRs" : agentName;
          }

          if (item.data.type === "task") {
            const prefix = (item.index as string).split("-task-").slice(1).join("-task-");
            return prefix;
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
          const agentName = item.data.type === "agent" ? item.data.agent : undefined;
          
          // Check if this is a selected PR
          const isSelected = item.data.type === "pr" && item.data.pr ? selectedPRs.has(getPRId(item.data.pr)) : false;
          
          // Check if this is a group with all children selected
          let isGroupFullySelected = false;
          let isGroupPartiallySelected = false;
          if (item.data.type === "agent" || item.data.type === "task") {
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
            isGroupFullySelected = prIds.length > 0 && prIds.every(id => selectedPRs.has(id));
            isGroupPartiallySelected = !isGroupFullySelected && prIds.some(id => selectedPRs.has(id));
          }

          const handleClick = (e: React.MouseEvent) => {
            if (item.data.type === "pr" && item.data.pr) {
              if (e.metaKey || e.ctrlKey) {
                // Multi-select mode
                e.preventDefault();
                e.stopPropagation();
                onTogglePRSelection(getPRId(item.data.pr), !isSelected);
              }
            } else if (item.data.type === "agent" || item.data.type === "task") {
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
                theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-100",
                item.data.type === "pr" && "text-sm",
                item.data.type === "task" && "text-sm",
                // Selection states
                isSelected && (theme === "dark" ? "bg-gray-700" : "bg-blue-50"),
                isGroupFullySelected && (theme === "dark" ? "bg-gray-700" : "bg-blue-50"),
                isGroupPartiallySelected && (theme === "dark" ? "bg-gray-800/50" : "bg-blue-50/50")
              )}
              onClick={handleClick}
            >
              {item.isFolder ? (
                (rest as any).arrow
              ) : (
                <span
                  className={cn(
                    "mr-2",
                    item.data.pr?.state === "open"
                      ? "text-green-400"
                      : item.data.pr?.merged
                        ? "text-purple-400"
                        : "text-gray-400"
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
              )}


              {agentName && (
                <AgentIcon
                  agentName={agentName}
                  className="mr-2"
                />
              )}

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
                        theme === "dark" ? "text-gray-500" : "text-gray-600"
                      )}
                    >
                      {item.data.pr.changed_files} file{item.data.pr.changed_files !== 1 ? "s" : ""}
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