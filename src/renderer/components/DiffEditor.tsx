import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { DiffEditor as MonacoDiffEditor } from "@monaco-editor/react";
import {
  Eye,
  MessageSquare,
  Columns,
  FileText,
  Check,
  WrapText,
  WholeWord,
  FilePlus,
  FileMinus,
  FileEdit,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type {
  editor as MonacoEditorType,
  IDisposable,
} from "monaco-editor";
import { formatDistanceToNow } from "date-fns";
import { File, Comment, GitHubAPI } from "../services/github";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";
import { monaco } from "../utils/monaco-loader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type CommentSide = "LEFT" | "RIGHT";

interface CommentTarget {
  lineNumber: number;
  side: CommentSide;
  startLineNumber?: number | null;
  endLineNumber?: number | null;
}

interface InlineCommentThread {
  id: number;
  side: CommentSide;
  lineNumber: number;
  startLineNumber?: number | null;
  endLineNumber?: number | null;
  comments: Comment[];
}

interface DiffEditorProps {
  file: File;
  originalContent?: string;
  modifiedContent?: string;
  comments: Comment[];
  onMarkViewed: () => void;
  isViewed: boolean;
  repoOwner: string;
  repoName: string;
  pullNumber: number;
  token: string | null;
  currentUser: { login: string; avatar_url?: string } | null;
  onCommentAdded?: (comment: Comment) => void;
}

const determineCommentSide = (comment: Comment): CommentSide => {
  if (comment.side === "LEFT" || comment.side === "RIGHT") {
    return comment.side;
  }
  if (comment.original_line && !comment.line) {
    return "LEFT";
  }
  return "RIGHT";
};

const getLineNumberForSide = (
  comment: Comment,
  side: CommentSide,
): number | null => {
  if (side === "LEFT") {
    return comment.original_line ?? null;
  }
  return comment.line ?? null;
};

const buildThreads = (comments: Comment[]): InlineCommentThread[] => {
  if (!comments || comments.length === 0) {
    return [];
  }

  const replies = new Map<number, Comment[]>();
  comments.forEach((comment) => {
    if (comment.in_reply_to_id) {
      if (!replies.has(comment.in_reply_to_id)) {
        replies.set(comment.in_reply_to_id, []);
      }
      replies.get(comment.in_reply_to_id)!.push(comment);
    }
  });

  const threads: InlineCommentThread[] = [];

  comments
    .filter((comment) => !comment.in_reply_to_id)
    .forEach((root) => {
      const side = determineCommentSide(root);
      const lineNumber = getLineNumberForSide(root, side);

      if (!lineNumber || lineNumber <= 0) {
        return;
      }

      const threadComments = [root, ...(replies.get(root.id) || [])].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      const startLineNumber =
        side === "LEFT"
          ? root.original_start_line ?? root.start_line ?? null
          : root.start_line ?? root.original_start_line ?? null;
      const endLineNumber =
        side === "LEFT"
          ? root.original_line ?? root.line ?? lineNumber
          : root.line ?? root.original_line ?? lineNumber;
      const normalizedStart = Math.min(
        startLineNumber ?? lineNumber,
        endLineNumber ?? lineNumber,
      );
      const normalizedEnd = Math.max(
        startLineNumber ?? lineNumber,
        endLineNumber ?? lineNumber,
      );

      threads.push({
        id: root.id,
        side,
        lineNumber: normalizedEnd,
        startLineNumber: normalizedStart,
        endLineNumber: normalizedEnd,
        comments: threadComments,
      });
    });

  return threads.sort((a, b) => a.lineNumber - b.lineNumber);
};

export function DiffEditor({
  file,
  originalContent,
  modifiedContent,
  comments,
  onMarkViewed,
  isViewed,
  repoOwner,
  repoName,
  pullNumber,
  token,
  currentUser,
  onCommentAdded,
}: DiffEditorProps) {
  const {
    diffView,
    showWhitespace,
    wordWrap,
    toggleDiffView,
    toggleWhitespace,
    toggleWordWrap,
    theme,
  } = useUIStore();

  const diffEditorRef =
    useRef<MonacoEditorType.IStandaloneDiffEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const disposablesRef = useRef<IDisposable[]>([]);
  const commentDecorationsRef = useRef<{ original: string[]; modified: string[] }>(
    { original: [], modified: [] },
  );
  const hoverDecorationsRef = useRef<{ original: string[]; modified: string[] }>(
    { original: [], modified: [] },
  );
  const lineHighlightDecorationsRef = useRef<{
    original: string[];
    modified: string[];
  }>({ original: [], modified: [] });
  const threadsRef = useRef<InlineCommentThread[]>([]);

  const [patchOriginalContent, setPatchOriginalContent] = useState("");
  const [patchModifiedContent, setPatchModifiedContent] = useState("");
  const [showFullFile, setShowFullFile] = useState(false);
  const [diffEditorReady, setDiffEditorReady] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<
    | { type: "new"; target: CommentTarget }
    | { type: "thread"; target: CommentTarget; threadId: number }
    | null
  >(null);
  const [overlayPosition, setOverlayPosition] = useState<
    | { top: number; left: number }
    | null
  >(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentTab, setCommentTab] = useState<"write" | "preview">("write");

  useEffect(() => {
    setShowFullFile(false);

    if (file.patch) {
      const { original, modified } = parsePatch(file.patch);
      setPatchOriginalContent(original);
      setPatchModifiedContent(modified);
    } else {
      setPatchOriginalContent("");
      setPatchModifiedContent("");
    }
  }, [file.patch, file.filename]);

  const commentThreads = useMemo(() => buildThreads(comments), [comments]);

  useEffect(() => {
    threadsRef.current = commentThreads;
  }, [commentThreads]);

  useEffect(() => {
    setActiveOverlay(null);
    setCommentDraft("");
    setCommentError(null);
  }, [file.filename]);

  useEffect(() => {
    setCommentTab("write");
  }, [activeOverlay]);

  const clearHoverDecoration = useCallback((side: CommentSide) => {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor) return;

    const editor =
      side === "LEFT"
        ? diffEditor.getOriginalEditor()
        : diffEditor.getModifiedEditor();
    const key = side === "LEFT" ? "original" : "modified";
    hoverDecorationsRef.current[key] = editor.deltaDecorations(
      hoverDecorationsRef.current[key],
      [],
    );
  }, []);

  useEffect(() => {
    if (!diffEditorRef.current || !monaco) return;

    const diffEditor = diffEditorRef.current;
    const originalEditor = diffEditor.getOriginalEditor();
    const modifiedEditor = diffEditor.getModifiedEditor();

    const lineDecoration = (thread: InlineCommentThread) => {
      const startLine = thread.startLineNumber ?? thread.lineNumber;
      const endLine = thread.endLineNumber ?? thread.lineNumber;
      const decorations = [] as monaco.editor.IModelDeltaDecoration[];
      for (let current = startLine; current <= endLine; current++) {
        const isStart = current === startLine;
        const isEnd = current === endLine;
        const classNames = ["comment-thread-decoration"];
        if (isStart) {
          classNames.push("comment-thread-decoration-start");
        }
        if (!isStart && !isEnd) {
          classNames.push("comment-thread-decoration-middle");
        }
        if (isEnd && !isStart) {
          classNames.push("comment-thread-decoration-end");
        }
        decorations.push({
          range: new monaco.Range(current, 1, current, 1),
          options: {
            isWholeLine: true,
            linesDecorationsClassName: classNames.join(" "),
            hoverMessage:
              current === startLine
                ? {
                  value: `${thread.comments.length} comment${
                    thread.comments.length === 1 ? "" : "s"
                  }`,
                }
                : undefined,
          },
        });
      }
      return decorations;
    };

    commentDecorationsRef.current.original = originalEditor.deltaDecorations(
      commentDecorationsRef.current.original,
      commentThreads
        .filter((thread) => thread.side === "LEFT")
        .flatMap(lineDecoration),
    );

    commentDecorationsRef.current.modified = modifiedEditor.deltaDecorations(
      commentDecorationsRef.current.modified,
      commentThreads
        .filter((thread) => thread.side === "RIGHT")
        .flatMap(lineDecoration),
    );
  }, [commentThreads]);

  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((sub) => sub.dispose());
      disposablesRef.current = [];

      if (!diffEditorRef.current) return;

      const diffEditor = diffEditorRef.current;
      const originalEditor = diffEditor.getOriginalEditor();
      const modifiedEditor = diffEditor.getModifiedEditor();

      originalEditor.deltaDecorations(
        commentDecorationsRef.current.original,
        [],
      );
      modifiedEditor.deltaDecorations(
        commentDecorationsRef.current.modified,
        [],
      );
      originalEditor.deltaDecorations(hoverDecorationsRef.current.original, []);
      modifiedEditor.deltaDecorations(hoverDecorationsRef.current.modified, []);
      originalEditor.deltaDecorations(
        lineHighlightDecorationsRef.current.original,
        [],
      );
      modifiedEditor.deltaDecorations(
        lineHighlightDecorationsRef.current.modified,
        [],
      );
    };
  }, []);

  const getSelectionRangeForSide = useCallback(
    (side: CommentSide) => {
      if (!diffEditorRef.current) return null;
      const editor =
        side === "LEFT"
          ? diffEditorRef.current.getOriginalEditor()
          : diffEditorRef.current.getModifiedEditor();
      const selection = editor.getSelection();
      if (!selection || selection.isEmpty()) {
        return null;
      }
      const start = Math.min(
        selection.startLineNumber,
        selection.endLineNumber,
      );
      const end = Math.max(selection.startLineNumber, selection.endLineNumber);
      if (start === end) {
        return { start, end };
      }
      return { start, end };
    },
    [],
  );

  const handleMouseDown = useCallback(
    (side: CommentSide) =>
      (e: MonacoEditorType.IEditorMouseEvent) => {
        if (
          e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
          e.target.type !==
            monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS &&
          e.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
        ) {
          return;
        }

        if (!e.event.leftButton) return;

        const lineNumber = e.target.position?.lineNumber;
        if (!lineNumber) return;

        const selectionRange = getSelectionRangeForSide(side);
        const startRange = selectionRange ? selectionRange.start : lineNumber;
        const endRange = selectionRange ? selectionRange.end : lineNumber;
        const constrainedStart = Math.min(startRange, endRange);
        const constrainedEnd = Math.max(startRange, endRange);
        const targetLineNumber = Math.max(lineNumber, constrainedEnd);

        const target: CommentTarget = {
          lineNumber: targetLineNumber,
          startLineNumber:
            constrainedStart !== constrainedEnd ? constrainedStart : undefined,
          endLineNumber:
            constrainedStart !== constrainedEnd ? constrainedEnd : undefined,
          side,
        };

        const existingThread = threadsRef.current.find((thread) => {
          if (thread.side !== side) return false;
          const start = thread.startLineNumber ?? thread.lineNumber;
          const end = thread.endLineNumber ?? thread.lineNumber;
          return lineNumber >= start && lineNumber <= end;
        });

        if (existingThread) {
          setActiveOverlay({
            type: "thread",
            threadId: existingThread.id,
            target: {
              lineNumber: existingThread.lineNumber,
              startLineNumber: existingThread.startLineNumber,
              endLineNumber: existingThread.endLineNumber,
              side: existingThread.side,
            },
          });
        } else {
          const withinRange =
            lineNumber >= constrainedStart && lineNumber <= constrainedEnd;
          const finalTarget = withinRange ? target : { lineNumber, side };
          setActiveOverlay({
            type: "new",
            target: finalTarget,
          });
        }

        setCommentDraft("");
        setCommentError(null);
        e.event.preventDefault();
        e.event.stopPropagation();
      },
    [],
  );

  const handleMouseMove = useCallback(
    (side: CommentSide) =>
      (e: MonacoEditorType.IEditorMouseEvent) => {
        const diffEditor = diffEditorRef.current;
        if (!diffEditor || !monaco) return;

        if (
          e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
          e.target.type !==
            monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS &&
          e.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
        ) {
          clearHoverDecoration(side);
          return;
        }

        const lineNumber = e.target.position?.lineNumber;
        if (!lineNumber) return;

        const editor =
          side === "LEFT"
            ? diffEditor.getOriginalEditor()
            : diffEditor.getModifiedEditor();
        const key = side === "LEFT" ? "original" : "modified";

        const existingThread = threadsRef.current.some((thread) => {
          if (thread.side !== side) return false;
          const start = thread.startLineNumber ?? thread.lineNumber;
          const end = thread.endLineNumber ?? thread.lineNumber;
          return lineNumber >= start && lineNumber <= end;
        });

        if (existingThread) {
          clearHoverDecoration(side);
          return;
        }

        hoverDecorationsRef.current[key] = editor.deltaDecorations(
          hoverDecorationsRef.current[key],
          [
            {
              range: new monaco.Range(lineNumber, 1, lineNumber, 1),
              options: {
                isWholeLine: true,
                linesDecorationsClassName: "comment-hover-decoration",
              },
            },
          ],
        );
      },
    [clearHoverDecoration],
  );

  const handleMouseLeave = useCallback(
    (side: CommentSide) => () => {
      clearHoverDecoration(side);
    },
    [clearHoverDecoration],
  );

  useEffect(() => {
    disposablesRef.current.forEach((sub) => sub.dispose());
    disposablesRef.current = [];

    if (!diffEditorReady || !diffEditorRef.current) return;

    const diffEditor = diffEditorRef.current;
    const originalEditor = diffEditor.getOriginalEditor();
    const modifiedEditor = diffEditor.getModifiedEditor();

    const subscriptions: IDisposable[] = [
      originalEditor.onMouseDown(handleMouseDown("LEFT")),
      originalEditor.onMouseMove(handleMouseMove("LEFT")),
      originalEditor.onMouseLeave(handleMouseLeave("LEFT")),
      modifiedEditor.onMouseDown(handleMouseDown("RIGHT")),
      modifiedEditor.onMouseMove(handleMouseMove("RIGHT")),
      modifiedEditor.onMouseLeave(handleMouseLeave("RIGHT")),
    ];

    disposablesRef.current = subscriptions;

    return () => {
      subscriptions.forEach((sub) => sub.dispose());
      disposablesRef.current = [];
    };
  }, [diffEditorReady, handleMouseDown, handleMouseMove, handleMouseLeave]);

  useEffect(() => {
    if (!activeOverlay) return;

    clearHoverDecoration("LEFT");
    clearHoverDecoration("RIGHT");
  }, [activeOverlay, clearHoverDecoration]);

  const updateOverlayPosition = useCallback(() => {
    if (!activeOverlay || !containerRef.current || !diffEditorRef.current) {
      setOverlayPosition(null);
      return;
    }

    const diffEditor = diffEditorRef.current;
    const editor =
      activeOverlay.target.side === "LEFT"
        ? diffEditor.getOriginalEditor()
        : diffEditor.getModifiedEditor();
    const editorDomNode = editor.getDomNode();

    if (!editorDomNode) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const editorRect = editorDomNode.getBoundingClientRect();

    const anchorLine = activeOverlay.target.lineNumber;
    const lineTop =
      editor.getTopForLineNumber(anchorLine) - editor.getScrollTop();
    const lineHeight =
      (editor.getOption(monaco.editor.EditorOption.lineHeight) as number) || 18;

    const desiredTop =
      editorRect.top - containerRect.top + lineTop + lineHeight / 2 - 24;
    const constrainedTop = Math.max(
      8,
      Math.min(
        desiredTop,
        containerRef.current.clientHeight > 0
          ? containerRef.current.clientHeight - 260
          : desiredTop,
      ),
    );

    const proposedLeft = editorRect.right - containerRect.left + 16;
    const maxLeft =
      containerRef.current.clientWidth > 0
        ? containerRef.current.clientWidth - 360
        : proposedLeft;
    const constrainedLeft = Math.max(
      16,
      Math.min(proposedLeft, Math.max(maxLeft, 16)),
    );

    setOverlayPosition({ top: constrainedTop, left: constrainedLeft });
  }, [activeOverlay]);

  useEffect(() => {
    updateOverlayPosition();
  }, [updateOverlayPosition]);

  useEffect(() => {
    if (!diffEditorRef.current) return;

    const diffEditor = diffEditorRef.current;
    const originalEditor = diffEditor.getOriginalEditor();
    const modifiedEditor = diffEditor.getModifiedEditor();

    const subscriptions: IDisposable[] = [
      originalEditor.onDidScrollChange(updateOverlayPosition),
      modifiedEditor.onDidScrollChange(updateOverlayPosition),
    ];

    window.addEventListener("resize", updateOverlayPosition);

    return () => {
      subscriptions.forEach((sub) => sub.dispose());
      window.removeEventListener("resize", updateOverlayPosition);
    };
  }, [updateOverlayPosition]);

  useEffect(() => {
    updateOverlayPosition();
  }, [showFullFile, diffView, wordWrap, updateOverlayPosition]);

  useEffect(() => {
    if (!diffEditorRef.current || !monaco) return;

    const diffEditor = diffEditorRef.current;
    const originalEditor = diffEditor.getOriginalEditor();
    const modifiedEditor = diffEditor.getModifiedEditor();

    const decorationForLine = (lineNumber: number) => ({
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {
        isWholeLine: true,
        className: "comment-line-highlight",
        linesDecorationsClassName: "comment-line-highlight-margin",
      },
    });

    const buildDecorations = (
      startLine: number,
      endLine: number,
    ): monaco.editor.IModelDeltaDecoration[] => {
      const decorations: monaco.editor.IModelDeltaDecoration[] = [];
      for (let current = startLine; current <= endLine; current++) {
        decorations.push(decorationForLine(current));
      }
      return decorations;
    };

    const activeStart =
      activeOverlay?.target.startLineNumber ?? activeOverlay?.target.lineNumber;
    const activeEnd =
      activeOverlay?.target.endLineNumber ?? activeOverlay?.target.lineNumber;

    lineHighlightDecorationsRef.current.original =
      originalEditor.deltaDecorations(
        lineHighlightDecorationsRef.current.original,
        activeOverlay &&
          activeOverlay.target.side === "LEFT" &&
          activeStart !== undefined &&
          activeEnd !== undefined
          ? buildDecorations(activeStart, activeEnd)
          : [],
      );

    lineHighlightDecorationsRef.current.modified =
      modifiedEditor.deltaDecorations(
        lineHighlightDecorationsRef.current.modified,
        activeOverlay &&
          activeOverlay.target.side === "RIGHT" &&
          activeStart !== undefined &&
          activeEnd !== undefined
          ? buildDecorations(activeStart, activeEnd)
          : [],
      );
  }, [activeOverlay]);

  useEffect(() => {
    if (activeOverlay?.type !== "thread") return;

    const latestThread = commentThreads.find(
      (thread) => thread.id === activeOverlay.threadId,
    );

    if (!latestThread) {
      setActiveOverlay(null);
      return;
    }

    if (
      latestThread.lineNumber !== activeOverlay.target.lineNumber ||
      latestThread.side !== activeOverlay.target.side
    ) {
      setActiveOverlay({
        type: "thread",
        threadId: latestThread.id,
        target: {
          lineNumber: latestThread.lineNumber,
          startLineNumber: latestThread.startLineNumber,
          endLineNumber: latestThread.endLineNumber,
          side: latestThread.side,
        },
      });
    }
  }, [activeOverlay, commentThreads]);

  useEffect(() => {
    if (!activeOverlay) {
      setCommentDraft("");
      setCommentError(null);
    }
  }, [activeOverlay]);

  const activeThread =
    activeOverlay?.type === "thread"
      ? commentThreads.find((thread) => thread.id === activeOverlay.threadId)
      : null;

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
    setCommentDraft("");
    setCommentError(null);
  }, []);

  const canSubmitComments = Boolean(
    token && repoOwner && repoName && pullNumber,
  );

  const handleCommentSubmit = useCallback(async () => {
    if (!activeOverlay || !canSubmitComments || !token) return;

    const trimmed = commentDraft.trim();
    if (!trimmed) return;

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      const api = new GitHubAPI(token);

      if (activeOverlay.type === "new") {
        const { lineNumber, side, startLineNumber, endLineNumber } =
          activeOverlay.target;
        const startLine = startLineNumber ?? lineNumber;
        const endLine = endLineNumber ?? lineNumber;
        const newComment = await api.createComment(
          repoOwner,
          repoName,
          pullNumber,
          trimmed,
          file.filename,
          endLine,
          side,
          startLine !== endLine ? startLine : undefined,
          startLine !== endLine ? side : undefined,
        );

        onCommentAdded?.(newComment);
        setActiveOverlay({
          type: "thread",
          threadId: newComment.id,
          target: {
            lineNumber: newComment.line ?? endLine,
            startLineNumber:
              newComment.start_line ??
              newComment.original_start_line ??
              (startLine !== endLine ? startLine : undefined),
            endLineNumber:
              newComment.line ?? newComment.original_line ?? endLine,
            side,
          },
        });
        setCommentDraft("");
      } else if (activeOverlay.type === "thread") {
        const thread = commentThreads.find(
          (t) => t.id === activeOverlay.threadId,
        );
        const parentCommentId = thread?.comments[0]?.id ?? activeOverlay.threadId;

        const newComment = await api.replyToReviewComment(
          repoOwner,
          repoName,
          pullNumber,
          parentCommentId,
          trimmed,
        );

        onCommentAdded?.(newComment);
        setCommentDraft("");
      }
    } catch (error) {
      console.error("Failed to submit comment:", error);
      setCommentError("Unable to submit comment. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  }, [
    activeOverlay,
    canSubmitComments,
    commentDraft,
    commentThreads,
    file.filename,
    onCommentAdded,
    pullNumber,
    repoName,
    repoOwner,
    token,
  ]);

  const getLanguageFromFilename = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      rb: "ruby",
      go: "go",
      rs: "rust",
      java: "java",
      c: "c",
      cpp: "cpp",
      cs: "csharp",
      php: "php",
      swift: "swift",
      kt: "kotlin",
      scala: "scala",
      r: "r",
      lua: "lua",
      dart: "dart",
      vue: "vue",
      css: "css",
      scss: "scss",
      sass: "sass",
      less: "less",
      html: "html",
      xml: "xml",
      json: "json",
      yml: "yaml",
      yaml: "yaml",
      toml: "toml",
      md: "markdown",
      sh: "shell",
      bash: "shell",
      zsh: "shell",
      fish: "shell",
      ps1: "powershell",
      sql: "sql",
      graphql: "graphql",
      dockerfile: "dockerfile",
    };

    return languageMap[ext || ""] || "plaintext";
  };

  const language = getLanguageFromFilename(file.filename);

  const effectiveOriginalContent =
    showFullFile && originalContent !== undefined
      ? originalContent || ""
      : patchOriginalContent || "";
  const effectiveModifiedContent =
    showFullFile && modifiedContent !== undefined
      ? modifiedContent || ""
      : patchModifiedContent || "";

  return (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "py-1 px-2 flex items-center justify-between border-b",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-gray-50 border-gray-200",
        )}
      >
        <div className="flex items-center space-x-3">
          <h3 className="font-mono text-xs flex items-center gap-2">
            {file.status === "added" && (
              <FilePlus className="w-4 h-4 text-green-500" />
            )}
            {file.status === "removed" && (
              <FileMinus className="w-4 h-4 text-red-500" />
            )}
            {file.status === "modified" && (
              <FileEdit className="w-4 h-4 text-yellow-500" />
            )}
            {file.filename}
          </h3>
          <div className="flex items-center space-x-2 text-xs">
            {file.status === "added" ? (
              <span className="text-green-500 font-medium">
                New file (+{file.additions} lines)
              </span>
            ) : file.status === "removed" ? (
              <span className="text-red-500 font-medium">
                Deleted (-{file.deletions} lines)
              </span>
            ) : (
              <>
                <span className="text-green-400">+{file.additions}</span>
                <span className="text-red-400">-{file.deletions}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {file.status !== "added" && (
            <button
              onClick={toggleDiffView}
              className="btn btn-ghost p-1 text-xs"
              title={
                diffView === "unified"
                  ? "Switch to split view"
                  : "Switch to unified view"
              }
            >
              {diffView === "unified" ? (
                <Columns className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            onClick={toggleWhitespace}
            className={cn(
              "btn btn-ghost p-1 text-xs",
              showWhitespace &&
                (theme === "dark" ? "bg-gray-700" : "bg-gray-200"),
            )}
            title="Toggle whitespace"
          >
            W
          </button>

          {file.status === "modified" && (
            <button
              onClick={() => {
                if (
                  originalContent !== undefined ||
                  modifiedContent !== undefined
                ) {
                  setShowFullFile(!showFullFile);
                }
              }}
              className={cn(
                "btn btn-ghost px-2 py-1 text-xs flex items-center gap-1",
                showFullFile &&
                  (theme === "dark" ? "bg-gray-700" : "bg-gray-200"),
                originalContent === undefined &&
                  modifiedContent === undefined &&
                  "opacity-50 cursor-not-allowed",
              )}
              disabled={
                originalContent === undefined && modifiedContent === undefined
              }
              title={
                originalContent === undefined && modifiedContent === undefined
                  ? "Full file content not available"
                  : showFullFile
                  ? "Show diff"
                  : "Show full file"
              }
            >
              <WholeWord className="w-4 h-4" />
              <span>{showFullFile ? "Diff" : "Full"}</span>
            </button>
          )}

          <button
            onClick={toggleWordWrap}
            className={cn(
              "btn btn-ghost p-1 text-sm",
              wordWrap && (theme === "dark" ? "bg-gray-700" : "bg-gray-200"),
            )}
            title="Toggle word wrap"
          >
            <WrapText className="w-4 h-4" />
          </button>

          <button
            onClick={onMarkViewed}
            className="btn btn-ghost p-1 text-sm flex items-center"
            title={isViewed ? "Mark as not viewed" : "Mark as viewed"}
          >
            {isViewed ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 relative" ref={containerRef}>
        <MonacoDiffEditor
          original={
            file.status === "added" ? "" : effectiveOriginalContent || ""
          }
          modified={
            file.status === "removed" ? "" : effectiveModifiedContent || ""
          }
          language={language}
          theme={theme === "dark" ? "vs-dark" : "vs"}
          options={{
            readOnly: true,
            renderSideBySide: diffView === "split",
            renderWhitespace: showWhitespace ? "all" : "none",
            wordWrap: wordWrap ? "on" : "off",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            lineHeight: 18,
            renderLineHighlight: "none",
            glyphMargin: false,
            folding: true,
            lineNumbers: "on",
            lineDecorationsWidth: 22,
            lineNumbersMinChars: 3,
            renderValidationDecorations: "off",
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            hideUnchangedRegions: {
              enabled: !!showFullFile,
              revealLineCount: 3,
              minimumLineCount: 3,
              contextLineCount: 3,
            },
            diffAlgorithm: "advanced",
          }}
          onMount={(editor) => {
            diffEditorRef.current = editor;
            setDiffEditorReady(true);

            try {
              const originalModel = editor.getOriginalEditor().getModel();
              const modifiedModel = editor.getModifiedEditor().getModel();

              if (originalModel && originalModel.getLineCount() === 0) {
                originalModel.setValue(" ");
              }
              if (modifiedModel && modifiedModel.getLineCount() === 0) {
                modifiedModel.setValue(" ");
              }
            } catch (error) {
              console.warn("Monaco Editor initialization warning:", error);
            }
          }}
        />

        {activeOverlay && overlayPosition && (
          <div
            className={cn(
              "absolute w-[560px] max-w-[560px] rounded-lg shadow-xl border z-20",
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200",
            )}
            style={{
              top: overlayPosition.top,
              left: overlayPosition.left,
            }}
          >
            <div
              className={cn(
                "flex items-center justify-between px-4 py-2 border-b",
                theme === "dark"
                  ? "border-gray-700 text-gray-100"
                  : "border-gray-200 text-gray-800",
              )}
            >
              <div className="flex flex-col text-xs">
                <div className="flex items-center gap-2 font-semibold">
                  <MessageSquare className="w-4 h-4" />
                  {activeOverlay.type === "thread"
                    ? "Conversation"
                    : "Start review comment"}
                </div>
                <span
                  className={cn(
                    "text-[11px]", 
                    theme === "dark" ? "text-gray-400" : "text-gray-500",
                  )}
                >
                  {activeOverlay.target.startLineNumber &&
                  activeOverlay.target.startLineNumber !==
                    activeOverlay.target.lineNumber ? (
                      <>
                        Lines {activeOverlay.target.startLineNumber}–
                        {activeOverlay.target.lineNumber}
                      </>
                    ) : (
                    <>Line {activeOverlay.target.lineNumber}</>
                  )}
                  {activeOverlay.target.side === "LEFT" ? " • base" : " • head"}
                </span>
              </div>
              <button
                onClick={closeOverlay}
                className={cn(
                  "p-1 rounded transition-colors",
                  theme === "dark"
                    ? "text-gray-400 hover:text-gray-100 hover:bg-gray-700"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
                )}
                aria-label="Close comment panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">
              {activeOverlay.type === "thread" && activeThread && (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {activeThread.comments.map((comment) => (
                    <div key={comment.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <img
                          src={comment.user.avatar_url}
                          alt={comment.user.login}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-sm font-medium">
                          {comment.user.login}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            theme === "dark"
                              ? "text-gray-400"
                              : "text-gray-500",
                          )}
                        >
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "text-sm whitespace-pre-wrap", 
                          theme === "dark"
                            ? "text-gray-200"
                            : "text-gray-700",
                        )}
                      >
                        {comment.body}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeOverlay.type === "thread" && !activeThread && (
                <div
                  className={cn(
                    "text-sm rounded-md px-3 py-2",
                    theme === "dark"
                      ? "bg-amber-900/40 text-amber-200"
                      : "bg-amber-50 text-amber-700",
                  )}
                >
                  This comment thread is no longer available on the current diff.
                </div>
              )}

              {!canSubmitComments ? (
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
                    theme === "dark"
                      ? "bg-gray-900 text-gray-300"
                      : "bg-gray-100 text-gray-700",
                  )}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Sign in with GitHub to leave review comments.</span>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <img
                      src={currentUser?.avatar_url || ""}
                      alt={currentUser?.login || "You"}
                      className="w-8 h-8 rounded-full mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <button
                            onClick={() => setCommentTab("write")}
                            className={cn(
                              "px-3 py-1 rounded-md",
                              commentTab === "write"
                                ? theme === "dark"
                                  ? "bg-gray-700 text-white"
                                  : "bg-gray-200 text-gray-900"
                                : theme === "dark"
                                  ? "text-gray-400 hover:text-gray-200"
                                  : "text-gray-500 hover:text-gray-800",
                            )}
                          >
                            Write
                          </button>
                          <button
                            onClick={() => setCommentTab("preview")}
                            className={cn(
                              "px-3 py-1 rounded-md",
                              commentTab === "preview"
                                ? theme === "dark"
                                  ? "bg-gray-700 text-white"
                                  : "bg-gray-200 text-gray-900"
                                : theme === "dark"
                                  ? "text-gray-400 hover:text-gray-200"
                                  : "text-gray-500 hover:text-gray-800",
                            )}
                          >
                            Preview
                          </button>
                        </div>
                        <span
                          className={cn(
                            "text-xs",
                            theme === "dark" ? "text-gray-400" : "text-gray-500",
                          )}
                        >
                          Markdown supported
                        </span>
                      </div>
                      {commentTab === "write" ? (
                        <textarea
                          value={commentDraft}
                          onChange={(e) => {
                            setCommentDraft(e.target.value);
                            if (commentError) {
                              setCommentError(null);
                            }
                          }}
                          className="input w-full h-40 resize-none text-sm"
                          placeholder={
                            activeOverlay.type === "thread"
                              ? "Reply to this thread..."
                              : "Leave a comment on this line..."
                          }
                          autoFocus
                        />
                      ) : (
                        <div
                          className={cn(
                            "rounded-md border px-3 py-2 text-sm",
                            theme === "dark"
                              ? "border-gray-700 bg-gray-900 text-gray-200"
                              : "border-gray-200 bg-gray-50 text-gray-700",
                          )}
                          style={{ minHeight: "10rem" }}
                        >
                          {commentDraft.trim() ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {commentDraft}
                            </ReactMarkdown>
                          ) : (
                            <span
                              className={cn(
                                "text-sm italic",
                                theme === "dark"
                                  ? "text-gray-500"
                                  : "text-gray-500",
                              )}
                            >
                              Nothing to preview
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {commentError && (
                    <div className="flex items-center gap-2 text-sm text-red-500">
                      <AlertCircle className="w-4 h-4" />
                      <span>{commentError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={closeOverlay}
                      className="btn btn-ghost text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCommentSubmit}
                      disabled={
                        !commentDraft.trim() || isSubmittingComment || !canSubmitComments
                      }
                      className="btn btn-primary text-sm flex items-center gap-2"
                    >
                      {isSubmittingComment && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {activeOverlay.type === "thread" ? "Reply" : "Comment"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function parsePatch(patch: string) {
  if (!patch || patch.trim() === "") {
    return { original: "", modified: "" };
  }

  const lines = patch.split("\n");
  const hunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: Array<{ type: "-" | "+" | " "; content: string }>;
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        const hunk = {
          oldStart: parseInt(match[1], 10),
          oldLines: parseInt(match[2] || "1", 10),
          newStart: parseInt(match[3], 10),
          newLines: parseInt(match[4] || "1", 10),
          lines: [] as Array<{ type: "-" | "+" | " "; content: string }>,
        };

        i++;
        while (
          i < lines.length &&
          !lines[i].startsWith("@@") &&
          !lines[i].startsWith("diff --git")
        ) {
          const hunkLine = lines[i];
          if (hunkLine.startsWith("-")) {
            hunk.lines.push({ type: "-", content: hunkLine.substring(1) });
          } else if (hunkLine.startsWith("+")) {
            hunk.lines.push({ type: "+", content: hunkLine.substring(1) });
          } else if (hunkLine.startsWith(" ")) {
            hunk.lines.push({ type: " ", content: hunkLine.substring(1) });
          } else if (
            hunkLine === "\\No newline at end of file" ||
            hunkLine === "\\ No newline at end of file"
          ) {
            // Ignore
          } else if (
            hunkLine.startsWith("---") ||
            hunkLine.startsWith("+++") ||
            hunkLine.startsWith("index ")
          ) {
            // Skip headers
          } else if (hunkLine.startsWith("\\")) {
            // Skip Git markers
          } else {
            if (hunkLine.length > 0) {
              hunk.lines.push({ type: " ", content: hunkLine });
            }
          }
          i++;
        }
        i--;

        hunks.push(hunk);
      }
    }
  }

  if (hunks.length === 0) {
    return { original: "", modified: "" };
  }

  const originalLines: string[] = [];
  const modifiedLines: string[] = [];

  for (const hunk of hunks) {
    let i = 0;
    while (i < hunk.lines.length) {
      const line = hunk.lines[i];

      if (line.type === " ") {
        originalLines.push(line.content);
        modifiedLines.push(line.content);
        i++;
      } else if (line.type === "-") {
        const deletions: string[] = [];
        while (i < hunk.lines.length && hunk.lines[i].type === "-") {
          deletions.push(hunk.lines[i].content);
          i++;
        }

        const additions: string[] = [];
        while (i < hunk.lines.length && hunk.lines[i].type === "+") {
          additions.push(hunk.lines[i].content);
          i++;
        }

        const maxLines = Math.max(deletions.length, additions.length);
        for (let j = 0; j < maxLines; j++) {
          originalLines.push(deletions[j] || "");
          modifiedLines.push(additions[j] || "");
        }
      } else if (line.type === "+") {
        originalLines.push("");
        modifiedLines.push(line.content);
        i++;
      }
    }
  }

  return {
    original: originalLines.length > 0 ? originalLines.join("\n") : "",
    modified: modifiedLines.length > 0 ? modifiedLines.join("\n") : "",
  };
}
