import React, { useState, useEffect } from "react";
import { X, User, Tag, CheckCircle, XCircle, GitPullRequest } from "lucide-react";
import { cn } from "../../utils/cn";
import { Issue } from "../../services/github";
import { getLabelColors } from "../../utils/labelColors";

interface IssueEditModalProps {
  issue: Issue;
  theme: "light" | "dark";
  isOpen: boolean;
  onClose: () => void;
  onUpdateAssignees: (assignees: string[]) => Promise<void>;
  onUpdateLabels: (labels: string[]) => Promise<void>;
  onCloseIssue: () => Promise<void>;
  onReopen: () => Promise<void>;
  availableLabels: Array<{ name: string; color: string; description: string | null }>;
  relatedPRs?: Array<{ number: number; title: string; state: string; merged: boolean }>;
}

export const IssueEditModal: React.FC<IssueEditModalProps> = ({
  issue,
  theme,
  isOpen,
  onClose,
  onUpdateAssignees,
  onUpdateLabels,
  onCloseIssue,
  onReopen,
  availableLabels,
  relatedPRs = [],
}) => {
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    issue.labels.map((l) => l.name)
  );
  const [assigneeInput, setAssigneeInput] = useState("");
  const [assignees, setAssignees] = useState<string[]>(
    issue.assignees.map((a) => a.login)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedLabels(issue.labels.map((l) => l.name));
      setAssignees(issue.assignees.map((a) => a.login));
    }
  }, [isOpen, issue]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update assignees if changed
      const currentAssignees = issue.assignees.map((a) => a.login);
      if (JSON.stringify(assignees.sort()) !== JSON.stringify(currentAssignees.sort())) {
        await onUpdateAssignees(assignees);
      }

      // Update labels if changed
      const currentLabels = issue.labels.map((l) => l.name);
      if (JSON.stringify(selectedLabels.sort()) !== JSON.stringify(currentLabels.sort())) {
        await onUpdateLabels(selectedLabels);
      }

      onClose();
    } catch (error) {
      console.error("Failed to save changes:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAssignee = () => {
    if (assigneeInput.trim() && !assignees.includes(assigneeInput.trim())) {
      setAssignees([...assignees, assigneeInput.trim()]);
      setAssigneeInput("");
    }
  };

  const handleRemoveAssignee = (assignee: string) => {
    setAssignees(assignees.filter((a) => a !== assignee));
  };

  const handleToggleLabel = (labelName: string) => {
    if (selectedLabels.includes(labelName)) {
      setSelectedLabels(selectedLabels.filter((l) => l !== labelName));
    } else {
      setSelectedLabels([...selectedLabels, labelName]);
    }
  };

  const handleCloseIssue = async () => {
    setSaving(true);
    try {
      await onCloseIssue();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleReopenIssue = async () => {
    setSaving(true);
    try {
      await onReopen();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl",
          theme === "dark" ? "bg-gray-800" : "bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between p-4 border-b",
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          )}
        >
          <div>
            <h2
              className={cn(
                "text-lg font-semibold",
                theme === "dark" ? "text-gray-100" : "text-gray-900"
              )}
            >
              Edit Issue #{issue.number}
            </h2>
            <p
              className={cn(
                "text-sm mt-1",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}
            >
              {issue.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700",
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-6">
          {/* Assignees Section */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <User className="w-4 h-4" />
              <h3
                className={cn(
                  "font-medium text-sm",
                  theme === "dark" ? "text-gray-200" : "text-gray-700"
                )}
              >
                Assignees
              </h3>
            </div>
            <div className="space-y-2">
              {assignees.map((assignee) => (
                <div
                  key={assignee}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded",
                    theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                  )}
                >
                  <span className="text-sm">{assignee}</span>
                  <button
                    onClick={() => handleRemoveAssignee(assignee)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={assigneeInput}
                  onChange={(e) => setAssigneeInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddAssignee()}
                  placeholder="Enter GitHub username"
                  className={cn(
                    "flex-1 px-3 py-2 rounded border text-sm",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-gray-100"
                      : "bg-white border-gray-300 text-gray-900"
                  )}
                />
                <button
                  onClick={handleAddAssignee}
                  className={cn(
                    "px-4 py-2 rounded text-sm font-medium",
                    theme === "dark"
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  )}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Labels Section */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Tag className="w-4 h-4" />
              <h3
                className={cn(
                  "font-medium text-sm",
                  theme === "dark" ? "text-gray-200" : "text-gray-700"
                )}
              >
                Labels
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableLabels.map((label) => {
                const isSelected = selectedLabels.includes(label.name);
                const labelColors = getLabelColors(label.color, theme);
                return (
                  <button
                    key={label.name}
                    onClick={() => handleToggleLabel(label.name)}
                    className={cn(
                      "px-2 py-1 text-xs rounded font-medium transition-all",
                      isSelected
                        ? "ring-2 ring-blue-500 ring-offset-2"
                        : "opacity-60 hover:opacity-100"
                    )}
                    style={{
                      backgroundColor: labelColors.backgroundColor,
                      color: labelColors.color,
                    }}
                  >
                    {label.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Related PRs Section */}
          {relatedPRs.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <GitPullRequest className="w-4 h-4" />
                <h3
                  className={cn(
                    "font-medium text-sm",
                    theme === "dark" ? "text-gray-200" : "text-gray-700"
                  )}
                >
                  Related Pull Requests
                </h3>
              </div>
              <div className="space-y-2">
                {relatedPRs.map((pr) => (
                  <div
                    key={pr.number}
                    className={cn(
                      "px-3 py-2 rounded flex items-center justify-between",
                      theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                    )}
                  >
                    <span className="text-sm">
                      #{pr.number}: {pr.title}
                    </span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded",
                        pr.merged
                          ? "bg-purple-500 text-white"
                          : pr.state === "open"
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      )}
                    >
                      {pr.merged ? "Merged" : pr.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issue State Actions */}
          <div className="flex space-x-2 pt-4 border-t border-gray-700">
            {issue.state === "open" ? (
              <button
                onClick={handleCloseIssue}
                disabled={saving}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded text-sm font-medium",
                  theme === "dark"
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-purple-500 hover:bg-purple-600 text-white",
                  saving && "opacity-50 cursor-not-allowed"
                )}
              >
                <XCircle className="w-4 h-4" />
                <span>Close Issue</span>
              </button>
            ) : (
              <button
                onClick={handleReopenIssue}
                disabled={saving}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded text-sm font-medium",
                  theme === "dark"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white",
                  saving && "opacity-50 cursor-not-allowed"
                )}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Reopen Issue</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={cn(
            "flex items-center justify-end space-x-3 p-4 border-t",
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          )}
        >
          <button
            onClick={onClose}
            className={cn(
              "px-4 py-2 rounded text-sm font-medium",
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "px-4 py-2 rounded text-sm font-medium",
              theme === "dark"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white",
              saving && "opacity-50 cursor-not-allowed"
            )}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};
