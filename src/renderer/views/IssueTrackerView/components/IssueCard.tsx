import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Edit3,
  Plus,
} from "lucide-react";
import { Issue } from "../../../services/github";
import { cn } from "../../../utils/cn";
import { formatDistanceToNow } from "date-fns";
import { getLabelColors } from "../../../utils/labelColors";
import { IssueDevelopmentTreeView } from "./IssueDevelopmentTreeView";

export interface IssueCardProps {
  issue: Issue;
  onIssueClick: (issue: Issue) => void;
  onQuickEdit: (issue: Issue) => void;
  onOpenPRAssignment: (issue: Issue) => void;
  theme: "light" | "dark";
  repoOwner: string;
  repoName: string;
}

export const IssueCard = React.memo(function IssueCard({
  issue,
  onIssueClick,
  onQuickEdit,
  onOpenPRAssignment,
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

  const hasDevelopment =
    (issue.linkedBranches && issue.linkedBranches.length > 0) ||
    (issue.linkedPRs && issue.linkedPRs.length > 0);

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

      <div
        className={cn(
          "mt-2 pt-2 border-t",
          theme === "dark" ? "border-gray-700" : "border-gray-200",
        )}
      >
        {hasDevelopment ? (
          <IssueDevelopmentTreeView
            issue={issue}
            theme={theme}
            repoOwner={repoOwner}
            repoName={repoName}
          />
        ) : null}

        <div
          onClick={handleOpenPRAssignmentClick}
          className={cn(
            "w-full flex items-center justify-center space-x-1 py-1.5 px-2 rounded transition-colors cursor-pointer",
            theme === "dark"
              ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
              : "bg-gray-100 hover:bg-gray-200 text-gray-600",
            hasDevelopment && "mt-2",
          )}
          style={{ fontSize: "0.625rem" }}
        >
          <Plus className="w-2.5 h-2.5" />
          <span>Link PRs</span>
        </div>
      </div>
    </div>
  );
});
