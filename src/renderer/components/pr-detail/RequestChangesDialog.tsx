import { XCircle } from "lucide-react";
import { PullRequest } from "../../services/github";
import { cn } from "../../utils/cn";

interface RequestChangesDialogProps {
  pr: PullRequest;
  theme: "dark" | "light";
  feedback: string;
  isSubmitting: boolean;
  onFeedbackChange: (feedback: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function RequestChangesDialog({
  pr,
  theme,
  feedback,
  isSubmitting,
  onFeedbackChange,
  onSubmit,
  onCancel,
}: RequestChangesDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={cn(
          "rounded-lg shadow-xl p-6 max-w-md w-full mx-4",
          theme === "dark"
            ? "bg-gray-800 border border-gray-700"
            : "bg-white border border-gray-200",
        )}
      >
        <div className="flex items-center mb-4">
          <XCircle className="w-5 h-5 text-red-500 mr-2" />
          <h2 className="text-lg font-semibold">Request Changes</h2>
        </div>

        <p
          className={cn(
            "text-sm mb-4",
            theme === "dark" ? "text-gray-300" : "text-gray-700",
          )}
        >
          Please describe what changes need to be made to{" "}
          <strong>
            #{pr.number} {pr.title}
          </strong>
        </p>

        <div className="mb-4">
          <label
            className={cn(
              "block text-xs font-medium mb-2",
              theme === "dark" ? "text-gray-400" : "text-gray-600",
            )}
          >
            Feedback (required):
          </label>
          <textarea
            value={feedback}
            onChange={(e) => onFeedbackChange(e.target.value)}
            placeholder="Describe the changes that need to be made..."
            className={cn(
              "w-full px-3 py-2 text-sm rounded border resize-none",
              theme === "dark"
                ? "bg-gray-900 border-gray-700 text-gray-300 placeholder-gray-500"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-400",
            )}
            rows={6}
            autoFocus
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="btn btn-secondary text-sm"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !feedback.trim()}
            className="btn btn-danger text-sm"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Request Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
