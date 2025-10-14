import { Comment } from "../../../services/github";
import {
  UncontrolledMarkdownEditor,
  UncontrolledMarkdownEditorRef,
} from "../../../components/UncontrolledMarkdownEditor";
import { cn } from "../../../utils/cn";
import { CommentItem } from "./CommentItem";
import { Send } from "lucide-react";

interface CommentsSectionProps {
  comments: Comment[];
  theme: "light" | "dark";
  editingCommentId: number | null;
  onStartEdit: (comment: Comment) => void;
  onCancelEdit: () => void;
  onUpdateComment: (commentId: number, text?: string) => void;
  onDeleteComment: (commentId: number) => void;
  isAuthor: (login: string) => boolean;
  showCommentMenu: number | null;
  onToggleMenu: (commentId: number) => void;
  newCommentEditorRef: React.RefObject<UncontrolledMarkdownEditorRef>;
  onSubmit: () => void;
  submittingComment: boolean;
}

export function CommentsSection({
  comments,
  theme,
  editingCommentId,
  onStartEdit,
  onCancelEdit,
  onUpdateComment,
  onDeleteComment,
  isAuthor,
  showCommentMenu,
  onToggleMenu,
  newCommentEditorRef,
  onSubmit,
  submittingComment,
}: CommentsSectionProps) {
  return (
    <>
      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            isAuthor={isAuthor(comment.user.login)}
            isEditing={editingCommentId === comment.id}
            onStartEdit={() => onStartEdit(comment)}
            onCancelEdit={onCancelEdit}
            onUpdate={(text) => onUpdateComment(comment.id, text)}
            onDelete={() => onDeleteComment(comment.id)}
            showMenu={showCommentMenu === comment.id}
            onToggleMenu={() => onToggleMenu(comment.id)}
            theme={theme}
          />
        ))}
      </div>

      <div
        className={cn(
          "rounded-lg border",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200",
        )}
      >
        <div className="p-4 space-y-3">
          <UncontrolledMarkdownEditor
            ref={newCommentEditorRef}
            placeholder="Leave a comment (Markdown supported)"
            minHeight="120px"
          />
          <div className="flex justify-end">
            <button
              onClick={onSubmit}
              disabled={submittingComment}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded text-sm font-medium transition-colors",
                "bg-green-600 text-white",
                !submittingComment
                  ? "hover:bg-green-700"
                  : "opacity-50 cursor-not-allowed",
              )}
            >
              <Send className="w-4 h-4" />
              <span>{submittingComment ? "Commenting..." : "Comment"}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
