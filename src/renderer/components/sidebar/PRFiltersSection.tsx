import { useMemo } from "react";
import { Filter, Plus, FolderOpen } from "lucide-react";
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
  TreeItem,
  TreeItemIndex,
} from "react-complex-tree";
import "react-complex-tree/lib/style-modern.css";
import { cn } from "../../utils/cn";
import { AgentIcon } from "../AgentIcon";
import { detectAgentName } from "../../utils/agentIcons";
import type { PRFilterType } from "../../stores/prStore";

interface PRFiltersSectionProps {
  theme: "light" | "dark";
  statusFilters: PRFilterType[];
  onToggleFilter: (filter: PRFilterType) => void;
  pullRequests: any[];
  onSelectPullRequest: (pullRequest: any) => void;
}

interface TreeData {
  type: "agent" | "task" | "pr";
  pr?: any;
  count?: number;
}

const NAV_FILTERS: Array<{ id: PRFilterType; label: string }> = [
  { id: "open", label: "Open" },
  { id: "draft", label: "Drafts" },
  { id: "review-requested", label: "Review Requested" },
  { id: "merged", label: "Merged" },
  { id: "closed", label: "Closed" },
];

function getAgentFromPR(pr: any): string {
  const branchName = pr.head?.ref || "";
  const labelNames = (pr.labels ?? [])
    .map((label: any) => label?.name)
    .filter(Boolean) as string[];

  const detected = detectAgentName(
    branchName,
    pr.title,
    pr.body,
    pr.user?.login,
    pr.head?.label,
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
}

function getTitlePrefix(title: string): string {
  const withoutNumber = title.replace(/^#?\d+\s*/, "");
  const colonMatch = withoutNumber.match(/^([^:]+):/);
  if (colonMatch) {
    return colonMatch[1].trim();
  }
  const words = withoutNumber.split(/\s+/);
  const prefixWords = words.slice(0, Math.min(3, words.length));
  return prefixWords.join(" ");
}

function buildTreeItems(
  pullRequests: any[],
  statusFilters: PRFilterType[],
): Record<TreeItemIndex, TreeItem<TreeData>> {
  let prs = [...pullRequests];

  if (statusFilters.length > 0) {
    prs = prs.filter((pr) =>
      statusFilters.some((filter) => {
        switch (filter) {
          case "open":
            return pr.state === "open" && !pr.draft;
          case "draft":
            return Boolean(pr.draft);
          case "review-requested":
            return pr.requested_reviewers && pr.requested_reviewers.length > 0;
          case "merged":
            return Boolean(pr.merged);
          case "closed":
            return pr.state === "closed" && !pr.merged;
          default:
            return false;
        }
      }),
    );
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
}

function buildFilterCounts(prs: any[]) {
  return NAV_FILTERS.map(({ id, label }) => {
    const count = prs.filter((pr) => {
      switch (id) {
        case "open":
          return pr.state === "open" && !pr.draft;
        case "draft":
          return Boolean(pr.draft);
        case "review-requested":
          return pr.requested_reviewers && pr.requested_reviewers.length > 0;
        case "merged":
          return Boolean(pr.merged);
        case "closed":
          return pr.state === "closed" && !pr.merged;
        default:
          return false;
      }
    }).length;

    return { id, label, count };
  });
}

export function PRFiltersSection({
  theme,
  statusFilters,
  onToggleFilter,
  pullRequests,
  onSelectPullRequest,
}: PRFiltersSectionProps) {
  const filterStats = useMemo(() => buildFilterCounts(pullRequests), [pullRequests]);

  const treeItems = useMemo(
    () => buildTreeItems(pullRequests, statusFilters),
    [pullRequests, statusFilters],
  );

  const treeDataProvider = useMemo(
    () => new StaticTreeDataProvider<TreeData>(treeItems),
    [treeItems],
  );

  return (
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
              theme === "dark"
                ? "text-gray-400 hover:text-white"
                : "text-gray-600 hover:text-gray-900",
            )}
          >
            <Filter className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-1">
          {filterStats.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onToggleFilter(filter.id)}
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
    </>
  );
}
