import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { DiffEditor as MonacoDiffEditor, loader } from "@monaco-editor/react";
import type {
  editor as MonacoEditorType,
  IDisposable,
} from "monaco-editor";
import { File, Comment, GitHubAPI } from "../services/github";
import { useUIStore } from "../stores/uiStore";
import type { Monaco } from "@monaco-editor/react";

// Configure Monaco Editor loader
loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs",
  },
});
import {
  buildThreads,
  CommentSide,
  CommentTarget,
  InlineCommentThread,
  ActiveOverlay,
  parsePatch,
  getLanguageFromFilename,
} from "./diff/commentUtils";
import { DiffEditorHeader } from "./diff/DiffEditorHeader";
import { CommentOverlay } from "./diff/CommentOverlay";
import { useOverlayResize } from "./diff/useOverlayResize";

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
  const monacoRef = useRef<Monaco | null>(null);
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

  // Parse patch content synchronously to avoid flicker
  const patchData = useMemo(() => {
    if (file.patch) {
      const { original, modified, mappings } = parsePatch(file.patch);
      return { original, modified, mappings };
    }
    return { original: "", modified: "", mappings: null };
  }, [file.patch]);

  // Default to full file view only if full file content is available
  const hasFullContent = !(originalContent === undefined && modifiedContent === undefined);

  // Track previous file to detect changes during render
  const prevFileRef = useRef<string>(file.filename);
  const [showFullFile, setShowFullFile] = useState(hasFullContent);
  const [diffEditorReady, setDiffEditorReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Update showFullFile synchronously during render when file changes
  if (prevFileRef.current !== file.filename) {
    prevFileRef.current = file.filename;
    // Reset state synchronously during render to prevent flicker
    if (showFullFile !== hasFullContent) {
      setShowFullFile(hasFullContent);
    }
  }
  const [hideUnchangedRegions, setHideUnchangedRegions] = useState(false); // Default to showing all lines
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay | null>(null);
  const [overlayPosition, setOverlayPosition] = useState<
    | { top: number; left: number }
    | null
  >(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const {
    width: overlayWidth,
    height: overlayHeight,
    resizeMode,
    handleResizeStart,
    resetSize: resetOverlaySize,
  } = useOverlayResize();

  useEffect(() => {
    console.log('🔄 File changed:', file.filename);

    // CRITICAL: Reset these IMMEDIATELY to prevent effects from accessing disposed Monaco
    setIsInitializing(true);
    setDiffEditorReady(false);
    diffEditorRef.current = null;
    monacoRef.current = null;

    // Small delay to prevent flicker when switching files
    const timer = setTimeout(() => {
      console.log('✅ Initialization complete for:', file.filename);
      setIsInitializing(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [file.filename]);

  const mapLineForSide = useCallback(
    (line: number | null | undefined, side: CommentSide): number | null => {
      if (line === null || line === undefined || line <= 0) {
        return null;
      }

      if (showFullFile || !patchData.mappings) {
        return line;
      }

      const mapping =
        side === "LEFT"
          ? patchData.mappings.originalLineToEditorLine
          : patchData.mappings.modifiedLineToEditorLine;

      return mapping.get(line) ?? line;
    },
    [patchData.mappings, showFullFile],
  );

  const mapPositionForSide = useCallback(
    (position: number | null | undefined, side: CommentSide): number | null => {
      if (
        position === null ||
        position === undefined ||
        position <= 0 ||
        showFullFile ||
        !patchData.mappings
      ) {
        return null;
      }

      const mapping =
        side === "LEFT"
          ? patchData.mappings.diffPositionToEditorLine.LEFT
          : patchData.mappings.diffPositionToEditorLine.RIGHT;

      return mapping.get(position) ?? null;
    },
    [patchData.mappings, showFullFile],
  );

  const commentThreads = useMemo(() => {
    const threads = buildThreads(comments);

    console.log('Building comment threads:', {
      commentsCount: comments.length,
      threadsCount: threads.length,
      showFullFile,
      hasPatchMappings: !!patchData.mappings,
      comments: comments.map(c => ({
        id: c.id,
        line: c.line,
        original_line: c.original_line,
        side: c.side,
        path: c.path,
      })),
    });

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

        const mappedThread = {
          ...thread,
          lineNumber: normalizedEnd,
          startLineNumber: normalizedStart,
          endLineNumber: normalizedEnd,
        };

        console.log('Mapped thread:', {
          threadId: thread.id,
          originalLine: thread.lineNumber,
          mappedLine: normalizedEnd,
          side: thread.side,
        });

        return mappedThread;
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
  }, [file.filename]);


  const clearHoverDecoration = useCallback((side: CommentSide) => {
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
      console.debug('Error clearing hover decoration:', error);
    }
  }, []);

  useEffect(() => {
    if (!diffEditorRef.current || !monacoRef.current || !diffEditorReady) return;

    const diffEditor = diffEditorRef.current;

    try {
      const originalEditor = diffEditor.getOriginalEditor();
      const modifiedEditor = diffEditor.getModifiedEditor();

      // Check if models are valid before applying decorations
      const originalModel = originalEditor?.getModel();
      const modifiedModel = modifiedEditor?.getModel();

      if (!originalModel || originalModel.isDisposed() || !modifiedModel || modifiedModel.isDisposed()) {
        console.debug('Skipping decoration update - models are disposed or not ready');
        return;
      }

      const lineDecoration = (thread: InlineCommentThread) => {
        const startLine = thread.startLineNumber ?? thread.lineNumber;
        const endLine = thread.endLineNumber ?? thread.lineNumber;
        const decorations = [] as MonacoEditorType.IModelDeltaDecoration[];
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
                    value: `${thread.comments.length} comment${thread.comments.length === 1 ? "" : "s"
                      }`,
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

        console.log('✨ Applied decorations for', commentThreads.length, 'comment threads');
      } catch (error) {
        console.debug('Error applying decorations (likely during unmount):', error);
      }
    } catch (error) {
      console.debug('Error in decoration effect:', error);
    }
  }, [commentThreads, diffEditorReady]);

  // Cleanup effect - dispose event listeners when Monaco unmounts
  useEffect(() => {
    return () => {
      console.log('🧹 Disposing event listeners for:', file.filename);

      // Only dispose event listeners - state is already reset by file change effect
      disposablesRef.current.forEach((sub) => {
        try {
          sub.dispose();
        } catch (error) {
          console.debug('Error disposing subscription:', error);
        }
      });
      disposablesRef.current = [];

      // Reset decoration refs
      commentDecorationsRef.current = { original: [], modified: [] };
      hoverDecorationsRef.current = { original: [], modified: [] };
      lineHighlightDecorationsRef.current = { original: [], modified: [] };

      console.log('✅ Event listeners disposed');
    };
  }, [file.filename]); // Re-run when file changes (Monaco will remount)

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
        console.log('🖱️ Mouse down event:', {
          side,
          targetType: e.target.type,
          lineNumber: e.target.position?.lineNumber,
          leftButton: e.event.leftButton
        });

        if (
          e.target.type !== monacoRef.current!.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
          e.target.type !==
          monacoRef.current!.editor.MouseTargetType.GUTTER_LINE_DECORATIONS &&
          e.target.type !== monacoRef.current!.editor.MouseTargetType.GUTTER_LINE_NUMBERS
        ) {
          console.log('❌ Ignoring click - not in gutter area');
          return;
        }

        if (!e.event.leftButton) {
          console.log('❌ Ignoring click - not left button');
          return;
        }

        const lineNumber = e.target.position?.lineNumber;
        if (!lineNumber) {
          console.log('❌ No line number found');
          return;
        }

        console.log('✅ Valid gutter click on line', lineNumber, 'side', side);

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
        if (!diffEditor || !monacoRef.current) return;

        if (
          e.target.type !== monacoRef.current!.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
          e.target.type !==
          monacoRef.current!.editor.MouseTargetType.GUTTER_LINE_DECORATIONS &&
          e.target.type !== monacoRef.current!.editor.MouseTargetType.GUTTER_LINE_NUMBERS
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
                range: new monacoRef.current!.Range(lineNumber, 1, lineNumber, 1),
                options: {
                  isWholeLine: true,
                  linesDecorationsClassName: "comment-hover-decoration",
                },
              },
            ],
          );
        } catch (error) {
          console.debug('Error updating hover decoration:', error);
        }
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
    console.log('📡 Event listener setup effect triggered:', {
      diffEditorReady,
      hasEditor: !!diffEditorRef.current,
      file: file.filename
    });

    // Clean up existing subscriptions first
    disposablesRef.current.forEach((sub) => {
      try {
        sub.dispose();
      } catch (error) {
        console.debug('Error disposing old subscription:', error);
      }
    });
    disposablesRef.current = [];

    if (!diffEditorReady || !diffEditorRef.current) {
      console.log('⏸️ Skipping event listener setup - editor not ready');
      return;
    }

    console.log('🎧 Setting up event listeners for:', file.filename);

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
      console.log('✅ Event listeners attached successfully');
    } catch (error) {
      console.debug('Error setting up event listeners:', error);
    }

    return () => {
      console.log('🧹 Cleaning up event listeners for:', file.filename);
      const subsToDispose = disposablesRef.current;
      disposablesRef.current = [];
      subsToDispose.forEach((sub) => {
        try {
          sub.dispose();
        } catch (error) {
          console.debug('Error disposing subscription during cleanup:', error);
        }
      });
    };
  }, [diffEditorReady, handleMouseDown, handleMouseMove, handleMouseLeave, file.filename]);

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

    // Position the overlay near the gutter/line numbers area instead of far right
    const gutterWidth = 60; // Approximate width of line numbers + gutter
    const currentOverlayWidth = overlayWidth || 384; // Use dynamic width or default
    const proposedLeft = editorRect.left - containerRect.left + gutterWidth + 8;
    const containerWidth = containerRef.current.clientWidth;
    const maxLeft = containerWidth > 0 ? containerWidth - currentOverlayWidth - 16 : proposedLeft;
    const constrainedLeft = Math.max(
      8,
      Math.min(proposedLeft, maxLeft),
    );

    setOverlayPosition({ top: constrainedTop, left: constrainedLeft });
  }, [activeOverlay, overlayWidth]);

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
            console.debug('Error disposing scroll subscription:', error);
          }
        });
        window.removeEventListener("resize", updateOverlayPosition);
      };
    } catch (error) {
      console.debug('Error setting up scroll listeners:', error);
    }
  }, [updateOverlayPosition]);

  useEffect(() => {
    updateOverlayPosition();
  }, [showFullFile, diffView, wordWrap, updateOverlayPosition]);

  useEffect(() => {
    if (!diffEditorRef.current || !monacoRef.current || !diffEditorReady) return;

    try {
      const diffEditor = diffEditorRef.current;
      const originalEditor = diffEditor.getOriginalEditor();
      const modifiedEditor = diffEditor.getModifiedEditor();

      // Check if models are valid before applying decorations
      const originalModel = originalEditor?.getModel();
      const modifiedModel = modifiedEditor?.getModel();

      if (!originalModel || originalModel.isDisposed() || !modifiedModel || modifiedModel.isDisposed()) {
        console.debug('Skipping line highlight update - models are disposed');
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
        console.debug('Error updating line highlights (likely during unmount):', error);
      }
    } catch (error) {
      console.debug('Error in line highlight effect:', error);
    }
  }, [activeOverlay, diffEditorReady]);

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

  const canSubmitComments = Boolean(
    token && repoOwner && repoName && pullNumber,
  );

  const mapEditorLineToFileLine = useCallback(
    (editorLine: number | null | undefined, side: CommentSide): number | null => {
      if (!editorLine || editorLine <= 0) {
        return null;
      }

      if (showFullFile || !patchData.mappings) {
        return editorLine;
      }

      if (editorLine > patchData.mappings.rows.length) {
        return null;
      }

      const row = patchData.mappings.rows[editorLine - 1];
      const fileLine =
        side === "LEFT" ? row.originalLineNumber : row.modifiedLineNumber;

      return fileLine ?? null;
    },
    [patchData.mappings, showFullFile],
  );

  // Get the position in the diff for a given editor line
  const getDiffPositionForEditorLine = useCallback(
    (editorLine: number, side: CommentSide): number | undefined => {
      if (!file.patch) {
        return undefined;
      }

      if (!patchData.mappings) {
        return undefined;
      }

      // In full file view, we need to map the editor line to a patch line first
      if (showFullFile) {
        const fileLine = editorLine; // In full file view, editor line = file line
        // Find the corresponding row in patch mappings
        const row = patchData.mappings.rows.find((r) => {
          if (side === "LEFT") {
            return r.originalLineNumber === fileLine;
          } else {
            return r.modifiedLineNumber === fileLine;
          }
        });

        if (!row) {
          return undefined;
        }

        const position =
          side === "LEFT"
            ? row.originalDiffPosition
            : row.modifiedDiffPosition;

        return position ?? undefined;
      }

      // In patch view, editor line directly maps to patch rows
      if (editorLine <= 0 || editorLine > patchData.mappings.rows.length) {
        return undefined;
      }

      const row = patchData.mappings.rows[editorLine - 1];
      const position =
        side === "LEFT"
          ? row.originalDiffPosition
          : row.modifiedDiffPosition;

      return position ?? undefined;
    },
    [file.patch, patchData.mappings, showFullFile],
  );

  // Extract diff hunk for a given line
  const getDiffHunkForLine = useCallback((targetLine: number, side: CommentSide): string | undefined => {
    if (!file.patch) return undefined;

    // Note: targetLine should be the file line number, not editor line number

    const lines = file.patch.split('\n');
    let currentHunkHeader = '';
    let currentHunkLines: string[] = [];
    let leftLine = 0;
    let rightLine = 0;
    let foundHunk = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('@@')) {
        // If we already found the hunk, return it
        if (foundHunk && currentHunkHeader) {
          const hunkContent = [currentHunkHeader, ...currentHunkLines];
          return hunkContent.join('\n');
        }

        // New hunk header
        currentHunkHeader = line;
        currentHunkLines = [];

        // Parse the line numbers from the hunk header
        const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (match) {
          leftLine = parseInt(match[1], 10);
          rightLine = parseInt(match[3], 10);
        }
      } else if (currentHunkHeader && !line.startsWith('diff --git') && !line.startsWith('index ') && !line.startsWith('---') && !line.startsWith('+++')) {
        // We're in a hunk content
        currentHunkLines.push(line);

        // Track line numbers based on the diff markers
        if (line.startsWith('-')) {
          // Line only in left side
          if (side === 'LEFT' && leftLine === targetLine) {
            foundHunk = true;
          }
          leftLine++;
        } else if (line.startsWith('+')) {
          // Line only in right side  
          if (side === 'RIGHT' && rightLine === targetLine) {
            foundHunk = true;
          }
          rightLine++;
        } else if (line.startsWith(' ')) {
          // Context line (exists in both sides)
          if ((side === 'LEFT' && leftLine === targetLine) || (side === 'RIGHT' && rightLine === targetLine)) {
            foundHunk = true;
          }
          leftLine++;
          rightLine++;
        } else if (!line.startsWith('\\')) {
          // Regular context line without space prefix (some patches don't have the space)
          if ((side === 'LEFT' && leftLine === targetLine) || (side === 'RIGHT' && rightLine === targetLine)) {
            foundHunk = true;
          }
          leftLine++;
          rightLine++;
        }
      }
    }

    // If we found the hunk but didn't return it yet (last hunk in file)
    if (foundHunk && currentHunkHeader) {
      const hunkContent = [currentHunkHeader, ...currentHunkLines];
      return hunkContent.join('\n');
    }

    console.warn(`Could not find diff hunk for line ${targetLine} on ${side} side`);
    return undefined;
  }, [file.patch]);

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

        console.log('Comment submission debug:', {
          showFullFile,
          hasPatch: Boolean(file.patch),
          editorLine: endLine,
          fileLine: endLineForApi,
          side,
          isMultiLine: isMultiLineSelection,
        });

        // In full file view, always use line-based API
        // In patch view, use position-based API for single-line comments
        const position = !showFullFile ? getDiffPositionForEditorLine(endLine, side) : undefined;

        // Use position-based API only in patch view for single-line comments
        if (!showFullFile && !isMultiLineSelection && !isMultiLineApi && position !== undefined) {
          // Use position-based API (only works in patch view)
          console.log('Creating comment with position:', {
            path: file.filename,
            position,
            editorLine: endLine,
            fileLine: endLineForApi,
            side,
          });

          const newComment = await api.createComment(
            repoOwner,
            repoName,
            pullNumber,
            trimmed,
            file.filename,
            undefined, // no line number for position-based
            undefined, // no side for position-based
            undefined, // no startLine for position-based
            undefined, // no startSide for position-based
            position,
          );

          onCommentAdded?.(newComment);
          setActiveOverlay({
            type: "thread",
            threadId: newComment.id,
            target: {
              lineNumber,
              startLineNumber: startLineNumber,
              endLineNumber: endLineNumber,
              side,
            },
          });
          setCommentDraft("");
        } else {
          // Fallback to line-based API when position not available (multi-line or position undefined)

          if (!file.patch) {
            console.error('No patch available for file', file.filename);
            setCommentError('No diff available for this file. Cannot create comment.');
            setIsSubmittingComment(false);
            return;
          }

          const diffHunk = getDiffHunkForLine(endLineForApi, side);

          if (!diffHunk) {
            console.error('Unable to get diff hunk:', {
              file: file.filename,
              fileLine: endLineForApi,
              editorLine: endLine,
              side,
              showFullFile,
              patchPreview: file.patch?.slice(0, 200)
            });
            const errorMsg = showFullFile
              ? `Cannot comment on line ${endLineForApi}. This line is not part of the diff changes. Only modified lines can be commented on.`
              : `Cannot find diff hunk for line ${endLineForApi}. The line may not be part of the changes.`;
            setCommentError(errorMsg);
            setIsSubmittingComment(false);
            return;
          }

          console.log('Creating comment with line range:', {
            path: file.filename,
            line: endLineForApi,
            side,
            startLine: startLineForApi !== endLineForApi ? startLineForApi : undefined,
            hasDiffHunk: Boolean(diffHunk),
          });

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
              startLineNumber: startLineNumber,
              endLineNumber: endLineNumber,
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
    getDiffHunkForLine,
    getDiffPositionForEditorLine,
    mapEditorLineToFileLine,
    onCommentAdded,
    pullNumber,
    repoName,
    repoOwner,
    token,
  ]);

  const language = getLanguageFromFilename(file.filename);
  const canShowFullFile = !(
    originalContent === undefined && modifiedContent === undefined
  );
  const handleToggleFullFile = useCallback(() => {
    if (file.status !== "modified" || !canShowFullFile) return;
    setShowFullFile((prev) => !prev);
  }, [canShowFullFile, file.status, setShowFullFile]);

  const handleToggleHideUnchanged = useCallback(() => {
    setHideUnchangedRegions((prev) => !prev);
  }, []);

  const effectiveOriginalContent =
    showFullFile && originalContent !== undefined
      ? originalContent || ""
      : patchData.original || "";
  const effectiveModifiedContent =
    showFullFile && modifiedContent !== undefined
      ? modifiedContent || ""
      : patchData.modified || "";

  // Check if content is ready to render
  // In full file mode, wait for content to load to prevent flicker
  const isContentReady = showFullFile
    ? (originalContent !== undefined && modifiedContent !== undefined)
    : true; // Patch content is always ready via useMemo

  const shouldRenderEditor = !isInitializing && isContentReady;

  return (
    <div className="flex flex-col h-full">
      <DiffEditorHeader
        file={file}
        theme={theme}
        diffView={diffView}
        showWhitespace={showWhitespace}
        wordWrap={wordWrap}
        showFullFile={showFullFile}
        hideUnchangedRegions={hideUnchangedRegions}
        isViewed={isViewed}
        canShowFullFile={canShowFullFile}
        onToggleDiffView={toggleDiffView}
        onToggleWhitespace={toggleWhitespace}
        onToggleWordWrap={toggleWordWrap}
        onToggleFullFile={handleToggleFullFile}
        onToggleHideUnchanged={handleToggleHideUnchanged}
        onMarkViewed={onMarkViewed}
      />

      <div className="flex-1 relative" ref={containerRef}>
        {shouldRenderEditor ? (
          <MonacoDiffEditor
            key={file.filename} // Force remount when file changes to ensure clean Monaco disposal
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
                enabled: showFullFile && hideUnchangedRegions,
                revealLineCount: 3,
                minimumLineCount: 3,
                contextLineCount: 3,
              },
              diffAlgorithm: "advanced",
            }}
            onMount={(editor, monaco) => {
              console.log('🏗️ Monaco editor mounted for:', file.filename);

              // Store references
              diffEditorRef.current = editor;
              monacoRef.current = monaco;

              try {
                const originalModel = editor.getOriginalEditor().getModel();
                const modifiedModel = editor.getModifiedEditor().getModel();

                // Ensure models have content
                if (originalModel && originalModel.getLineCount() === 0) {
                  originalModel.setValue(" ");
                }
                if (modifiedModel && modifiedModel.getLineCount() === 0) {
                  modifiedModel.setValue(" ");
                }

                // Set ready state after models are initialized
                setDiffEditorReady(true);
                console.log('✅ Monaco initialized and ready');
              } catch (error) {
                console.warn("Monaco Editor initialization warning:", error);
                setDiffEditorReady(false);
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading...</div>
          </div>
        )}

        {activeOverlay && overlayPosition && (
          <CommentOverlay
            overlay={activeOverlay}
            position={overlayPosition}
            theme={theme}
            canSubmitComments={canSubmitComments}
            currentUser={currentUser}
            activeThread={activeThread}
            commentDraft={commentDraft}
            commentError={commentError}
            isSubmittingComment={isSubmittingComment}
            overlayWidth={overlayWidth}
            overlayHeight={overlayHeight}
            resizeMode={resizeMode}
            onCommentDraftChange={(newValue) => {
              setCommentDraft(newValue);
              if (commentError) {
                setCommentError(null);
              }
            }}
            onClose={closeOverlay}
            onSubmit={handleCommentSubmit}
            onResizeStart={handleResizeStart}
          />
        )}
      </div>
    </div>
  );
}
