import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { Monaco } from "@monaco-editor/react";
import type {
  editor as MonacoEditorType,
  IDisposable,
} from "monaco-editor";

import type { Comment, File } from "../../services/github";
import { GitHubAPI } from "../../services/github";
import {
  buildThreads,
  type ActiveOverlay,
  type CommentSide,
  type CommentTarget,
  type InlineCommentThread,
} from "./commentUtils";
import { useOverlayResize } from "./useOverlayResize";
import type { DiffModel } from "./useDiffModel";

interface CommentManagerParams {
  file: File;
  comments: Comment[];
  diffModel: DiffModel;
  diffEditorRef: MutableRefObject<MonacoEditorType.IStandaloneDiffEditor | null>;
  monacoRef: MutableRefObject<Monaco | null>;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  showFullFile: boolean;
  diffView: string;
  wordWrap: boolean;
  diffEditorReady: boolean;
  repoOwner: string;
  repoName: string;
  pullNumber: number;
  token: string | null;
  onCommentAdded?: (comment: Comment) => void;
}

interface CommentManagerState {
  commentThreads: InlineCommentThread[];
  activeOverlay: ActiveOverlay | null;
  overlayPosition: { top: number; left: number } | null;
  commentDraft: string;
  commentError: string | null;
  isSubmittingComment: boolean;
  canSubmitComments: boolean;
  overlayWidth: number;
  overlayHeight: number;
  resizeMode: ReturnType<typeof useOverlayResize>["resizeMode"];
  activeThread: InlineCommentThread | null;
  handleCommentDraftChange: (value: string) => void;
  handleCommentSubmit: () => Promise<void>;
  handleResizeStart: ReturnType<typeof useOverlayResize>["handleResizeStart"];
  closeOverlay: () => void;
}

export function useCommentManager({
  file,
  comments,
  diffModel,
  diffEditorRef,
  monacoRef,
  containerRef,
  showFullFile,
  diffView,
  wordWrap,
  diffEditorReady,
  repoOwner,
  repoName,
  pullNumber,
  token,
  onCommentAdded,
}: CommentManagerParams): CommentManagerState {
  const {
    mapLineForSide,
    mapPositionForSide,
    mapEditorLineToFileLine,
    getDiffPositionForEditorLine,
    getDiffHunkForLine,
  } = diffModel;

  const disposablesRef = useRef<IDisposable[]>([]);
  const commentDecorationsRef = useRef<{ original: string[]; modified: string[] }>({
    original: [],
    modified: [],
  });
  const hoverDecorationsRef = useRef<{ original: string[]; modified: string[] }>({
    original: [],
    modified: [],
  });
  const lineHighlightDecorationsRef = useRef<{ original: string[]; modified: string[] }>({
    original: [],
    modified: [],
  });
  const threadsRef = useRef<InlineCommentThread[]>([]);

  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay | null>(null);
  const [overlayPosition, setOverlayPosition] = useState<{ top: number; left: number } | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const {
    width: overlayWidth,
    height: overlayHeight,
    resizeMode,
    handleResizeStart,
    resetSize: resetOverlaySize,
  } = useOverlayResize();

  const commentThreads = useMemo(() => {
    const threads = buildThreads(comments);

    return threads
      .map((thread) => {
        const rootComment = thread.comments[0];
        if (!rootComment) {
          return thread;
        }

        const side = thread.side;

        const positionLine = mapPositionForSide(
          side === "LEFT"
            ? rootComment.original_position ?? null
            : rootComment.position ?? null,
          side,
        );

        const baseLine =
          side === "LEFT"
            ? rootComment.original_line ?? rootComment.line ?? null
            : rootComment.line ?? rootComment.original_line ?? null;

        const mappedThreadLine = mapLineForSide(thread.lineNumber, side);
        const mappedBaseLine = mapLineForSide(baseLine, side);

        const lineNumber =
          positionLine ?? mappedThreadLine ?? mappedBaseLine ?? thread.lineNumber;

        const baseStartLine =
          side === "LEFT"
            ? rootComment.original_start_line ?? rootComment.start_line ?? null
            : rootComment.start_line ?? rootComment.original_start_line ?? null;

        const mappedStart = mapLineForSide(
          thread.startLineNumber ?? baseStartLine ?? null,
          side,
        );
        const mappedEnd = mapLineForSide(
          thread.endLineNumber ?? baseLine ?? null,
          side,
        );

        const startLineNumber = mappedStart ?? lineNumber;
        const endLineNumber = mappedEnd ?? lineNumber;

        const normalizedStart = Math.min(startLineNumber, endLineNumber);
        const normalizedEnd = Math.max(startLineNumber, endLineNumber);

        return {
          ...thread,
          lineNumber: normalizedEnd,
          startLineNumber: normalizedStart,
          endLineNumber: normalizedEnd,
        };
      })
      .sort((a, b) => a.lineNumber - b.lineNumber);
  }, [comments, mapLineForSide, mapPositionForSide]);

  useEffect(() => {
    threadsRef.current = commentThreads;
  }, [commentThreads]);

  useEffect(() => {
    setActiveOverlay(null);
    setCommentDraft("");
    setCommentError(null);
    setIsSubmittingComment(false);
    resetOverlaySize();
  }, [file.filename, resetOverlaySize]);

  const canSubmitComments = Boolean(token && repoOwner && repoName && pullNumber);

  const clearHoverDecoration = useCallback(
    (side: CommentSide) => {
      const diffEditor = diffEditorRef.current;
      if (!diffEditor) return;

      const editor =
        side === "LEFT"
          ? diffEditor.getOriginalEditor()
          : diffEditor.getModifiedEditor();

      const model = editor.getModel();
      if (!model || model.isDisposed()) {
        return;
      }

      const key = side === "LEFT" ? "original" : "modified";
      try {
        hoverDecorationsRef.current[key] = editor.deltaDecorations(
          hoverDecorationsRef.current[key],
          [],
        );
      } catch (error) {
        console.debug("Error clearing hover decoration:", error);
      }
    },
    [diffEditorRef],
  );

  const applyCommentDecorations = useCallback(() => {
    if (!diffEditorReady || !diffEditorRef.current || !monacoRef.current) return;

    const diffEditor = diffEditorRef.current;

    const originalEditor = diffEditor.getOriginalEditor();
    const modifiedEditor = diffEditor.getModifiedEditor();

    const originalModel = originalEditor?.getModel();
    const modifiedModel = modifiedEditor?.getModel();

    if (!originalModel || originalModel.isDisposed() || !modifiedModel || modifiedModel.isDisposed()) {
      return;
    }

    const lineDecoration = (thread: InlineCommentThread) => {
      const startLine = thread.startLineNumber ?? thread.lineNumber;
      const endLine = thread.endLineNumber ?? thread.lineNumber;
      const decorations: MonacoEditorType.IModelDeltaDecoration[] = [];

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
          range: new monacoRef.current!.Range(current, 1, current, 1),
          options: {
            isWholeLine: true,
            linesDecorationsClassName: classNames.join(" "),
            hoverMessage:
              current === startLine
                ? {
                  value: `${thread.comments.length} comment${thread.comments.length === 1 ? "" : "s"}`,
                }
                : undefined,
          },
        });
      }

      return decorations;
    };

    try {
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
    } catch (error) {
      console.debug("Error applying comment decorations:", error);
    }
  }, [commentThreads, diffEditorReady, diffEditorRef, monacoRef]);

  useEffect(() => {
    applyCommentDecorations();
  }, [applyCommentDecorations]);

  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((sub) => {
        try {
          sub.dispose();
        } catch (error) {
          console.debug("Error disposing subscription:", error);
        }
      });
      disposablesRef.current = [];
      commentDecorationsRef.current = { original: [], modified: [] };
      hoverDecorationsRef.current = { original: [], modified: [] };
      lineHighlightDecorationsRef.current = { original: [], modified: [] };
    };
  }, [file.filename]);

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
      const start = Math.min(selection.startLineNumber, selection.endLineNumber);
      const end = Math.max(selection.startLineNumber, selection.endLineNumber);
      return { start, end };
    },
    [diffEditorRef],
  );

  const handleOverlayTarget = useCallback(
    (lineNumber: number, side: CommentSide) => {
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
    },
    [getSelectionRangeForSide],
  );

  const handleMouseDown = useCallback(
    (side: CommentSide) =>
      (e: MonacoEditorType.IEditorMouseEvent) => {
        const monaco = monacoRef.current;
        if (!monaco) return;

        if (
          e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
          e.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS &&
          e.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
        ) {
          return;
        }

        if (!e.event.leftButton) {
          return;
        }

        const lineNumber = e.target.position?.lineNumber;
        if (!lineNumber) {
          return;
        }

        handleOverlayTarget(lineNumber, side);

        e.event.preventDefault();
        e.event.stopPropagation();
      },
    [handleOverlayTarget, monacoRef],
  );

  const handleMouseMove = useCallback(
    (side: CommentSide) =>
      (e: MonacoEditorType.IEditorMouseEvent) => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return;

        if (
          e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
          e.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS &&
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

        const model = editor.getModel();
        if (!model || model.isDisposed()) {
          return;
        }

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

        try {
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
        } catch (error) {
          console.debug("Error updating hover decoration:", error);
        }
      },
    [clearHoverDecoration, diffEditorRef, monacoRef],
  );

  const handleMouseLeave = useCallback(
    (side: CommentSide) => () => {
      clearHoverDecoration(side);
    },
    [clearHoverDecoration],
  );

  useEffect(() => {
    disposablesRef.current.forEach((sub) => {
      try {
        sub.dispose();
      } catch (error) {
        console.debug("Error disposing subscription:", error);
      }
    });
    disposablesRef.current = [];

    if (!diffEditorReady || !diffEditorRef.current) {
      return;
    }

    const diffEditor = diffEditorRef.current;

    try {
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
    } catch (error) {
      console.debug("Error setting up comment listeners:", error);
    }

    return () => {
      const subsToDispose = disposablesRef.current;
      disposablesRef.current = [];
      subsToDispose.forEach((sub) => {
        try {
          sub.dispose();
        } catch (error) {
          console.debug("Error disposing subscription during cleanup:", error);
        }
      });
    };
  }, [diffEditorReady, diffEditorRef, handleMouseDown, handleMouseLeave, handleMouseMove, file.filename]);

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
    const lineTop = editor.getTopForLineNumber(anchorLine) - editor.getScrollTop();
    const lineHeight =
      (editor.getOption(monacoRef.current!.editor.EditorOption.lineHeight) as number) || 18;

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

    const gutterWidth = 60;
    const currentOverlayWidth = overlayWidth || 384;
    const proposedLeft = editorRect.left - containerRect.left + gutterWidth + 8;
    const containerWidth = containerRef.current.clientWidth;
    const maxLeft = containerWidth > 0
      ? containerWidth - currentOverlayWidth - 16
      : proposedLeft;
    const constrainedLeft = Math.max(8, Math.min(proposedLeft, maxLeft));

    setOverlayPosition({ top: constrainedTop, left: constrainedLeft });
  }, [activeOverlay, containerRef, diffEditorRef, monacoRef, overlayWidth]);

  useEffect(() => {
    updateOverlayPosition();
  }, [updateOverlayPosition]);

  useEffect(() => {
    if (!diffEditorRef.current) return;

    const diffEditor = diffEditorRef.current;

    try {
      const originalEditor = diffEditor.getOriginalEditor();
      const modifiedEditor = diffEditor.getModifiedEditor();

      const subscriptions: IDisposable[] = [
        originalEditor.onDidScrollChange(updateOverlayPosition),
        modifiedEditor.onDidScrollChange(updateOverlayPosition),
      ];

      window.addEventListener("resize", updateOverlayPosition);

      return () => {
        subscriptions.forEach((sub) => {
          try {
            sub.dispose();
          } catch (error) {
            console.debug("Error disposing scroll subscription:", error);
          }
        });
        window.removeEventListener("resize", updateOverlayPosition);
      };
    } catch (error) {
      console.debug("Error setting up scroll listeners:", error);
    }
  }, [diffEditorRef, updateOverlayPosition]);

  useEffect(() => {
    updateOverlayPosition();
  }, [showFullFile, diffView, wordWrap, updateOverlayPosition]);

  useEffect(() => {
    if (!diffEditorRef.current || !monacoRef.current || !diffEditorReady) return;

    try {
      const diffEditor = diffEditorRef.current;
      const originalEditor = diffEditor.getOriginalEditor();
      const modifiedEditor = diffEditor.getModifiedEditor();

      const originalModel = originalEditor?.getModel();
      const modifiedModel = modifiedEditor?.getModel();

      if (!originalModel || originalModel.isDisposed() || !modifiedModel || modifiedModel.isDisposed()) {
        return;
      }

      const decorationForLine = (lineNumber: number) => ({
        range: new monacoRef.current!.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: "comment-line-highlight",
          linesDecorationsClassName: "comment-line-highlight-margin",
        },
      });

      const buildDecorations = (
        startLine: number,
        endLine: number,
      ): MonacoEditorType.IModelDeltaDecoration[] => {
        const decorations: MonacoEditorType.IModelDeltaDecoration[] = [];
        for (let current = startLine; current <= endLine; current++) {
          decorations.push(decorationForLine(current));
        }
        return decorations;
      };

      const activeStart =
        activeOverlay?.target.startLineNumber ?? activeOverlay?.target.lineNumber;
      const activeEnd =
        activeOverlay?.target.endLineNumber ?? activeOverlay?.target.lineNumber;

      try {
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
      } catch (error) {
        console.debug("Error updating line highlights:", error);
      }
    } catch (error) {
      console.debug("Error in line highlight effect:", error);
    }
  }, [activeOverlay, diffEditorReady, diffEditorRef, monacoRef]);

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
      ? commentThreads.find((thread) => thread.id === activeOverlay.threadId) ?? null
      : null;

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
    setCommentDraft("");
    setCommentError(null);
    resetOverlaySize();
  }, [resetOverlaySize]);

  const handleCommentDraftChange = useCallback((value: string) => {
    setCommentDraft(value);
    if (commentError) {
      setCommentError(null);
    }
  }, [commentError]);

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
        const startLineForApi =
          mapEditorLineToFileLine(startLine, side) ?? startLine;
        const endLineForApi =
          mapEditorLineToFileLine(endLine, side) ?? endLine;
        const isMultiLineSelection = startLine !== endLine;
        const isMultiLineApi = startLineForApi !== endLineForApi;

        const position = !showFullFile
          ? getDiffPositionForEditorLine(endLine, side)
          : undefined;

        if (!showFullFile && !isMultiLineSelection && !isMultiLineApi && position !== undefined) {
          const newComment = await api.createComment(
            repoOwner,
            repoName,
            pullNumber,
            trimmed,
            file.filename,
            undefined,
            side,
            undefined,
            undefined,
            position,
          );

          onCommentAdded?.(newComment);
          setActiveOverlay({
            type: "thread",
            threadId: newComment.id,
            target: {
              lineNumber,
              startLineNumber,
              endLineNumber,
              side,
            },
          });
          setCommentDraft("");
        } else {
          if (!file.patch) {
            setCommentError("No diff available for this file. Cannot create comment.");
            setIsSubmittingComment(false);
            return;
          }

          const diffHunk = getDiffHunkForLine(endLineForApi, side);

          if (!diffHunk) {
            const errorMsg = showFullFile
              ? `Cannot comment on line ${endLineForApi}. This line is not part of the diff changes.`
              : `Cannot find diff hunk for line ${endLineForApi}. The line may not be part of the changes.`;
            setCommentError(errorMsg);
            setIsSubmittingComment(false);
            return;
          }

          const newComment = await api.createComment(
            repoOwner,
            repoName,
            pullNumber,
            trimmed,
            file.filename,
            endLineForApi,
            side,
            startLineForApi !== endLineForApi ? startLineForApi : undefined,
            startLineForApi !== endLineForApi ? side : undefined,
            undefined,
          );

          onCommentAdded?.(newComment);
          setActiveOverlay({
            type: "thread",
            threadId: newComment.id,
            target: {
              lineNumber,
              startLineNumber,
              endLineNumber,
              side,
            },
          });
          setCommentDraft("");
        }
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
    file.patch,
    getDiffHunkForLine,
    getDiffPositionForEditorLine,
    mapEditorLineToFileLine,
    onCommentAdded,
    pullNumber,
    repoName,
    repoOwner,
    showFullFile,
    token,
  ]);

  return {
    commentThreads,
    activeOverlay,
    overlayPosition,
    commentDraft,
    commentError,
    isSubmittingComment,
    canSubmitComments,
    overlayWidth,
    overlayHeight,
    resizeMode,
    activeThread,
    handleCommentDraftChange,
    handleCommentSubmit,
    handleResizeStart,
    closeOverlay,
  };
}
