import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
// Lazy load DiffEditor to avoid loading Monaco on app startup
const DiffEditor = lazy(() => import("../components/DiffEditor").then(module => ({ default: module.DiffEditor })));
import { ConversationTab } from "../components/ConversationTab";
import { useAuthStore } from "../stores/authStore";
import { usePRStore } from "../stores/prStore";
import {
  GitHubAPI,
  PullRequest,
  File,
  Comment,
  Review,
  ReviewThread,
} from "../services/github";
import { cn } from "../utils/cn";
import {
  mockPullRequests,
  mockFiles,
  mockComments,
  mockReviews,
  mockReviewComments,
  mockReviewThreads,
} from "../mockData";
import { useUIStore } from "../stores/uiStore";
import { getImageMimeType, isImageFile } from "../utils/fileType";

// Import new components
import {
  PRHeader,
  PRTabs,
  CommentsTab,
  FileTree,
  MergeConfirmDialog,
  RequestChangesDialog,
  usePRNavigation,
} from "../components/pr-detail";
import { useSyncStore } from "../stores/syncStore";

export default function PRDetailView() {
  const { owner, repo, number } = useParams<{
    owner: string;
    repo: string;
    number: string;
  }>();
  const { token } = useAuthStore();
  const { theme } = useUIStore();
  const { updatePR, pullRequests } = usePRStore();
  const { lastSyncTime, isSyncing } = useSyncStore();

  // Use the navigation hook
  const { navigationState, fetchSiblingPRs } = usePRNavigation(
    owner,
    repo,
    number,
  );

  const [activeTab, setActiveTab] = useState<"conversation" | "files" | "comments">(
    "files",
  );
  const [pr, setPR] = useState<PullRequest | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviewComments, setReviewComments] = useState<Comment[]>([]);
  const [reviewThreads, setReviewThreads] = useState<ReviewThread[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewedFiles, setViewedFiles] = useState<Set<string>>(new Set());
  const [fileContent, setFileContent] = useState<{
    original?: string;
    modified?: string;
    originalBinaryUrl?: string | null;
    modifiedBinaryUrl?: string | null;
    isBinary?: boolean;
  } | null>(null);
  const [fileListWidth, setFileListWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const fileListRef = useRef<HTMLDivElement>(null);
  const lastHandledSyncTimeRef = useRef<number | null>(
    lastSyncTime ? lastSyncTime.getTime() : null,
  );
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
    setFiles([]);
    setSelectedFile(null);
    setFileContent(null);
    setViewedFiles(new Set<string>());
  }, [owner, repo, number]);

  const handleFileSelect = useCallback(async (file: File) => {
    // Clear content first to trigger loading state
    setFileContent(null);
    // Set selected file - this will trigger DiffEditor to show loading state
    setSelectedFile(file);
    const isImage = isImageFile(file.filename);

    if (token && owner && repo && pr) {
      try {
        const api = new GitHubAPI(token);

        if (isImage) {
          const mimeType =
            getImageMimeType(file.filename) ?? "application/octet-stream";

          const [originalBase64, modifiedBase64] = await Promise.all([
            file.status === "added"
              ? Promise.resolve<string | null>(null)
              : api.getFileContentBase64(
                owner,
                repo,
                file.filename,
                pr.base.sha,
              ),
            file.status === "removed"
              ? Promise.resolve<string | null>(null)
              : api.getFileContentBase64(
                owner,
                repo,
                file.filename,
                pr.head.sha,
              ),
          ]);

          setFileContent({
            isBinary: true,
            originalBinaryUrl: originalBase64
              ? `data:${mimeType};base64,${originalBase64}`
              : null,
            modifiedBinaryUrl: modifiedBase64
              ? `data:${mimeType};base64,${modifiedBase64}`
              : null,
          });
        } else {
          const [original, modified] = await Promise.all([
            file.status === "added"
              ? Promise.resolve("")
              : api.getFileContent(owner, repo, file.filename, pr.base.sha),
            file.status === "removed"
              ? Promise.resolve("")
              : api.getFileContent(owner, repo, file.filename, pr.head.sha),
          ]);
          setFileContent({ original, modified, isBinary: false });
        }
      } catch (error) {
        console.error("Failed to fetch file content:", error);
        // Fallback to patch if content fetch fails
        setFileContent(null);
      }
    } else if (isImage) {
      setFileContent({
        isBinary: true,
        originalBinaryUrl: null,
        modifiedBinaryUrl: null,
      });
    }
  }, [token, owner, repo, pr]);

  useEffect(() => {
    if (files.length === 0) {
      return;
    }

    if (selectedFile) {
      const matchingFile = files.find(
        (file) => file.filename === selectedFile.filename,
      );

      if (matchingFile) {
        if (matchingFile !== selectedFile) {
          handleFileSelect(matchingFile);
        }
        return;
      }
    }

    handleFileSelect(files[0]);
  }, [files, selectedFile, handleFileSelect]);

  const loadPRData = async () => {
    if (!owner || !repo || !number) {
      setLoading(false);
      return;
    }

    // Set loading immediately and clear old data to prevent stale state
    setLoading(true);
    setFiles([]);
    setComments([]);
    setReviews([]);
    setReviewComments([]);
    setReviewThreads([]);

    const prNumber = parseInt(number);
    const prKey = `${owner}/${repo}#${prNumber}`;

    // Always fetch fresh PR data, but preserve protected fields from store
    const { pullRequests } = usePRStore.getState();
    const storedPR = pullRequests.get(prKey);

    try {
      // Use mock data if Electron API is not available
      if (!window.electron || !token) {
        const mockPR =
          mockPullRequests.find((mock) => mock.number === prNumber) ||
          mockPullRequests[0];

        if (mockPR) {
          setPR(mockPR as any);
          updatePR(mockPR as any);
        }

        setFiles(mockFiles as any);
        setComments(mockComments as any);
        setReviews(mockReviews as any);
        setReviewComments(mockReviewComments as any);
        setReviewThreads(mockReviewThreads as any);

        if (mockFiles.length > 0) {
          setSelectedFile(mockFiles[0] as any);
        }
      } else {
        const api = new GitHubAPI(token);

        const [
          prData,
          filesData,
          commentsData,
          reviewsData,
          reviewCommentsData,
          reviewThreadsData,
        ] =
          await Promise.all([
            api.getPullRequest(owner, repo, prNumber),
            api.getPullRequestFiles(owner, repo, prNumber),
            api.getPullRequestConversationComments(owner, repo, prNumber),
            api.getPullRequestReviews(owner, repo, prNumber),
            api.getPullRequestReviewComments(owner, repo, prNumber),
            api.getPullRequestReviewThreads(owner, repo, prNumber),
          ]);

        // Merge fresh API data with protected fields from store
        let mergedPR = prData;
        if (storedPR?.isTogglingDraft) {
          // If actively toggling draft, preserve the draft state and loading flag
          mergedPR = {
            ...prData,
            draft: storedPR.draft,
            isTogglingDraft: storedPR.isTogglingDraft,
          };
        }

        setPR(mergedPR);
        updatePR(mergedPR);
        setFiles(filesData);
        setComments(commentsData);
        setReviews(reviewsData);
        setReviewComments(reviewCommentsData);
        setReviewThreads(reviewThreadsData);

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

  const loadPRDataRef = useRef(loadPRData);

  useEffect(() => {
    loadPRDataRef.current = loadPRData;
  }, [loadPRData]);

  useEffect(() => {
    if (!lastSyncTime || isSyncing) {
      return;
    }

    const currentTimestamp = lastSyncTime.getTime();

    if (lastHandledSyncTimeRef.current === null) {
      lastHandledSyncTimeRef.current = currentTimestamp;
      return;
    }

    if (currentTimestamp !== lastHandledSyncTimeRef.current) {
      lastHandledSyncTimeRef.current = currentTimestamp;
      loadPRDataRef.current();
    }
  }, [isSyncing, lastSyncTime]);

  // Keep local PR state in sync with store
  useEffect(() => {
    if (!pr || !owner || !repo || !number) return;

    const prKey = `${owner}/${repo}#${parseInt(number)}`;
    const storedPR = pullRequests.get(prKey);

    if (storedPR) {
      setPR(storedPR);
    }
  }, [pullRequests, owner, repo, number, pr]);

  const resolveRepoContext = () => {
    const repoOwner = owner || pr?.base.repo.owner.login;
    const repoName = repo || pr?.base.repo.name;
    const pullNumber = pr?.number ?? parseInt(number || "0", 10);

    if (!repoOwner || !repoName || !pullNumber) {
      throw new Error("Missing pull request context");
    }

    return { repoOwner, repoName, pullNumber };
  };

  const handleThreadReply = async (
    _threadId: string,
    commentId: number,
    body: string,
  ) => {
    if (!token) {
      throw new Error("Sign in with GitHub to reply to review comments.");
    }

    const { repoOwner, repoName, pullNumber } = resolveRepoContext();
    const api = new GitHubAPI(token);

    await api.replyToReviewComment(
      repoOwner,
      repoName,
      pullNumber,
      commentId,
      body,
    );

    await loadPRData();
  };

  const handleThreadResolve = async (threadId: string) => {
    if (!token) {
      throw new Error("Sign in with GitHub to resolve review comments.");
    }

    const api = new GitHubAPI(token);

    const updated = await api.updateReviewThreadResolution(
      threadId,
      true,
    );

    setReviewThreads((prev) =>
      prev.map((thread) =>
        thread.id === threadId
          ? {
            ...thread,
            state: updated.state,
          }
          : thread,
      ),
    );
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
    updatePR(updatedPR);

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
      updatePR(pr);

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
    updatePR(updatedPR);

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
      updatePR(pr);

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
      const mergeResult = await api.mergePullRequest(
        owner,
        repo,
        pr.number,
        mergeMethod,
        pr.title,
        pr.body || undefined,
      );

      console.log("PR merged successfully:", mergeResult);

      // Optimistically update the PR state immediately
      const mergedPR = {
        ...pr,
        merged: true,
        state: "closed" as const,
        merged_at: new Date().toISOString(),
        merge_commit_sha: mergeResult.sha || pr.merge_commit_sha,
      };
      setPR(mergedPR);
      updatePR(mergedPR);

      setShowMergeConfirm(false);

      // Reload PR data to get the complete server state
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

  const handleToggleDraft = async () => {
    if (!pr || !token || !owner || !repo || !currentUser) return;

    // Check if user is the PR author
    if (pr.user.login !== currentUser.login) {
      alert("Only the pull request author can change the draft status.");
      return;
    }

    const targetDraftState = !pr.draft;

    console.log("Toggling draft status:", {
      current: pr.draft,
      target: targetDraftState,
      prNumber: pr.number
    });

    // Step 1: Set loading state immediately in the store
    updatePR({
      ...pr,
      isTogglingDraft: true,
    });

    try {
      const api = new GitHubAPI(token);

      // Step 2: Make API call
      const updatedPR = await api.updatePullRequestDraft(
        owner,
        repo,
        pr.number,
        targetDraftState,
      );

      // Step 3: Update store with confirmed data from GitHub
      updatePR({
        ...pr,
        ...updatedPR,
        draft: updatedPR.draft,
        isTogglingDraft: false,
      });

      console.log(
        `Successfully ${targetDraftState ? "converted to draft" : "marked as ready for review"} PR #${pr.number}`,
      );
      console.log("Updated PR draft status:", {
        newDraft: updatedPR.draft,
        expectedDraft: targetDraftState
      });
    } catch (error: any) {
      console.error("Failed to toggle draft status:", error);

      // Revert loading state on error
      updatePR({
        ...pr,
        isTogglingDraft: false,
      });

      let errorMessage = "Failed to update pull request draft status.";

      if (error?.response?.status === 403) {
        errorMessage =
          "You do not have permission to change the draft status of this pull request.";
      } else if (error?.response?.data?.message) {
        errorMessage = `Failed to update: ${error.response.data.message}`;
      } else if (error?.message) {
        errorMessage = `Failed to update: ${error.message}`;
      }

      alert(errorMessage);
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

  const openReviewThreads = reviewThreads.filter(
    (thread) => thread.state !== "resolved",
  );
  const canReplyToThreads = Boolean(token);

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
        onToggleDraft={handleToggleDraft}
        isTogglingDraft={pr.isTogglingDraft || false}
      />

      {/* Tabs */}
      <PRTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        conversationCount={comments.length + reviews.length}
        filesCount={files.length}
        openCommentsCount={openReviewThreads.length}
        theme={theme}
      />

      {/* Tab Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === "conversation" && (
          <ConversationTab
            pr={pr}
            comments={comments}
            reviews={reviews}
            onCommentSubmit={() => loadPRData()}
          />
        )}
        {activeTab === "files" && (
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
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                      Loading editor...
                    </div>
                  </div>
                }>
                  <DiffEditor
                    file={selectedFile}
                    originalContent={fileContent?.original}
                    modifiedContent={fileContent?.modified}
                    originalBinaryContent={fileContent?.originalBinaryUrl ?? undefined}
                    modifiedBinaryContent={fileContent?.modifiedBinaryUrl ?? undefined}
                    isBinary={fileContent?.isBinary ?? false}
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
                </Suspense>
              )}
            </div>
          </>
        )}
        {activeTab === "comments" && (
          <CommentsTab
            threads={reviewThreads}
            theme={theme}
            currentUser={currentUser}
            canReply={canReplyToThreads}
            onReply={handleThreadReply}
            onResolve={handleThreadResolve}
          />
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
