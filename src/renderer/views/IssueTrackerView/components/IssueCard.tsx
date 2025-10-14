import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  MessageSquare,
  GitBranch,
  GitPullRequest,
  GitMerge,
  Edit3,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Issue, PullRequest } from "../../../services/github";
import { cn } from "../../../utils/cn";
import { formatDistanceToNow } from "date-fns";
import { getLabelColors } from "../../../utils/labelColors";
import {
  PRMetadata,
  getPRMetadata,
  groupPRsByAgent,
  groupPRsByPrefix,
  isGroupClosed,
} from "../../../utils/prGrouping";

export interface IssueCardProps {
  issue: Issue;
  onIssueClick: (issue: Issue) => void;
  onQuickEdit: (issue: Issue) => void;
  onOpenPRAssignment: (issue: Issue) => void;
  onUnlinkPR: (issueNumber: number, prNumber: number) => void;
  expandedPRGroups: Set<string>;
  onTogglePRGroup: (groupKey: string) => void;
  theme: "light" | "dark";
  repoOwner: string;
  repoName: string;
}

type LinkedPR = NonNullable<Issue["linkedPRs"]>[number];

const getPRChipClasses = (pr: LinkedPR, theme: "light" | "dark") => {
  if (pr.merged) {
    return theme === "dark"
      ? "bg-green-900/40 text-green-200 border border-green-700 hover:bg-green-900/60"
      : "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200";
  }

  if (pr.state === "open") {
    if (pr.draft) {
      return theme === "dark"
        ? "bg-purple-900/40 text-purple-200 border border-purple-700 hover:bg-purple-900/60"
        : "bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200";
    }

    return theme === "dark"
      ? "bg-blue-900/40 text-blue-200 border border-blue-700 hover:bg-blue-900/60"
      : "bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200";
  }

  return theme === "dark"
    ? "bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600"
    : "bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300";
};

export const IssueCard = React.memo(function IssueCard({
  issue,
  onIssueClick,
  onQuickEdit,
  onOpenPRAssignment,
  onUnlinkPR,
  expandedPRGroups,
  onTogglePRGroup,
  theme,
  repoOwner,
  repoName,
}: IssueCardProps) {
  const [isBeingDragged, setIsBeingDragged] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        issueNumber: issue.number,
        owner: repoOwner,
        repo: repoName,
      }),
    );
    e.dataTransfer.effectAllowed = "move";
    setIsBeingDragged(true);
  };

  const handleDragEnd = () => setIsBeingDragged(false);

  const handleQuickEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickEdit(issue);
  };

  const handleOpenPRAssignmentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenPRAssignment(issue);
  };

  const groupedPRs = useMemo((): Map<string, Map<string, PRMetadata[]>> => {
    if (!issue.linkedPRs || issue.linkedPRs.length === 0) {
      return new Map();
    }

    const linkedPRsWithMetadata = issue.linkedPRs.map((pr) => {
      const fakePR: PullRequest = {
        ...pr,
        user: { login: "", avatar_url: "" },
        body: null,
        labels: [],
        head: pr.head
          ? {
              ref: pr.head.ref,
              sha: "",
              repo: null,
            }
          : {
              ref: "",
              sha: "",
              repo: null,
            },
        base: {
          ref: "",
          sha: "",
          repo: {
            name: repoName,
            owner: { login: repoOwner },
          },
        },
        assignees: [],
        requested_reviewers: [],
        comments: 0,
        created_at: "",
        updated_at: "",
        closed_at: null,
        merged_at: null,
        mergeable: null,
        merge_commit_sha: null,
      };
      return getPRMetadata(fakePR);
    });

    const byAgent = groupPRsByAgent(linkedPRsWithMetadata);
    const nestedGroups = new Map<string, Map<string, PRMetadata[]>>();

    for (const [agent, agentPRs] of byAgent) {
      nestedGroups.set(agent, groupPRsByPrefix(agentPRs));
    }

    return nestedGroups;
  }, [issue.linkedPRs, repoOwner, repoName]);

  const linkedBranches = issue.linkedBranches ?? [];
  const linkedPRs = issue.linkedPRs ?? [];
  const hasDevelopment = linkedBranches.length > 0 || linkedPRs.length > 0;
  const maxBranchesToShow = 3;
  const maxPRsToShow = 3;

  const branchChipClasses =
    theme === "dark"
      ? "bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700"
      : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200";
  const moreChipClasses =
    theme === "dark"
      ? "bg-gray-700 text-gray-300 border border-gray-600"
      : "bg-gray-200 text-gray-600 border border-gray-300";

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onIssueClick(issue)}
      className={cn(
        "p-2 rounded border cursor-pointer transition-all duration-200 group relative",
        theme === "dark"
          ? "bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600"
          : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300",
        isBeingDragged && "opacity-50 rotate-1 scale-105 shadow-lg z-50",
        "hover:shadow-sm",
      )}
    >
      <button
        onClick={handleQuickEditClick}
        className={cn(
          "absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity",
          theme === "dark"
            ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
            : "bg-gray-100 hover:bg-gray-200 text-gray-600",
        )}
        title="Quick edit"
      >
        <Edit3 className="w-2.5 h-2.5" />
      </button>

      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center space-x-1.5 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {issue.state === "open" ? (
              <AlertCircle className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
            )}
          </div>
          <span
            className={cn(
              "text-xs font-mono",
              theme === "dark" ? "text-gray-400" : "text-gray-600",
            )}
          >
            #{issue.number}
          </span>
        </div>
        {issue.comments > 0 && (
          <div className="flex items-center text-xs text-gray-500">
            <MessageSquare className="w-2.5 h-2.5 mr-0.5" />
            {issue.comments}
          </div>
        )}
      </div>

      <h3
        className={cn(
          "text-xs font-medium mb-1.5 leading-tight",
          theme === "dark" ? "text-white" : "text-gray-900",
        )}
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {issue.title}
      </h3>

      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mb-1.5">
          {issue.labels.slice(0, 2).map((label) => {
            const labelColors = getLabelColors(label.color, theme);
            return (
              <span
                key={label.name}
                className="px-1 py-0.5 text-xs rounded font-medium"
                style={{
                  backgroundColor: labelColors.backgroundColor,
                  color: labelColors.color,
                  fontSize: "0.625rem",
                }}
              >
                {label.name}
              </span>
            );
          })}
          {issue.labels.length > 2 && (
            <span
              className={cn(
                "px-1 py-0.5 rounded font-medium",
                theme === "dark"
                  ? "bg-gray-700 text-gray-300"
                  : "bg-gray-200 text-gray-600",
              )}
              style={{ fontSize: "0.625rem" }}
            >
              +{issue.labels.length - 2}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between	text-xs mb-1.5">
        <div className="flex items-center space-x-1.5">
          <img
            src={issue.user.avatar_url}
            alt={issue.user.login}
            className="w-3 h-3 rounded-full"
          />
          <span
            className={cn(
              "text-xs",
              theme === "dark" ? "text-gray-400" : "text-gray-600",
            )}
            style={{ fontSize: "0.625rem" }}
          >
            {issue.user.login}
          </span>
        </div>
        <span
          className={cn(theme === "dark" ? "text-gray-500" : "text-gray-500")}
          style={{ fontSize: "0.625rem" }}
        >
          {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
        </span>
      </div>

      {issue.assignees.length > 0 && (
        <div className="flex items-center mb-1.5 -space-x-1">
          {issue.assignees.slice(0, 3).map((assignee) => (
            <img
              key={assignee.login}
              src={assignee.avatar_url}
              alt={assignee.login}
              className={cn(
                "w-4 h-4 rounded-full border",
                theme === "dark" ? "border-gray-800" : "border-white",
              )}
              title={`Assigned to: ${assignee.login}`}
            />
          ))}
          {issue.assignees.length > 3 && (
            <div
              className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center font-medium",
                theme === "dark"
                  ? "bg-gray-700 border-gray-800 text-gray-300"
                  : "bg-gray-200 border-white text-gray-600",
              )}
              style={{ fontSize: "0.625rem" }}
            >
              +{issue.assignees.length - 3}
            </div>
          )}
        </div>
      )}

      {hasDevelopment && (
        <div className="mt-2 space-y-1 text-[0.625rem]">
          {linkedBranches.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {linkedBranches.slice(0, maxBranchesToShow).map((branch) => {
                const branchOwner = branch.repository.owner || repoOwner;
                const branchRepo = branch.repository.name || repoName;
                const repoSlug = `${branchOwner}/${branchRepo}`;
                const baseUrl = branch.repository.url
                  ? branch.repository.url.replace(/\/$/, "")
                  : `https://github.com/${repoSlug}`;
                const branchUrl = `${baseUrl}/tree/${encodeURIComponent(
                  branch.refName,
                )}`;

                return (
                  <a
                    key={branch.id}
                    href={branchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors",
                      branchChipClasses,
                    )}
                    title={`${repoSlug}:${branch.refName}`}
                  >
                    <GitBranch className="w-2.5 h-2.5" />
                    <span className="max-w-[7rem] truncate">
                      {branch.refName}
                    </span>
                  </a>
                );
              })}
              {linkedBranches.length > maxBranchesToShow && (
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded border",
                    moreChipClasses,
                  )}
                >
                  +{linkedBranches.length - maxBranchesToShow} more
                </span>
              )}
            </div>
          )}

          {linkedPRs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {linkedPRs.slice(0, maxPRsToShow).map((pr) => {
                const prUrl =
                  pr.url ||
                  `https://github.com/${repoOwner}/${repoName}/pull/${pr.number}`;
                const statusLabel = pr.merged
                  ? "Merged"
                  : pr.state === "open"
                  ? pr.draft
                    ? "Draft"
                    : "Open"
                  : "Closed";

                return (
                  <a
                    key={`card-pr-${pr.number}`}
                    href={prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors",
                      getPRChipClasses(pr, theme),
                    )}
                    title={`PR #${pr.number} • ${statusLabel}`}
                  >
                    {pr.merged ? (
                      <GitMerge className="w-2.5 h-2.5" />
                    ) : (
                      <GitPullRequest className="w-2.5 h-2.5" />
                    )}
                    <span className="font-mono">#{pr.number}</span>
                  </a>
                );
              })}
              {linkedPRs.length > maxPRsToShow && (
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded border",
                    moreChipClasses,
                  )}
                >
                  +{linkedPRs.length - maxPRsToShow} more
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "mt-2 pt-2 border-t",
          theme === "dark" ? "border-gray-700" : "border-gray-200",
        )}
      >
        {groupedPRs.size === 0 ? (
          <button
            onClick={handleOpenPRAssignmentClick}
            className={cn(
              "w-full flex items-center justify-center space-x-1 py-1.5 px-2 rounded transition-colors",
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600",
            )}
            style={{ fontSize: "0.625rem" }}
          >
            <Plus className="w-2.5 h-2.5" />
            <span>Add PRs</span>
          </button>
        ) : (
          <div className="space-y-1">
            {Array.from(groupedPRs.entries()).map(([agent, taskGroups]) => {
              const groupKey = `${issue.id}-${agent}`;
              const isExpanded = expandedPRGroups.has(groupKey);
              const allAgentPRs = Array.from(taskGroups.values()).flat();
              const groupIsClosed = isGroupClosed(allAgentPRs);
              const prCount = allAgentPRs.length;

              return (
                <div key={agent}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePRGroup(groupKey);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-1.5 rounded transition-colors",
                      theme === "dark"
                        ? "bg-gray-700 hover:bg-gray-600"
                        : "bg-gray-100 hover:bg-gray-200",
                    )}
                  >
                    <div className="flex items-center space-x-1.5">
                      {isExpanded ? (
                        <ChevronDown className="w-2.5 h-2.5" />
                      ) : (
                        <ChevronRight className="w-2.5 h-2.5" />
                      )}
                      <span
                        className="font-medium capitalize"
                        style={{ fontSize: "0.625rem" }}
                      >
                        {agent}
                      </span>
                      <span
                        className={cn(
                          "px-1 py-0.5 rounded",
                          theme === "dark" ? "bg-gray-600" : "bg-gray-200",
                        )}
                        style={{ fontSize: "0.625rem" }}
                      >
                        {prCount}
                      </span>
                      {groupIsClosed && (
                        <span
                          className="px-1 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          style={{ fontSize: "0.625rem" }}
                        >
                          Closed
                        </span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="ml-3 mt-0.5 space-y-0.5">
                      {Array.from(taskGroups.entries()).map(
                        ([taskPrefix, taskPRs]) => {
                          const taskKey = `${issue.id}-${agent}-${taskPrefix}`;
                          const isTaskExpanded =
                            expandedPRGroups.has(taskKey);
                          const taskClosed = isGroupClosed(taskPRs);

                          if (taskPRs.length === 1) {
                            const prMeta = taskPRs[0];
                            return (
                              <div
                                key={taskPrefix}
                                className={cn(
                                  "flex items-center justify-between py-0.5 px-1.5 rounded",
                                  theme === "dark"
                                    ? "bg-gray-800"
                                    : "bg-white border border-gray-200",
                                )}
                              >
                                <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                  <GitPullRequest className="w-2.5 h-2.5 flex-shrink-0" />
                                  <span
                                    className="font-mono"
                                    style={{ fontSize: "0.625rem" }}
                                  >
                                    #{prMeta.pr.number}
                                  </span>
                                  <span
                                    className="truncate"
                                    style={{ fontSize: "0.625rem" }}
                                  >
                                    {prMeta.pr.title}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUnlinkPR(
                                      issue.number,
                                      prMeta.pr.number,
                                    );
                                  }}
                                  className={cn(
                                    "ml-1 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30",
                                    "text-red-600 dark:text-red-400",
                                  )}
                                  title="Unlink PR"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div key={taskPrefix}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTogglePRGroup(taskKey);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between p-1 rounded transition-colors",
                                  theme === "dark"
                                    ? "bg-gray-800 hover:bg-gray-750"
                                    : "bg-white hover:bg-gray-50 border border-gray-200",
                                )}
                              >
                                <div className="flex items-center space-x-1 flex-1 min-w-0">
                                  {isTaskExpanded ? (
                                    <ChevronDown className="w-2 h-2" />
                                  ) : (
                                    <ChevronRight className="w-2 h-2" />
                                  )}
                                  <span
                                    className="truncate"
                                    style={{ fontSize: "0.625rem" }}
                                  >
                                    {taskPrefix}
                                  </span>
                                  <span
                                    className={cn(
                                      "px-1 py-0.5 rounded flex-shrink-0",
                                      theme === "dark"
                                        ? "bg-gray-700"
                                        : "bg-gray-200",
                                    )}
                                    style={{ fontSize: "0.625rem" }}
                                  >
                                    {taskPRs.length}
                                  </span>
                                  {taskClosed && (
                                    <span
                                      className="px-1 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0"
                                      style={{ fontSize: "0.625rem" }}
                                    >
                                      Closed
                                    </span>
                                  )}
                                </div>
                              </button>

                              {isTaskExpanded && (
                                <div className="ml-3 mt-0.5 space-y-0.5">
                                  {taskPRs.map((prMeta) => (
                                    <div
                                      key={prMeta.pr.number}
                                      className={cn(
                                        "flex items-center justify-between py-0.5 px-1.5 rounded",
                                        theme === "dark"
                                          ? "bg-gray-900"
                                          : "bg-gray-50 border border-gray-200",
                                      )}
                                    >
                                      <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                        <GitPullRequest className="w-2 h-2 flex-shrink-0" />
                                        <span
                                          className="font-mono"
                                          style={{ fontSize: "0.625rem" }}
                                        >
                                          #{prMeta.pr.number}
                                        </span>
                                        <span
                                          className="truncate"
                                          style={{ fontSize: "0.625rem" }}
                                        >
                                          {prMeta.pr.title}
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onUnlinkPR(
                                            issue.number,
                                            prMeta.pr.number,
                                          );
                                        }}
                                        className={cn(
                                          "ml-1 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30",
                                          "text-red-600 dark:text-red-400",
                                        )}
                                        title="Unlink PR"
                                      >
                                        <X className="w-2 h-2" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
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
});
