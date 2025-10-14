import { useNavigate, useParams } from "react-router-dom";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";
import { IssueHeader } from "./IssueDetailView/components/IssueHeader";
import { IssueBody } from "./IssueDetailView/components/IssueBody";
import { CommentsSection } from "./IssueDetailView/components/CommentsSection";
import { IssueSidebar } from "./IssueDetailView/components/IssueSidebar";
import { useIssueDetailData } from "./IssueDetailView/useIssueDetailData";

export default function IssueDetailView() {
  const { owner, repo, number } = useParams<{
    owner: string;
    repo: string;
    number: string;
  }>();
  const navigate = useNavigate();
  const { theme } = useUIStore();

  const {
    issue,
    comments,
    loading,
    submittingComment,
    editingIssue,
    editingCommentId,
    editingLabels,
    selectedLabels,
    showCommentMenu,
    isClosing,
    isReopening,
    repoLabels,
    newCommentEditorRef,
    editIssueEditorRef,
    setShowCommentMenu,
    setEditingLabels,
    setSelectedLabels,
    startEditingIssue,
    cancelEditIssue,
    startEditingComment,
    cancelEditComment,
    handleSubmitComment,
    handleUpdateIssue,
    handleUpdateComment,
    handleDeleteComment,
    handleCloseIssue,
    handleReopenIssue,
    handleUpdateLabels,
    isAuthor,
  } = useIssueDetailData({ owner, repo, number });

  const handleToggleCommentMenu = (commentId: number) => {
    setShowCommentMenu(showCommentMenu === commentId ? null : commentId);
  };

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

  return (
    <div className="flex flex-col h-full">
      <IssueHeader
        issue={issue}
        commentsCount={comments.length}
        theme={theme}
        onBack={() => navigate("/issues")}
        onCloseIssue={() => handleCloseIssue(owner, repo, number)}
        onReopenIssue={() => handleReopenIssue(owner, repo, number)}
        isClosing={isClosing}
        isReopening={isReopening}
        owner={owner}
        repo={repo}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-6">
            <div className="flex-1 space-y-4">
              <IssueBody
                issue={issue}
                theme={theme}
                editingIssue={editingIssue}
                editIssueEditorRef={editIssueEditorRef}
                onCancelEdit={cancelEditIssue}
                onUpdateIssue={() => handleUpdateIssue(owner, repo, number)}
                onStartEdit={startEditingIssue}
                isAuthor={isAuthor}
              />

              <CommentsSection
                comments={comments}
                theme={theme}
                editingCommentId={editingCommentId}
                onStartEdit={startEditingComment}
                onCancelEdit={cancelEditComment}
                onUpdateComment={(commentId, text) =>
                  handleUpdateComment(commentId, owner, repo, text)
                }
                onDeleteComment={(commentId) =>
                  handleDeleteComment(commentId, owner, repo)
                }
                isAuthor={isAuthor}
                showCommentMenu={showCommentMenu}
                onToggleMenu={handleToggleCommentMenu}
                newCommentEditorRef={newCommentEditorRef}
                onSubmit={() => handleSubmitComment(owner, repo, number)}
                submittingComment={submittingComment}
              />
            </div>

            <IssueSidebar
              issue={issue}
              theme={theme}
              editingLabels={editingLabels}
              onEditLabelsChange={setEditingLabels}
              selectedLabels={selectedLabels}
              onSelectedLabelsChange={setSelectedLabels}
              repoLabels={repoLabels}
              onApplyLabels={() => handleUpdateLabels(owner, repo, number)}
              owner={owner}
              repo={repo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
