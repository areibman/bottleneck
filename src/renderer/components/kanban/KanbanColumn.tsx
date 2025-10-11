import React from "react";
import { cn } from "../../utils/cn";
import { Issue } from "../../services/github";

interface KanbanColumnProps {
  title: string;
  count: number;
  issues: Issue[];
  theme: "light" | "dark";
  onDrop: (issue: Issue) => void;
  onIssueClick: (issue: Issue) => void;
  renderIssueCard: (issue: Issue) => React.ReactNode;
  columnId: string;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  count,
  issues,
  theme,
  onDrop,
  onIssueClick,
  renderIssueCard,
  columnId,
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const issueData = e.dataTransfer.getData("application/json");
    if (issueData) {
      try {
        const issue = JSON.parse(issueData);
        onDrop(issue);
      } catch (error) {
        console.error("Failed to parse dropped issue:", error);
      }
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border min-w-[300px] flex-1",
        theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "px-4 py-3 border-b font-medium",
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        )}
      >
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-sm font-semibold",
            theme === "dark" ? "text-gray-200" : "text-gray-700"
          )}>
            {title}
          </span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"
          )}>
            {count}
          </span>
        </div>
      </div>

      {/* Column Body */}
      <div
        className={cn(
          "flex-1 p-3 space-y-2 overflow-y-auto min-h-[200px]",
          isDragOver && (theme === "dark" ? "bg-gray-700/50" : "bg-gray-100/50")
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-column-id={columnId}
      >
        {issues.length === 0 ? (
          <div className={cn(
            "flex items-center justify-center h-32 text-sm",
            theme === "dark" ? "text-gray-500" : "text-gray-400"
          )}>
            No issues
          </div>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} onClick={() => onIssueClick(issue)}>
              {renderIssueCard(issue)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
