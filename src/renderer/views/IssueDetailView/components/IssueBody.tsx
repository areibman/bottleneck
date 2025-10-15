import { Issue } from "../../../services/github";
import { cn } from "../../../utils/cn";
import {
  UncontrolledMarkdownEditor,
  UncontrolledMarkdownEditorRef,
} from "../../../components/UncontrolledMarkdownEditor";
import { Markdown } from "../../../components/Markdown";
import { memo } from "react";
import { Edit2 } from "lucide-react";

const MemoizedMarkdown = memo(Markdown);

interface IssueBodyProps {
  issue: Issue;
  theme: "light" | "dark";
  editingIssue: boolean;
  editIssueEditorRef: React.RefObject<UncontrolledMarkdownEditorRef>;
  onCancelEdit: () => void;
  onUpdateIssue: () => void;
  onStartEdit: () => void;
  isAuthor: (login: string) => boolean;
}

export function IssueBody({
  issue,
  theme,
  editingIssue,
  editIssueEditorRef,
  onCancelEdit,
  onUpdateIssue,
  onStartEdit,
  isAuthor,
}: IssueBodyProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border relative",
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200",
      )}
    >
      {editingIssue ? (
        <div className="space-y-3">
          <UncontrolledMarkdownEditor
            ref={editIssueEditorRef}
            placeholder="Edit issue description (Markdown supported)"
            minHeight="200px"
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={onCancelEdit}
              className={cn(
                "px-3 py-1.5 rounded text-sm",
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700",
              )}
            >
              Cancel
            </button>
            <button
              onClick={onUpdateIssue}
              className={cn(
                "px-3 py-1.5 rounded text-sm text-white",
                "bg-green-600 hover:bg-green-700",
              )}
            >
              Update
            </button>
          </div>
        </div>
      ) : (
        <>
          {isAuthor(issue.user.login) && (
            <button
              onClick={onStartEdit}
              className={cn(
                "absolute top-2 right-2 p-1.5 rounded transition-colors",
                theme === "dark"
                  ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-100 text-gray-600 hover:text-gray-800",
              )}
              title="Edit issue"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {issue.body ? (
            <MemoizedMarkdown content={issue.body} variant="compact" />
          ) : (
            <p className="text-gray-500 italic">No description provided.</p>
          )}
        </>
      )}
    </div>
  );
}
