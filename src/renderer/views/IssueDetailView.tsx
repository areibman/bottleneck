import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Send,
  Edit2,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { GitHubAPI, Issue, Comment } from "../services/github";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../utils/cn";
import { mockIssues } from "../mockData";
import { useUIStore } from "../stores/uiStore";
import { Markdown } from "../components/Markdown";
import {
  UncontrolledMarkdownEditor,
  UncontrolledMarkdownEditorRef,
} from "../components/UncontrolledMarkdownEditor";

// Memoize Markdown component to prevent unnecessary re-renders
const MemoizedMarkdown = memo(Markdown);

// Comment component to isolate re-renders
const CommentItem = memo(
  ({
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
  }: {
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
  }) => {
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
          <MemoizedMarkdown content={comment.body} />
        )}
      </div>
    );
  },
);

CommentItem.displayName = "CommentItem";

// Mock comments for development
const mockComments: Comment[] = [
  {
    id: 1,
    body: "I've noticed this issue as well. It seems to happen when the cache is not properly cleared.",
    user: {
      login: "alice",
      avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
    },
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    html_url: "https://github.com/owner/repo/issues/1#issuecomment-1",
  },
  {
    id: 2,
    body: "Have you tried clearing the browser cache? That fixed it for me.",
    user: {
      login: "bob",
      avatar_url: "https://avatars.githubusercontent.com/u/2?v=4",
    },
    created_at: "2024-01-15T11:00:00Z",
    updated_at: "2024-01-15T11:00:00Z",
    html_url: "https://github.com/owner/repo/issues/1#issuecomment-2",
  },
];

export default function IssueDetailView() {
  const { owner, repo, number } = useParams<{
    owner: string;
    repo: string;
    number: string;
  }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { theme } = useUIStore();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const newCommentEditorRef = useRef<UncontrolledMarkdownEditorRef>(null);
  const [editingIssue, setEditingIssue] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const editCommentEditorRef = useRef<UncontrolledMarkdownEditorRef>(null);
  const editIssueEditorRef = useRef<UncontrolledMarkdownEditorRef>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showCommentMenu, setShowCommentMenu] = useState<number | null>(null);

  useEffect(() => {
    if (owner && repo && number) {
      loadIssueData();
      loadCurrentUser();
    }
  }, [owner, repo, number, token]);

  const loadCurrentUser = async () => {
    try {
      if (!token || token === "dev-token") {
        setCurrentUser("dev-user");
      } else {
        const api = new GitHubAPI(token);
        const user = await api.getCurrentUser();
        setCurrentUser(user.login);
      }
    } catch (error) {
      console.error("Failed to load current user:", error);
    }
  };

  const loadIssueData = async () => {
    setLoading(true);

    try {
      if (!token || token === "dev-token") {
        const issueNumber = parseInt(number || "0");
        const mockIssue =
          mockIssues.find((i) => i.number === issueNumber) || mockIssues[0];

        setIssue(mockIssue as any);
        setComments(mockComments);
      } else if (owner && repo && number) {
        const api = new GitHubAPI(token);
        const issueNumber = parseInt(number);

        const [issueData, commentsData] = await Promise.all([
          api.getIssue(owner, repo, issueNumber),
          api.getIssueComments(owner, repo, issueNumber),
        ]);

        setIssue(issueData);
        setComments(commentsData);
      }
    } catch (error) {
      console.error("Failed to load issue data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Memoize callbacks to prevent unnecessary re-renders

  const handleSubmitComment = async () => {
    const commentText = newCommentEditorRef.current?.getValue() || "";
    if (!commentText.trim() || !owner || !repo || !number) return;

    setSubmittingComment(true);
    try {
      if (!token || token === "dev-token") {
        // Mock comment for dev mode
        const mockComment: Comment = {
          id: Date.now(),
          body: commentText,
          user: {
            login: "dev-user",
            avatar_url: "https://avatars.githubusercontent.com/u/0?v=4",
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          html_url: `https://github.com/${owner}/${repo}/issues/${number}#issuecomment-${Date.now()}`,
        };
        setComments([...comments, mockComment]);
        newCommentEditorRef.current?.clear();
      } else {
        const api = new GitHubAPI(token);
        const comment = await api.createIssueComment(
          owner,
          repo,
          parseInt(number),
          commentText,
        );
        setComments([...comments, comment]);
        newCommentEditorRef.current?.clear();
      }
    } catch (error) {
      console.error("Failed to submit comment:", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateIssue = async () => {
    const issueText = editIssueEditorRef.current?.getValue() || "";
    if (!issueText.trim() || !owner || !repo || !number || !issue) return;

    try {
      if (!token || token === "dev-token") {
        setIssue({ ...issue, body: issueText });
        setEditingIssue(false);
      } else {
        const api = new GitHubAPI(token);
        const updatedIssue = await api.updateIssue(
          owner,
          repo,
          parseInt(number),
          issueText,
        );
        setIssue(updatedIssue);
        setEditingIssue(false);
      }
    } catch (error) {
      console.error("Failed to update issue:", error);
    }
  };

  const handleUpdateComment = async (
    commentId: number,
    commentText?: string,
  ) => {
    const text = commentText || editCommentEditorRef.current?.getValue() || "";
    if (!text.trim() || !owner || !repo) return;

    try {
      if (!token || token === "dev-token") {
        setComments(
          comments.map((c) => (c.id === commentId ? { ...c, body: text } : c)),
        );
        setEditingCommentId(null);
      } else {
        const api = new GitHubAPI(token);
        const updatedComment = await api.updateIssueComment(
          owner,
          repo,
          commentId,
          text,
        );
        setComments(
          comments.map((c) => (c.id === commentId ? updatedComment : c)),
        );
        setEditingCommentId(null);
      }
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!owner || !repo) return;

    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      if (!token || token === "dev-token") {
        setComments(comments.filter((c) => c.id !== commentId));
      } else {
        const api = new GitHubAPI(token);
        await api.deleteIssueComment(owner, repo, commentId);
        setComments(comments.filter((c) => c.id !== commentId));
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const startEditingIssue = () => {
    setEditingIssue(true);
    // Set the initial value after the component mounts
    setTimeout(() => {
      editIssueEditorRef.current?.setValue(issue?.body || "");
    }, 0);
  };

  const startEditingComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setShowCommentMenu(null);
    // Set the initial value after the component mounts
    setTimeout(() => {
      editCommentEditorRef.current?.setValue(comment.body);
    }, 0);
  };

  // Optimized cancel handlers to prevent re-renders
  const cancelEditIssue = useCallback(() => setEditingIssue(false), []);
  const cancelEditComment = useCallback(() => setEditingCommentId(null), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className={cn(theme === "dark" ? "text-gray-400" : "text-gray-600")}
        >
          Loading issue...
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className={cn(theme === "dark" ? "text-gray-400" : "text-gray-600")}
        >
          Issue not found
        </div>
      </div>
    );
  }

  const isAuthor = (userLogin: string) => currentUser === userLogin;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={cn(
          "p-4 border-b",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-gray-50 border-gray-200",
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/issues")}
              className={cn(
                "p-1 rounded transition-colors",
                theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100",
              )}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              {issue.state === "open" ? (
                <span className="flex items-center" title="Open">
                  <AlertCircle className="w-5 h-5 text-green-400" />
                </span>
              ) : (
                <span className="flex items-center" title="Closed">
                  <CheckCircle className="w-5 h-5 text-purple-400" />
                </span>
              )}

              <h1 className="text-lg font-semibold">
                {issue.title}
                <span
                  className={cn(
                    "ml-2 text-sm",
                    theme === "dark" ? "text-gray-500" : "text-gray-600",
                  )}
                >
                  #{issue.number}
                </span>
              </h1>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center space-x-4 text-sm ml-12",
            theme === "dark" ? "text-gray-400" : "text-gray-600",
          )}
        >
          <div className="flex items-center space-x-2">
            <img
              src={issue.user.avatar_url}
              alt={issue.user.login}
              className="w-5 h-5 rounded-full"
            />
            <span>{issue.user.login} opened this issue</span>
          </div>

          <span>
            {formatDistanceToNow(new Date(issue.created_at), {
              addSuffix: true,
            })}
          </span>

          <div className="flex items-center space-x-1">
            <MessageSquare className="w-4 h-4" />
            <span>{comments.length} comments</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-6">
            {/* Main content */}
            <div className="flex-1 space-y-4">
              {/* Issue Body */}
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
                        onClick={cancelEditIssue}
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
                        onClick={handleUpdateIssue}
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
                        onClick={startEditingIssue}
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
                      <MemoizedMarkdown content={issue.body} />
                    ) : (
                      <p className="text-gray-500 italic">
                        No description provided.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Comments */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    isAuthor={isAuthor(comment.user.login)}
                    isEditing={editingCommentId === comment.id}
                    onStartEdit={() => startEditingComment(comment)}
                    onCancelEdit={cancelEditComment}
                    onUpdate={(text) => {
                      handleUpdateComment(comment.id, text);
                    }}
                    onDelete={() => {
                      handleDeleteComment(comment.id);
                      setShowCommentMenu(null);
                    }}
                    showMenu={showCommentMenu === comment.id}
                    onToggleMenu={() =>
                      setShowCommentMenu(
                        showCommentMenu === comment.id ? null : comment.id,
                      )
                    }
                    theme={theme}
                  />
                ))}
              </div>

              {/* New Comment Form */}
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
                      onClick={handleSubmitComment}
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
                      <span>
                        {submittingComment ? "Commenting..." : "Comment"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
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
                    issue.assignees.map((a) => (
                      <div
                        key={a.login}
                        className="flex items-center space-x-2 mb-1"
                      >
                        <img
                          src={a.avatar_url}
                          alt={a.login}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-sm">{a.login}</span>
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
                    Labels
                  </h3>
                  {issue.labels.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {issue.labels.map((l) => (
                        <span
                          key={l.name}
                          className="px-2 py-0.5 text-xs rounded"
                          style={{
                            backgroundColor: `#${l.color}30`,
                            color: `#${l.color}`,
                          }}
                        >
                          {l.name}
                        </span>
                      ))}
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
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
