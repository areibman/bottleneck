import { useState, useEffect } from "react";
import {
  X,
  Save,
  AlertCircle,
  Tag,
  User,
  Calendar,
  MessageSquare,
  GitPullRequest,
  CheckCircle,
  Clock,
  Edit3,
} from "lucide-react";
import { Issue } from "../services/github";
import { useIssueStore } from "../stores/issueStore";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../utils/cn";
import { getLabelColors } from "../utils/labelColors";
import LabelSelector from "./LabelSelector";

interface IssueEditModalProps {
  issue: Issue;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (issue: Issue) => void;
}

export default function IssueEditModal({
  issue,
  isOpen,
  onClose,
  onUpdate,
}: IssueEditModalProps) {
  const { theme } = useUIStore();
  const { 
    updateIssue: updateIssueInStore, 
    closeIssues,
    reopenIssues,
    repoLabels,
    createLabel,
    addLabelsToIssues,
    removeLabelsFromIssues,
  } = useIssueStore();
  const { selectedRepo, pullRequests } = usePRStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(issue.title);
  const [editedBody, setEditedBody] = useState(issue.body || "");
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    issue.labels.map(l => l.name)
  );
  const [isSaving, setIsSaving] = useState(false);

  // Find related PRs
  const relatedPRs = Array.from(pullRequests.values()).filter(pr =>
    pr.body?.includes(`#${issue.number}`) || 
    pr.title?.includes(`#${issue.number}`)
  );

  useEffect(() => {
    if (isOpen) {
      setEditedTitle(issue.title);
      setEditedBody(issue.body || "");
      setSelectedLabels(issue.labels.map(l => l.name));
      setIsEditing(false);
    }
  }, [isOpen, issue]);

  if (!isOpen || !selectedRepo) return null;

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Update labels
      const currentLabels = issue.labels.map(l => l.name);
      const labelsToAdd = selectedLabels.filter(l => !currentLabels.includes(l));
      const labelsToRemove = currentLabels.filter(l => !selectedLabels.includes(l));

      if (labelsToAdd.length > 0) {
        await addLabelsToIssues(
          selectedRepo.owner,
          selectedRepo.name,
          [issue.number],
          labelsToAdd
        );
      }

      if (labelsToRemove.length > 0) {
        await removeLabelsFromIssues(
          selectedRepo.owner,
          selectedRepo.name,
          [issue.number],
          labelsToRemove
        );
      }

      // TODO: Update title and body via GitHub API
      // For now, we'll just update the local state
      const updatedIssue = {
        ...issue,
        title: editedTitle,
        body: editedBody,
        labels: selectedLabels.map(name => ({
          name,
          color: repoLabels.find(l => l.name === name)?.color || "000000"
        }))
      };

      updateIssueInStore(updatedIssue);
      
      if (onUpdate) {
        onUpdate(updatedIssue);
      }

      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update issue:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleState = async () => {
    setIsSaving(true);
    
    try {
      if (issue.state === "open") {
        await closeIssues(selectedRepo.owner, selectedRepo.name, [issue.number]);
      } else {
        await reopenIssues(selectedRepo.owner, selectedRepo.name, [issue.number]);
      }
      
      onClose();
    } catch (error) {
      console.error("Failed to toggle issue state:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative z-10 w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden flex flex-col",
          theme === "dark" ? "bg-gray-800" : "bg-white"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "px-6 py-4 border-b flex items-center justify-between",
            theme === "dark" ? "border-gray-700 bg-gray-850" : "border-gray-200 bg-gray-50"
          )}
        >
          <div className="flex items-center space-x-3">
            {issue.state === "open" ? (
              <AlertCircle className="w-5 h-5 text-green-400" />
            ) : (
              <CheckCircle className="w-5 h-5 text-purple-400" />
            )}
            <div>
              <h2 className="text-lg font-semibold">
                Issue #{issue.number}
              </h2>
              <p className={cn(
                "text-sm",
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              )}>
                {selectedRepo.full_name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className={cn(
                  "px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm transition-colors",
                  theme === "dark"
                    ? "hover:bg-gray-700 text-gray-300"
                    : "hover:bg-gray-100 text-gray-700"
                )}
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm transition-colors",
                    theme === "dark"
                      ? "hover:bg-gray-700 text-gray-300"
                      : "hover:bg-gray-100 text-gray-700"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm transition-colors",
                    "bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
                  )}
                >
                  {isSaving ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save</span>
                </button>
              </>
            )}

            <button
              onClick={handleToggleState}
              disabled={isSaving}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm transition-colors",
                issue.state === "open"
                  ? "bg-purple-500 hover:bg-purple-600 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white",
                "disabled:opacity-50"
              )}
            >
              {issue.state === "open" ? "Close Issue" : "Reopen Issue"}
            </button>

            <button
              onClick={onClose}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                theme === "dark"
                  ? "hover:bg-gray-700 text-gray-400"
                  : "hover:bg-gray-200 text-gray-500"
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-lg font-semibold",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500"
                  )}
                  placeholder="Issue title..."
                />
              ) : (
                <h3 className="text-xl font-semibold">{issue.title}</h3>
              )}
            </div>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Opened by</span>
                <img
                  src={issue.user.avatar_url}
                  alt={issue.user.login}
                  className="w-5 h-5 rounded-full"
                />
                <span className="font-medium">{issue.user.login}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {formatDistanceToNow(new Date(issue.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>
                  Updated {formatDistanceToNow(new Date(issue.updated_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>{issue.comments} comments</span>
              </div>
            </div>

            {/* Labels */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Tag className="w-4 h-4" />
                <span className="text-sm font-medium">Labels</span>
              </div>
              {isEditing ? (
                <LabelSelector
                  availableLabels={repoLabels}
                  selectedLabels={selectedLabels}
                  onAddLabel={(label) => setSelectedLabels([...selectedLabels, label])}
                  onRemoveLabel={(label) => 
                    setSelectedLabels(selectedLabels.filter(l => l !== label))
                  }
                  onCreateLabel={async (name, color, description) => {
                    await createLabel(selectedRepo.owner, selectedRepo.name, name, color, description);
                    setSelectedLabels([...selectedLabels, name]);
                  }}
                  showApplyButton={false}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {issue.labels.map((label) => {
                    const labelColors = getLabelColors(label.color, theme);
                    return (
                      <span
                        key={label.name}
                        className="px-3 py-1 text-sm rounded-full font-medium"
                        style={{
                          backgroundColor: labelColors.backgroundColor,
                          color: labelColors.color,
                        }}
                      >
                        {label.name}
                      </span>
                    );
                  })}
                  {issue.labels.length === 0 && (
                    <span className={cn(
                      "text-sm",
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    )}>
                      No labels
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Assignees */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Assignees</span>
              </div>
              <div className="flex items-center space-x-2">
                {issue.assignees.length > 0 ? (
                  issue.assignees.map((assignee) => (
                    <div
                      key={assignee.login}
                      className="flex items-center space-x-2"
                    >
                      <img
                        src={assignee.avatar_url}
                        alt={assignee.login}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm">{assignee.login}</span>
                    </div>
                  ))
                ) : (
                  <span className={cn(
                    "text-sm",
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  )}>
                    No one assigned
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Description</span>
              </div>
              {isEditing ? (
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={8}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500"
                  )}
                  placeholder="Add a description..."
                />
              ) : (
                <div
                  className={cn(
                    "prose max-w-none",
                    theme === "dark" ? "prose-invert" : ""
                  )}
                >
                  {issue.body ? (
                    <p className="whitespace-pre-wrap">{issue.body}</p>
                  ) : (
                    <p className={cn(
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    )}>
                      No description provided
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Related PRs */}
            {relatedPRs.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <GitPullRequest className="w-4 h-4" />
                  <span className="text-sm font-medium">Related Pull Requests</span>
                </div>
                <div className="space-y-2">
                  {relatedPRs.map((pr) => (
                    <div
                      key={pr.number}
                      className={cn(
                        "p-3 rounded-lg border",
                        theme === "dark"
                          ? "bg-gray-750 border-gray-700"
                          : "bg-gray-50 border-gray-200"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <GitPullRequest
                            className={cn(
                              "w-4 h-4",
                              pr.merged
                                ? "text-purple-400"
                                : pr.state === "open"
                                ? "text-green-400"
                                : "text-red-400"
                            )}
                          />
                          <span className="font-medium">#{pr.number}</span>
                          <span className="text-sm">{pr.title}</span>
                        </div>
                        <span
                          className={cn(
                            "text-xs px-2 py-1 rounded-full",
                            pr.merged
                              ? "bg-purple-500 bg-opacity-20 text-purple-400"
                              : pr.state === "open"
                              ? "bg-green-500 bg-opacity-20 text-green-400"
                              : "bg-red-500 bg-opacity-20 text-red-400"
                          )}
                        >
                          {pr.merged ? "Merged" : pr.state}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}