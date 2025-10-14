import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Issue } from "../../../services/github";
import { cn } from "../../../utils/cn";

interface QuickEditModalProps {
  issue: Issue | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (issue: Issue, updates: Partial<Issue>) => void;
  theme: "light" | "dark";
}

export const QuickEditModal = React.memo(function QuickEditModal({
  issue,
  isOpen,
  onClose,
  onSave,
  theme,
}: QuickEditModalProps) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (issue) {
      setTitle(issue.title);
    }
  }, [issue]);

  if (!isOpen || !issue) return null;

  const handleSave = () => {
    if (!issue) return;
    const updates: Partial<Issue> = {
      title: title.trim(),
    };
    onSave(issue, updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={cn(
          "bg-white rounded-lg shadow-xl max-w-md w-full mx-4",
          theme === "dark" ? "bg-gray-800" : "bg-white",
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">
            Quick Edit Issue #{issue.number}
          </h3>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700",
              theme === "dark" ? "text-gray-400" : "text-gray-600",
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(
                "w-full px-3 py-2 border rounded-md",
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900",
              )}
              placeholder="Issue title"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className={cn(
                "px-4 py-2 rounded text-sm",
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700",
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
