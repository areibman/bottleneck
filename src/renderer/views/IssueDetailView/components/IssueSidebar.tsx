import { Issue } from "../../../services/github";
import { cn } from "../../../utils/cn";
import LabelSelector from "../../../components/LabelSelector";
import { getLabelColors } from "../../../utils/labelColors";
import { DevelopmentSection } from "./DevelopmentSection";
import { Edit2 } from "lucide-react";

interface IssueSidebarProps {
  issue: Issue;
  theme: "light" | "dark";
  editingLabels: boolean;
  onEditLabelsChange: (value: boolean) => void;
  selectedLabels: string[];
  onSelectedLabelsChange: (labels: string[]) => void;
  repoLabels: Array<{ name: string; color: string; description: string | null }>;
  onApplyLabels: () => void;
  owner?: string;
  repo?: string;
}

export function IssueSidebar({
  issue,
  theme,
  editingLabels,
  onEditLabelsChange,
  selectedLabels,
  onSelectedLabelsChange,
  repoLabels,
  onApplyLabels,
  owner,
  repo,
}: IssueSidebarProps) {
  return (
    <aside className="w-64">
      <div className="space-y-4">
        <div>
          <h3
            className={cn(
              "text-sm font-semibold mb-2",
              theme === "dark" ? "text-gray-300" : "text-gray-700",
            )}
          >
            Assignees
          </h3>
          {issue.assignees.length > 0 ? (
            issue.assignees.map((assignee) => (
              <div key={assignee.login} className="flex items-center space-x-2 mb-1">
                <img
                  src={assignee.avatar_url}
                  alt={assignee.login}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm">{assignee.login}</span>
              </div>
            ))
          ) : (
            <p
              className={cn(
                "text-sm",
                theme === "dark" ? "text-gray-500" : "text-gray-400",
              )}
            >
              No one assigned
            </p>
          )}
        </div>

        <div>
          <h3
            className={cn(
              "text-sm font-semibold mb-2",
              theme === "dark" ? "text-gray-300" : "text-gray-700",
            )}
          >
            Development
          </h3>
          <DevelopmentSection
            branches={issue.linkedBranches}
            pullRequests={issue.linkedPRs}
            owner={owner}
            repo={repo}
            theme={theme}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3
              className={cn(
                "text-sm font-semibold",
                theme === "dark" ? "text-gray-300" : "text-gray-700",
              )}
            >
              Labels
            </h3>
            {!editingLabels && (
              <button
                onClick={() => onEditLabelsChange(true)}
                className={cn(
                  "p-1 rounded transition-colors",
                  theme === "dark"
                    ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-800",
                )}
                title="Edit labels"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {editingLabels ? (
            <div className="space-y-2">
              <LabelSelector
                availableLabels={repoLabels}
                selectedLabels={selectedLabels}
                onAddLabel={(label) =>
                  onSelectedLabelsChange([...selectedLabels, label])
                }
                onRemoveLabel={(label) =>
                  onSelectedLabelsChange(selectedLabels.filter((l) => l !== label))
                }
                className="w-full"
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    onEditLabelsChange(false);
                    onSelectedLabelsChange(issue.labels.map((label) => label.name));
                  }}
                  className={cn(
                    "flex-1 px-2 py-1 rounded text-xs",
                    theme === "dark"
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700",
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={onApplyLabels}
                  className={cn(
                    "flex-1 px-2 py-1 rounded text-xs text-white",
                    "bg-blue-600 hover:bg-blue-700",
                  )}
                >
                  Apply
                </button>
              </div>
            </div>
          ) : (
            <>
              {issue.labels.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {issue.labels.map((label) => {
                    const labelColors = getLabelColors(label.color, theme);
                    return (
                      <span
                        key={label.name}
                        className="px-2 py-0.5 text-xs rounded font-medium"
                        style={{
                          backgroundColor: labelColors.backgroundColor,
                          color: labelColors.color,
                        }}
                      >
                        {label.name}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p
                  className={cn(
                    "text-sm",
                    theme === "dark" ? "text-gray-500" : "text-gray-400",
                  )}
                >
                  None yet
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
