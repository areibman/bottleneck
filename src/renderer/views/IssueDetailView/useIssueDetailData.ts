import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useIssueStore } from "../../stores/issueStore";
import {
  GitHubAPI,
  Issue,
  Comment,
  IssueLinkedBranch,
  IssueLinkedPullRequest,
} from "../../services/github";
import { mockIssues } from "../../mockData";
import {
  UncontrolledMarkdownEditorRef,
} from "../../components/UncontrolledMarkdownEditor";

interface UseIssueDetailParams {
  owner?: string;
  repo?: string;
  number?: string;
}

interface UseIssueDetailResult {
  issue: Issue | null;
  comments: Comment[];
  loading: boolean;
  submittingComment: boolean;
  editingIssue: boolean;
  editingCommentId: number | null;
  editingLabels: boolean;
  selectedLabels: string[];
  showCommentMenu: number | null;
  isClosing: boolean;
  isReopening: boolean;
  currentUser: string | null;
  repoLabels: Array<{ name: string; color: string; description: string | null }>;
  newCommentEditorRef: React.RefObject<UncontrolledMarkdownEditorRef>;
  editIssueEditorRef: React.RefObject<UncontrolledMarkdownEditorRef>;
  setShowCommentMenu: (value: number | null) => void;
  setEditingLabels: (value: boolean) => void;
  setSelectedLabels: (labels: string[]) => void;
  startEditingIssue: () => void;
  cancelEditIssue: () => void;
  startEditingComment: (comment: Comment) => void;
  cancelEditComment: () => void;
  handleSubmitComment: (owner?: string, repo?: string, number?: string) => Promise<void>;
  handleUpdateIssue: (owner?: string, repo?: string, number?: string) => Promise<void>;
  handleUpdateComment: (
    commentId: number,
    owner?: string,
    repo?: string,
    textOverride?: string,
  ) => Promise<void>;
  handleDeleteComment: (commentId: number, owner?: string, repo?: string) => Promise<void>;
  handleCloseIssue: (owner?: string, repo?: string, number?: string) => Promise<void>;
  handleReopenIssue: (owner?: string, repo?: string, number?: string) => Promise<void>;
  handleUpdateLabels: (
    owner?: string,
    repo?: string,
    number?: string,
  ) => Promise<void>;
  isAuthor: (login: string) => boolean;
}

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

export function useIssueDetailData(
  { owner, repo, number }: UseIssueDetailParams,
): UseIssueDetailResult {
  const { token } = useAuthStore();
  const {
    issues,
    fetchRepoLabels,
    repoLabels,
    updateIssue,
    closeIssues,
    reopenIssues,
    setIssueLabels,
  } = useIssueStore();

  // Compute issue key for looking up in the store
  const issueKey = useMemo(() => {
    if (!owner || !repo || !number) return null;
    return `${owner}/${repo}#${number}`;
  }, [owner, repo, number]);

  // Get issue from store instead of local state
  const issue = useMemo(() => {
    if (!issueKey) return null;
    return issues.get(issueKey) || null;
  }, [issues, issueKey]);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingIssue, setEditingIssue] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showCommentMenu, setShowCommentMenu] = useState<number | null>(null);
  const [editingLabels, setEditingLabels] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  const newCommentEditorRef = useRef<UncontrolledMarkdownEditorRef>(null);
  const editIssueEditorRef = useRef<UncontrolledMarkdownEditorRef>(null);

  const loadCurrentUser = useCallback(async () => {
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
  }, [token]);

  const loadIssueData = useCallback(async () => {
    if (!owner || !repo || !number) {
      return;
    }

    setLoading(true);

    try {
      if (!token || token === "dev-token") {
        const issueNumber = parseInt(number || "0", 10);
        const mockIssue =
          mockIssues.find((i) => i.number === issueNumber) || mockIssues[0];
        const repoOwner = owner || "dev-user";
        const repoName = repo || "bottleneck";

        const mockLinkedPullRequests: IssueLinkedPullRequest[] = [
          {
            id: issueNumber * 1000 + 1,
            number: issueNumber + 100,
            title: `feat: Resolve issue ${issueNumber}`,
            state: "open",
            merged: false,
            draft: false,
            head: { ref: `dev/fix-${issueNumber}` },
            url: `https://github.com/${repoOwner}/${repoName}/pull/${issueNumber + 100}`,
            repository: {
              owner: repoOwner,
              name: repoName,
            },
          },
        ];

        const mockLinkedBranches: IssueLinkedBranch[] = [
          {
            id: `mock-branch-${issueNumber}-primary`,
            refName: `dev/fix-${issueNumber}`,
            repository: {
              owner: repoOwner,
              name: repoName,
              url: `https://github.com/${repoOwner}/${repoName}`,
            },
            latestCommit: {
              abbreviatedOid: "abc1234",
              committedDate: new Date().toISOString(),
              messageHeadline: "WIP: Resolve issue locally",
              url: `https://github.com/${repoOwner}/${repoName}/commit/abc1234`,
            },
            associatedPullRequests: mockLinkedPullRequests.map((pr) => ({ ...pr })),
          },
          {
            id: `mock-branch-${issueNumber}-secondary`,
            refName: `feature/${issueNumber}-exploration`,
            repository: {
              owner: repoOwner,
              name: repoName,
              url: `https://github.com/${repoOwner}/${repoName}`,
            },
            associatedPullRequests: [],
          },
        ];

        const issueWithMetadata = {
          ...(mockIssue as Issue),
          repository: {
            owner: { login: repoOwner },
            name: repoName,
          },
          linkedPRs: mockLinkedPullRequests,
          linkedBranches: mockLinkedBranches,
        };

        // Update the global store
        updateIssue(issueWithMetadata);
        setComments(mockComments);
      } else {
        const api = new GitHubAPI(token);
        const issueNumber = parseInt(number, 10);

        const [issueData, commentsData, development] = await Promise.all([
          api.getIssue(owner, repo, issueNumber),
          api.getIssueComments(owner, repo, issueNumber),
          api.getIssueDevelopment(owner, repo, issueNumber),
        ]);

        const issueWithMetadata = {
          ...issueData,
          repository: {
            owner: { login: owner },
            name: repo,
          },
          linkedPRs: development.pullRequests,
          linkedBranches: development.branches,
        };

        // Update the global store
        updateIssue(issueWithMetadata);
        setComments(commentsData);
      }
    } catch (error) {
      console.error("Failed to load issue data:", error);
    } finally {
      setLoading(false);
    }
  }, [owner, repo, number, token, updateIssue]);

  useEffect(() => {
    if (owner && repo && number) {
      loadIssueData();
      loadCurrentUser();
      fetchRepoLabels(owner, repo);
    }
  }, [owner, repo, number, token, fetchRepoLabels, loadIssueData, loadCurrentUser]);

  useEffect(() => {
    if (issue) {
      setSelectedLabels(issue.labels.map((label) => label.name));
    }
  }, [issue]);

  const handleSubmitComment = useCallback(
    async (issueOwner?: string, issueRepo?: string, issueNumber?: string) => {
      const ownerArg = issueOwner ?? owner;
      const repoArg = issueRepo ?? repo;
      const numberArg = issueNumber ?? number;
      const commentText = newCommentEditorRef.current?.getValue() || "";
      if (!commentText.trim() || !ownerArg || !repoArg || !numberArg) return;

      setSubmittingComment(true);
      try {
        if (!token || token === "dev-token") {
          const mockComment: Comment = {
            id: Date.now(),
            body: commentText,
            user: {
              login: "dev-user",
              avatar_url: "https://avatars.githubusercontent.com/u/0?v=4",
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            html_url: `https://github.com/${ownerArg}/${repoArg}/issues/${numberArg}#issuecomment-${Date.now()}`,
          };
          setComments((prev) => [...prev, mockComment]);
          newCommentEditorRef.current?.clear();
        } else {
          const api = new GitHubAPI(token);
          const comment = await api.createIssueComment(
            ownerArg,
            repoArg,
            parseInt(numberArg),
            commentText,
          );
          setComments((prev) => [...prev, comment]);
          newCommentEditorRef.current?.clear();
        }
      } catch (error) {
        console.error("Failed to submit comment:", error);
      } finally {
        setSubmittingComment(false);
      }
    },
    [owner, repo, number, token],
  );

  const handleUpdateIssue = useCallback(
    async (issueOwner?: string, issueRepo?: string, issueNumber?: string) => {
      const ownerArg = issueOwner ?? owner;
      const repoArg = issueRepo ?? repo;
      const numberArg = issueNumber ?? number;
      const issueText = editIssueEditorRef.current?.getValue() || "";
      if (!issueText.trim() || !ownerArg || !repoArg || !numberArg || !issue) return;

      try {
        if (!token || token === "dev-token") {
          const updatedIssue = { ...issue, body: issueText };
          updateIssue(updatedIssue);
          setEditingIssue(false);
        } else {
          const api = new GitHubAPI(token);
          const updatedIssue = await api.updateIssue(
            ownerArg,
            repoArg,
            parseInt(numberArg),
            issueText,
          );
          // Ensure repository metadata is present
          const issueWithMetadata = {
            ...updatedIssue,
            repository: {
              owner: { login: ownerArg },
              name: repoArg,
            },
          };
          updateIssue(issueWithMetadata);
          setEditingIssue(false);
        }
      } catch (error) {
        console.error("Failed to update issue:", error);
      }
    },
    [issue, owner, repo, number, token, updateIssue],
  );

  const handleUpdateComment = useCallback(
    async (
      commentId: number,
      issueOwner?: string,
      issueRepo?: string,
      textOverride?: string,
    ) => {
      const ownerArg = issueOwner ?? owner;
      const repoArg = issueRepo ?? repo;
      const text = textOverride ?? "";
      if (!text.trim() || !ownerArg || !repoArg) return;

      try {
        if (!token || token === "dev-token") {
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === commentId ? { ...comment, body: text } : comment,
            ),
          );
          setEditingCommentId(null);
        } else {
          const api = new GitHubAPI(token);
          const updatedComment = await api.updateIssueComment(
            ownerArg,
            repoArg,
            commentId,
            text,
          );
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === commentId ? updatedComment : comment,
            ),
          );
          setEditingCommentId(null);
        }
      } catch (error) {
        console.error("Failed to update comment:", error);
      }
    },
    [owner, repo, token],
  );

  const handleDeleteComment = useCallback(
    async (commentId: number, issueOwner?: string, issueRepo?: string) => {
      const ownerArg = issueOwner ?? owner;
      const repoArg = issueRepo ?? repo;
      if (!ownerArg || !repoArg) return;

      if (!confirm("Are you sure you want to delete this comment?")) return;

      try {
        if (!token || token === "dev-token") {
          setComments((prev) => prev.filter((comment) => comment.id !== commentId));
        } else {
          const api = new GitHubAPI(token);
          await api.deleteIssueComment(ownerArg, repoArg, commentId);
          setComments((prev) => prev.filter((comment) => comment.id !== commentId));
        }
      } catch (error) {
        console.error("Failed to delete comment:", error);
      }
    },
    [owner, repo, token],
  );

  const handleCloseIssue = useCallback(
    async (issueOwner?: string, issueRepo?: string, issueNumber?: string) => {
      const ownerArg = issueOwner ?? owner;
      const repoArg = issueRepo ?? repo;
      const numberArg = issueNumber ?? number;
      if (!ownerArg || !repoArg || !numberArg) return;

      setIsClosing(true);
      try {
        // Use the store action which handles both dev and real API calls
        await closeIssues(ownerArg, repoArg, [parseInt(numberArg)]);
      } catch (error) {
        console.error("Failed to close issue:", error);
      } finally {
        setIsClosing(false);
      }
    },
    [owner, repo, number, closeIssues],
  );

  const handleReopenIssue = useCallback(
    async (issueOwner?: string, issueRepo?: string, issueNumber?: string) => {
      const ownerArg = issueOwner ?? owner;
      const repoArg = issueRepo ?? repo;
      const numberArg = issueNumber ?? number;
      if (!ownerArg || !repoArg || !numberArg) return;

      setIsReopening(true);
      try {
        // Use the store action which handles both dev and real API calls
        await reopenIssues(ownerArg, repoArg, [parseInt(numberArg)]);
      } catch (error) {
        console.error("Failed to reopen issue:", error);
      } finally {
        setIsReopening(false);
      }
    },
    [owner, repo, number, reopenIssues],
  );

  const handleUpdateLabels = useCallback(
    async (issueOwner?: string, issueRepo?: string, issueNumber?: string) => {
      const ownerArg = issueOwner ?? owner;
      const repoArg = issueRepo ?? repo;
      const numberArg = issueNumber ?? number;
      if (!ownerArg || !repoArg || !numberArg) return;

      try {
        // Use the store action which handles both dev and real API calls
        await setIssueLabels(ownerArg, repoArg, parseInt(numberArg), selectedLabels);
        setEditingLabels(false);
      } catch (error) {
        console.error("Failed to update labels:", error);
      }
    },
    [owner, repo, number, selectedLabels, setIssueLabels],
  );

  const startEditingIssue = useCallback(() => {
    setEditingIssue(true);
    setTimeout(() => {
      editIssueEditorRef.current?.setValue(issue?.body || "");
    }, 0);
  }, [issue]);

  const startEditingComment = useCallback((comment: Comment) => {
    setEditingCommentId(comment.id);
    setShowCommentMenu(null);
  }, []);

  const cancelEditIssue = useCallback(() => setEditingIssue(false), []);
  const cancelEditComment = useCallback(() => setEditingCommentId(null), []);

  const isAuthor = useCallback(
    (login: string) => currentUser === login,
    [currentUser],
  );

  return {
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
    currentUser,
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
  };
}
