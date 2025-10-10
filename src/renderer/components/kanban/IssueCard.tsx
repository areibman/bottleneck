import React from "react";
import { cn } from "../../utils/cn";
import { Issue } from "../../services/github";
import { MessageSquare, GitBranch, GitPullRequest, CheckCircle2, Edit } from "lucide-react";
import { getLabelColors } from "../../utils/labelColors";
import { formatDistanceToNow } from "date-fns";

interface IssueCardProps {
  issue: Issue;
  theme: "light" | "dark";
  relatedPRs?: Array<{ number: number; state: string; merged: boolean }>;
  onDragStart?: (e: React.DragEvent, issue: Issue) => void;
  onEditClick?: (e: React.MouseEvent, issue: Issue) => void;
}

export const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  theme,
  relatedPRs = [],
  onDragStart,
  onEditClick,
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(issue));
    if (onDragStart) {
      onDragStart(e, issue);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditClick) {
      onEditClick(e, issue);
    }
  };

  const openPRs = relatedPRs.filter(pr => pr.state === "open" && !pr.merged);
  const mergedPRs = relatedPRs.filter(pr => pr.merged);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "p-3 rounded-md border cursor-move transition-all hover:shadow-md relative group",
        theme === "dark"
          ? "bg-gray-900 border-gray-700 hover:border-gray-600"
          : "bg-white border-gray-200 hover:border-gray-300"
      )}
    >
      {/* Edit Button */}
      <button
        onClick={handleEditClick}
        className={cn(
          "absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
          theme === "dark"
            ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
            : "bg-gray-100 hover:bg-gray-200 text-gray-600"
        )}
        title="Edit issue"
      >
        <Edit className="w-3 h-3" />
      </button>

      {/* Issue Title */}
      <h4
        className={cn(
          "text-sm font-medium mb-2 line-clamp-2 pr-6",
          theme === "dark" ? "text-gray-100" : "text-gray-900"
        )}
      >
        {issue.title}
      </h4>

      {/* Issue Number and Metadata */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-xs",
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          )}
        >
          #{issue.number}
        </span>
        <span
          className={cn(
            "text-xs",
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          )}
        >
          {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
        </span>
      </div>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {issue.labels.slice(0, 3).map((label) => {
            const labelColors = getLabelColors(label.color, theme);
            return (
              <span
                key={label.name}
                className="px-1.5 py-0.5 text-xs rounded font-medium"
                style={{
                  backgroundColor: labelColors.backgroundColor,
                  color: labelColors.color,
                }}
              >
                {label.name}
              </span>
            );
          })}
          {issue.labels.length > 3 && (
            <span
              className={cn(
                "px-1.5 py-0.5 text-xs rounded",
                theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"
              )}
            >
              +{issue.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer - Assignees and Stats */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-700/30">
        <div className="flex items-center space-x-2">
          {/* Assignees */}
          {issue.assignees.length > 0 && (
            <div className="flex -space-x-1">
              {issue.assignees.slice(0, 3).map((assignee) => (
                <img
                  key={assignee.login}
                  src={assignee.avatar_url}
                  alt={assignee.login}
                  className={cn(
                    "w-5 h-5 rounded-full border",
                    theme === "dark" ? "border-gray-800" : "border-white"
                  )}
                  title={assignee.login}
                />
              ))}
              {issue.assignees.length > 3 && (
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center text-xs font-medium",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-800 text-gray-300"
                      : "bg-gray-200 border-white text-gray-600"
                  )}
                >
                  +{issue.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {/* Comments */}
          {issue.comments > 0 && (
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-3 h-3" />
              <span>{issue.comments}</span>
            </div>
          )}

          {/* Related PRs */}
          {openPRs.length > 0 && (
            <div className="flex items-center space-x-1 text-blue-400">
              <GitPullRequest className="w-3 h-3" />
              <span>{openPRs.length}</span>
            </div>
          )}

          {/* Merged PRs */}
          {mergedPRs.length > 0 && (
            <div className="flex items-center space-x-1 text-purple-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>{mergedPRs.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
