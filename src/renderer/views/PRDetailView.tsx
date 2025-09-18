import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { DiffEditor } from "../components/DiffEditor";
import { ConversationTab } from "../components/ConversationTab";
import { useAuthStore } from "../stores/authStore";
import {
  GitHubAPI,
  PullRequest,
  File,
  Comment,
  Review,
} from "../services/github";
import { cn } from "../utils/cn";
import {
  mockPullRequests,
  mockFiles,
  mockComments,
  mockReviews,
  mockReviewComments,
} from "../mockData";
import { useUIStore } from "../stores/uiStore";

// Import new components
import {
  PRHeader,
  PRTabs,
  FileTree,
  MergeConfirmDialog,
  RequestChangesDialog,
  usePRNavigation,
} from "../components/pr-detail";

export default function PRDetailView() {
  const { owner, repo, number } = useParams<{
    owner: string;
    repo: string;
    number: string;
  }>();
  const { token } = useAuthStore();
  const { theme } = useUIStore();

  // Use the navigation hook
  const { navigationState, fetchSiblingPRs } = usePRNavigation(
    owner,
    repo,
    number,
  );

  const [activeTab, setActiveTab] = useState<"conversation" | "files">("files");
  const [pr, setPR] = useState<PullRequest | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviewComments, setReviewComments] = useState<Comment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewedFiles, setViewedFiles] = useState<Set<string>>(new Set());
  const [fileContent, setFileContent] = useState<{
    original: string;
    modified: string;
  } | null>(null);
  const [fileListWidth, setFileListWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const fileListRef = useRef<HTMLDivElement>(null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeMethod, setMergeMethod] = useState<"merge" | "squash" | "rebase">(
    "merge",
  );
  const [currentUser, setCurrentUser] = useState<{
    login: string;
    avatar_url?: string;
  } | null>(null);
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [requestChangesFeedback, setRequestChangesFeedback] = useState("");

  useEffect(() => {
    // Load data even without token if in dev mode
    if (!window.electron || (owner && repo && number)) {
      loadPRData();
    }

    // Load current user if we have a token
    if (token) {
      const api = new GitHubAPI(token);
      api
        .getCurrentUser()
        .then((user) => {
          setCurrentUser(user);
        })
        .catch((err) => {
          console.error("Failed to get current user:", err);
        });
    }
  }, [owner, repo, number, token]);

  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      handleFileSelect(files[0]);
    }
  }, [files, selectedFile]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setFileContent(null);

    if (token && owner && repo && pr) {
      try {
        const api = new GitHubAPI(token);
        const [original, modified] = await Promise.all([
          file.status === "added"
            ? Promise.resolve("")
            : api.getFileContent(owner, repo, file.filename, pr.base.sha),
          file.status === "removed"
            ? Promise.resolve("")
            : api.getFileContent(owner, repo, file.filename, pr.head.sha),
        ]);
        setFileContent({ original, modified });
      } catch (error) {
        console.error("Failed to fetch file content:", error);
        // Fallback to patch if content fetch fails
        setFileContent(null);
      }
    }
  };

  const loadPRData = async () => {
    setLoading(true);

    try {
      // Use mock data if Electron API is not available
      if (!window.electron || !token) {
        const prNumber = parseInt(number || "0");
        const mockPR =
          mockPullRequests.find((pr) => pr.number === prNumber) ||
          mockPullRequests[0];

        setPR(mockPR as any);
        setFiles(mockFiles as any);
        setComments(mockComments as any);
        setReviews(mockReviews as any);
        setReviewComments(mockReviewComments as any);

        if (mockFiles.length > 0) {
          setSelectedFile(mockFiles[0] as any);
        }
      } else if (token && owner && repo && number) {
        const api = new GitHubAPI(token);
        const prNumber = parseInt(number);

        const [
          prData,
          filesData,
          commentsData,
          reviewsData,
          reviewCommentsData,
        ] =
          await Promise.all([
            api.getPullRequest(owner, repo, prNumber),
            api.getPullRequestFiles(owner, repo, prNumber),
            api.getPullRequestConversationComments(owner, repo, prNumber),
            api.getPullRequestReviews(owner, repo, prNumber),
            api.getPullRequestReviewComments(owner, repo, prNumber),
          ]);

        setPR(prData);
        setFiles(filesData);
        setComments(commentsData);
        setReviews(reviewsData);
        setReviewComments(reviewCommentsData);

        // If we don't have navigation state yet, try to fetch sibling PRs
        if (!navigationState?.siblingPRs) {
          fetchSiblingPRs(prData);
        }
      }
    } catch (error) {
      console.error("Failed to load PR data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!pr || !token || !owner || !repo || !currentUser) return;

    setIsApproving(true);

    // Optimistically update the PR state immediately
    const updatedPR = {
      ...pr,
      approvalStatus: "approved" as const,
      approvedBy: [
        ...(pr.approvedBy || []),
        { login: currentUser.login, avatar_url: currentUser.avatar_url || "" },
      ],
      // Remove from changes requested if present
      changesRequestedBy:
        pr.changesRequestedBy?.filter((r) => r.login !== currentUser.login) ||
        [],
    };
    setPR(updatedPR);

    try {
      const api = new GitHubAPI(token);

      // Create approval review
      await api.createReview(
        owner,
        repo,
        pr.number,
        "", // Empty body for simple approval
        "APPROVE",
      );

      // Reload PR data to get the actual server state
      await loadPRData();

      console.log("Successfully approved PR #" + pr.number);
    } catch (error: any) {
      console.error("Failed to approve PR:", error);

      // Revert the optimistic update on error
      setPR(pr);

      // Provide more detailed error message
      let errorMessage = "Failed to approve pull request.";

      if (error?.response?.status === 422) {
        errorMessage =
          "Unable to approve: You may have already reviewed this PR, or you cannot approve your own pull request.";
      } else if (error?.response?.status === 403) {
        errorMessage =
          "You do not have permission to approve this pull request.";
      } else if (error?.response?.data?.message) {
        errorMessage = `Failed to approve: ${error.response.data.message}`;
      } else if (error?.message) {
        errorMessage = `Failed to approve: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!pr || !token || !owner || !repo) return;
    setShowRequestChangesModal(true);
  };

  const submitRequestChanges = async () => {
    if (
      !pr ||
      !token ||
      !owner ||
      !repo ||
      !requestChangesFeedback.trim() ||
      !currentUser
    ) {
      return;
    }

    setIsApproving(true);
    setShowRequestChangesModal(false);

    // Optimistically update the PR state immediately
    const updatedPR = {
      ...pr,
      approvalStatus: "changes_requested" as const,
      changesRequestedBy: [
        ...(pr.changesRequestedBy || []),
        { login: currentUser.login, avatar_url: currentUser.avatar_url || "" },
      ],
      // Remove from approved if present
      approvedBy:
        pr.approvedBy?.filter((r) => r.login !== currentUser.login) || [],
    };
    setPR(updatedPR);

    try {
      const api = new GitHubAPI(token);

      // Create review requesting changes
      await api.createReview(
        owner,
        repo,
        pr.number,
        requestChangesFeedback,
        "REQUEST_CHANGES",
      );

      // Clear the feedback for next time
      setRequestChangesFeedback("");

      // Reload PR data to get the actual server state
      await loadPRData();

      console.log("Successfully requested changes for PR #" + pr.number);
    } catch (error: any) {
      console.error("Failed to request changes:", error);

      // Revert the optimistic update on error
      setPR(pr);

      let errorMessage = "Failed to request changes.";

      if (error?.response?.status === 422) {
        errorMessage =
          "Unable to request changes: You may have already reviewed this PR, or you cannot review your own pull request.";
      } else if (error?.response?.status === 403) {
        errorMessage =
          "You do not have permission to review this pull request.";
      } else if (error?.response?.data?.message) {
        errorMessage = `Failed to request changes: ${error.response.data.message}`;
      } else if (error?.message) {
        errorMessage = `Failed to request changes: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setIsApproving(false);
    }
  };

  const handleMerge = async () => {
    if (!pr || !token || !owner || !repo) return;

    setIsMerging(true);
    try {
      const api = new GitHubAPI(token);
      await api.mergePullRequest(
        owner,
        repo,
        pr.number,
        mergeMethod,
        pr.title,
        pr.body || undefined,
      );

      setShowMergeConfirm(false);
      // Reload PR data to reflect the merge
      await loadPRData();
    } catch (error) {
      console.error("Failed to merge PR:", error);
      alert(
        "Failed to merge pull request. Please check if the PR is mergeable and try again.",
      );
    } finally {
      setIsMerging(false);
    }
  };

  const toggleFileViewed = (filename: string) => {
    const newViewed = new Set(viewedFiles);
    if (newViewed.has(filename)) {
      newViewed.delete(filename);
    } else {
      newViewed.add(filename);
    }
    setViewedFiles(newViewed);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth =
        e.clientX - (fileListRef.current?.getBoundingClientRect().left || 0);
      if (newWidth >= 200 && newWidth <= 600) {
        setFileListWidth(newWidth);
      }
    },
    [isResizing],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className={cn(theme === "dark" ? "text-gray-400" : "text-gray-600")}
        >
          Loading pull request...
        </div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className={cn(theme === "dark" ? "text-gray-400" : "text-gray-600")}
        >
          Pull request not found
        </div>
      </div>
    );
  }

  const fileStats = files.reduce(
    (acc, file) => ({
      additions: acc.additions + file.additions,
      deletions: acc.deletions + file.deletions,
      changed: acc.changed + 1,
    }),
    { additions: 0, deletions: 0, changed: 0 },
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <PRHeader
        pr={pr}
        theme={theme}
        fileStats={fileStats}
        currentUser={currentUser}
        isApproving={isApproving}
        onApprove={handleApprove}
        onRequestChanges={handleRequestChanges}
        onMerge={() => setShowMergeConfirm(true)}
      />

      {/* Tabs */}
      <PRTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        commentsCount={comments.length + reviews.length}
        filesCount={files.length}
        theme={theme}
      />

      {/* Tab Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === "conversation" ? (
          <ConversationTab
            pr={pr}
            comments={comments}
            reviews={reviews}
            onCommentSubmit={() => loadPRData()}
          />
        ) : (
          <>
            {/* File list */}
            <div
              ref={fileListRef}
              className={cn(
                "border-r overflow-y-auto relative",
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-gray-50 border-gray-200",
              )}
              style={{ width: `${fileListWidth}px` }}
            >
              <FileTree
                files={files}
                selectedFile={selectedFile}
                viewedFiles={viewedFiles}
                onFileSelect={handleFileSelect}
                theme={theme}
              />
            </div>

            {/* Resize handle */}
            <div
              className="relative cursor-col-resize group flex-shrink-0"
              style={{
                width: "3px",
                marginLeft: "-1px",
                marginRight: "-1px",
                padding: "0 1px",
              }}
              onMouseDown={handleMouseDown}
            >
              <div
                className={cn(
                  "w-px h-full transition-colors",
                  isResizing && "bg-blue-500",
                  theme === "dark" ? "bg-gray-700" : "bg-gray-300",
                  "group-hover:bg-blue-500",
                )}
              />
              <div
                className={cn(
                  "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                )}
              >
                <div
                  className={cn(
                    "flex space-x-0.5 px-1 py-0.5 rounded",
                    theme === "dark" ? "bg-gray-700" : "bg-gray-200",
                  )}
                >
                  <div
                    className={cn(
                      "w-0.5 h-3 rounded-full",
                      theme === "dark" ? "bg-gray-500" : "bg-gray-400",
                    )}
                  />
                  <div
                    className={cn(
                      "w-0.5 h-3 rounded-full",
                      theme === "dark" ? "bg-gray-500" : "bg-gray-400",
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Diff viewer */}
            <div className="flex-1 overflow-hidden">
              {selectedFile && (
                <DiffEditor
                  file={selectedFile}
                  originalContent={fileContent?.original}
                  modifiedContent={fileContent?.modified}
                  comments={reviewComments.filter(
                    (c) => c.path === selectedFile.filename,
                  )}
                  onMarkViewed={() => toggleFileViewed(selectedFile.filename)}
                  isViewed={viewedFiles.has(selectedFile.filename)}
                  repoOwner={owner || pr?.base.repo.owner.login || ""}
                  repoName={repo || pr?.base.repo.name || ""}
                  pullNumber={pr?.number ?? parseInt(number || "0", 10)}
                  token={token}
                  currentUser={currentUser}
                  onCommentAdded={(newComment) => {
                    setReviewComments((prev) => [...prev, newComment]);
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Merge Confirmation Dialog */}
      {showMergeConfirm && (
        <MergeConfirmDialog
          pr={pr}
          theme={theme}
          mergeMethod={mergeMethod}
          isMerging={isMerging}
          onMergeMethodChange={setMergeMethod}
          onConfirm={handleMerge}
          onCancel={() => setShowMergeConfirm(false)}
        />
      )}

      {/* Request Changes Modal */}
      {showRequestChangesModal && (
        <RequestChangesDialog
          pr={pr}
          theme={theme}
          feedback={requestChangesFeedback}
          isSubmitting={isApproving}
          onFeedbackChange={setRequestChangesFeedback}
          onSubmit={submitRequestChanges}
          onCancel={() => {
            setShowRequestChangesModal(false);
            setRequestChangesFeedback("");
          }}
        />
      )}
    </div>
  );
}
