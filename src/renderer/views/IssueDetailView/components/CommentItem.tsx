import { memo, useRef, useEffect } from "react";
import { Comment } from "../../../services/github";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../../../utils/cn";
import {
  UncontrolledMarkdownEditor,
  UncontrolledMarkdownEditorRef,
} from "../../../components/UncontrolledMarkdownEditor";
import { Markdown } from "../../../components/Markdown";
import { Edit2, MoreVertical, Trash2 } from "lucide-react";

const MemoizedMarkdown = memo(Markdown);

interface CommentItemProps {
  comment: Comment;
  isAuthor: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  showMenu: boolean;
  onToggleMenu: () => void;
  theme: "light" | "dark";
}

export const CommentItem = memo(function CommentItem({
  comment,
  isAuthor,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  showMenu,
  onToggleMenu,
  theme,
}: CommentItemProps) {
  const editRef = useRef<UncontrolledMarkdownEditorRef>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.setValue(comment.body);
    }
  }, [isEditing, comment.body]);

  return (
    <div
      className={cn(
        "p-4 rounded-lg border relative",
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200",
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <img
            src={comment.user.avatar_url}
            alt={comment.user.login}
            className="w-6 h-6 rounded-full"
          />
          <span className="font-medium">{comment.user.login}</span>
          <span
            className={cn(
              "text-sm",
              theme === "dark" ? "text-gray-400" : "text-gray-600",
            )}
          >
            {formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>

        {isAuthor && (
          <div className="relative">
            <button
              onClick={onToggleMenu}
              className={cn(
                "p-1 rounded transition-colors",
                theme === "dark"
                  ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-100 text-gray-600 hover:text-gray-800",
              )}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div
                className={cn(
                  "absolute right-0 mt-1 py-1 rounded shadow-lg z-10 min-w-[120px]",
                  theme === "dark"
                    ? "bg-gray-700 border border-gray-600"
                    : "bg-white border border-gray-200",
                )}
              >
                <button
                  onClick={onStartEdit}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-1.5 w-full text-left text-sm transition-colors",
                    theme === "dark"
                      ? "hover:bg-gray-600 text-gray-200"
                      : "hover:bg-gray-100 text-gray-700",
                  )}
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={onDelete}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-1.5 w-full text-left text-sm transition-colors",
                    "text-red-500 hover:bg-red-500 hover:text-white",
                  )}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <UncontrolledMarkdownEditor
            ref={editRef}
            placeholder="Edit comment (Markdown supported)"
            minHeight="100px"
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
              onClick={() => {
                const text = editRef.current?.getValue() || "";
                if (text.trim()) onUpdate(text);
              }}
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
        <MemoizedMarkdown content={comment.body} variant="compact" />
      )}
    </div>
  );
});
