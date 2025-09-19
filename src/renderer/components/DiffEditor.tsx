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
import { CompactMarkdownEditor } from "./CompactMarkdownEditor";

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
  const [overlayWidth, setOverlayWidth] = useState(384); // Default w-96
  const [overlayHeight, setOverlayHeight] = useState(300); // Default height
  const [resizeMode, setResizeMode] = useState<'none' | 'width' | 'height' | 'both'>('none');
  const resizeStartX = useRef<number>(0);
  const resizeStartY = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);

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
                  value: `${thread.comments.length} comment${thread.comments.length === 1 ? "" : "s"
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

        // In patch view, we need to map the editor line number to the actual file line number
        // This is a simplified mapping - in reality we'd need to parse the patch to get accurate mappings
        console.log('Clicked on editor line', lineNumber, 'side', side);

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
    setOverlayWidth(384); // Reset to default width
    setOverlayHeight(300); // Reset to default height
  }, []);

  const handleResizeStart = useCallback((mode: 'width' | 'height' | 'both') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeMode(mode);
    resizeStartX.current = e.clientX;
    resizeStartY.current = e.clientY;
    resizeStartWidth.current = overlayWidth;
    resizeStartHeight.current = overlayHeight;
  }, [overlayWidth, overlayHeight]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (resizeMode === 'none') return;

    if (resizeMode === 'width' || resizeMode === 'both') {
      const deltaX = e.clientX - resizeStartX.current;
      const newWidth = Math.max(320, Math.min(800, resizeStartWidth.current + deltaX));
      setOverlayWidth(newWidth);
    }

    if (resizeMode === 'height' || resizeMode === 'both') {
      const deltaY = e.clientY - resizeStartY.current;
      const newHeight = Math.max(200, Math.min(600, resizeStartHeight.current + deltaY));
      setOverlayHeight(newHeight);
    }
  }, [resizeMode]);

  const handleResizeEnd = useCallback(() => {
    setResizeMode('none');
  }, []);

  useEffect(() => {
    if (resizeMode !== 'none') {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);

      // Set appropriate cursor
      if (resizeMode === 'width') {
        document.body.style.cursor = 'ew-resize';
      } else if (resizeMode === 'height') {
        document.body.style.cursor = 'ns-resize';
      } else if (resizeMode === 'both') {
        document.body.style.cursor = 'nwse-resize';
      }
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [resizeMode, handleResizeMove, handleResizeEnd]);

  const canSubmitComments = Boolean(
    token && repoOwner && repoName && pullNumber,
  );

  // Get the position in the diff for a given editor line
  const getDiffPositionForEditorLine = useCallback((editorLine: number, side: CommentSide): number | undefined => {
    if (!file.patch || showFullFile) return undefined;

    const lines = file.patch.split('\n');
    let position = 0;
    let currentEditorLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip headers
      if (line.startsWith('diff --git') || line.startsWith('index ') ||
        line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
        continue;
      }

      // Count diff position
      position++;

      // Track editor lines based on side
      if (side === 'RIGHT') {
        // For RIGHT side, count everything except lines that start with '-'
        if (!line.startsWith('-')) {
          currentEditorLine++;
          if (currentEditorLine === editorLine) {
            return position;
          }
        }
      } else {
        // For LEFT side, count everything except lines that start with '+'
        if (!line.startsWith('+')) {
          currentEditorLine++;
          if (currentEditorLine === editorLine) {
            return position;
          }
        }
      }
    }

    return undefined;
  }, [file.patch, showFullFile]);

  // Extract diff hunk for a given line
  const getDiffHunkForLine = useCallback((targetLine: number, side: CommentSide): string | undefined => {
    if (!file.patch) return undefined;

    // When showFullFile is true, we're showing the full file content, not the patch
    // In this case, we can't generate a proper diff hunk
    if (showFullFile) {
      console.warn('Cannot create comments when viewing full file - switch to diff view');
      return undefined;
    }

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
  }, [file.patch, showFullFile]);

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

        // Try to use position-based API first (more reliable for patch view)
        const position = getDiffPositionForEditorLine(endLine, side);

        if (position !== undefined) {
          // Use position-based API
          console.log('Creating comment with position:', {
            path: file.filename,
            position,
            editorLine: endLine,
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
            undefined, // no diffHunk needed for position-based
            position,
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
        } else {
          // Fallback to line-based API with diff hunk
          const diffHunk = getDiffHunkForLine(endLine, side);

          if (!diffHunk) {
            console.error('Unable to get diff hunk for line', endLine, 'side', side);
            setCommentError('Cannot comment on this line. Make sure you are in diff view and commenting on a changed line.');
            setIsSubmittingComment(false);
            return;
          }

          console.log('Creating comment with line/hunk:', {
            path: file.filename,
            line: endLine,
            side,
            startLine: startLine !== endLine ? startLine : undefined,
            diffHunk: diffHunk.substring(0, 100) + '...'
          });

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
            diffHunk,
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
              "absolute rounded-md shadow-lg border z-20 flex flex-col",
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200",
              resizeMode !== 'none' && "select-none",
            )}
            style={{
              top: overlayPosition.top,
              left: overlayPosition.left,
              width: `${overlayWidth}px`,
              height: `${overlayHeight}px`,
              maxWidth: '90vw',
              maxHeight: '80vh',
            }}
          >
            <div
              className={cn(
                "flex items-center justify-between px-3 py-1.5 border-b",
                theme === "dark"
                  ? "border-gray-700 text-gray-100"
                  : "border-gray-200 text-gray-800",
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {canSubmitComments && currentUser && activeOverlay.type === "new" && (
                  <img
                    src={currentUser.avatar_url || ""}
                    alt={currentUser.login || "You"}
                    className="w-5 h-5 rounded-full flex-shrink-0"
                  />
                )}
                <div className="flex flex-col text-xs min-w-0">
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <MessageSquare className="w-3 h-3" />
                    {activeOverlay.type === "thread"
                      ? "Conversation"
                      : "Start review comment"}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] truncate",
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

            <div className="px-3 py-2 flex-1 flex flex-col gap-2 overflow-y-auto min-h-0">
              {activeOverlay.type === "thread" && activeThread && (
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1 text-sm">
                  {activeThread.comments.map((comment) => (
                    <div key={comment.id} className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={comment.user.avatar_url}
                          alt={comment.user.login}
                          className="w-4 h-4 rounded-full"
                        />
                        <span className="text-xs font-medium">
                          {comment.user.login}
                        </span>
                        <span
                          className={cn(
                            "text-[10px]",
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
                          "text-xs whitespace-pre-wrap leading-relaxed",
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
                  <div className="flex-1 flex flex-col min-h-0">
                    <CompactMarkdownEditor
                      value={commentDraft}
                      onChange={(newValue) => {
                        setCommentDraft(newValue);
                        if (commentError) {
                          setCommentError(null);
                        }
                      }}
                      placeholder={
                        activeOverlay.type === "thread"
                          ? "Reply to this thread..."
                          : "Leave a comment on this line..."
                      }
                      autoFocus
                      flexible
                      className="flex-1"
                    />
                  </div>

                  {commentError && (
                    <div className="flex items-center gap-2 text-sm text-red-500">
                      <AlertCircle className="w-4 h-4" />
                      <span>{commentError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1 flex-shrink-0">
                    <button
                      onClick={closeOverlay}
                      className="btn btn-ghost text-xs px-3 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCommentSubmit}
                      disabled={
                        !commentDraft.trim() || isSubmittingComment || !canSubmitComments
                      }
                      className="btn btn-primary text-xs px-3 py-1 flex items-center gap-1"
                    >
                      {isSubmittingComment && (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                      {activeOverlay.type === "thread" ? "Reply" : "Comment"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right edge resize handle */}
            <div
              className={cn(
                "absolute top-0 right-0 w-1 h-full cursor-ew-resize group",
                "hover:bg-blue-500/30 transition-colors",
                resizeMode === 'width' && "bg-blue-500/30",
              )}
              onMouseDown={handleResizeStart('width')}
            >
              <div
                className={cn(
                  "absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 -mr-1.5",
                  "flex items-center justify-center",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  resizeMode === 'width' && "opacity-100",
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <div className={cn(
                    "w-0.5 h-0.5 rounded-full",
                    theme === "dark" ? "bg-gray-400" : "bg-gray-500",
                  )} />
                  <div className={cn(
                    "w-0.5 h-0.5 rounded-full",
                    theme === "dark" ? "bg-gray-400" : "bg-gray-500",
                  )} />
                  <div className={cn(
                    "w-0.5 h-0.5 rounded-full",
                    theme === "dark" ? "bg-gray-400" : "bg-gray-500",
                  )} />
                </div>
              </div>
            </div>

            {/* Bottom edge resize handle */}
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize group",
                "hover:bg-blue-500/30 transition-colors",
                resizeMode === 'height' && "bg-blue-500/30",
              )}
              onMouseDown={handleResizeStart('height')}
            >
              <div
                className={cn(
                  "absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-4 -mb-1.5",
                  "flex items-center justify-center",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  resizeMode === 'height' && "opacity-100",
                )}
              >
                <div className="flex gap-0.5">
                  <div className={cn(
                    "w-0.5 h-0.5 rounded-full",
                    theme === "dark" ? "bg-gray-400" : "bg-gray-500",
                  )} />
                  <div className={cn(
                    "w-0.5 h-0.5 rounded-full",
                    theme === "dark" ? "bg-gray-400" : "bg-gray-500",
                  )} />
                  <div className={cn(
                    "w-0.5 h-0.5 rounded-full",
                    theme === "dark" ? "bg-gray-400" : "bg-gray-500",
                  )} />
                </div>
              </div>
            </div>

            {/* Corner resize handle */}
            <div
              className={cn(
                "absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize",
                "hover:bg-blue-500/50 transition-colors",
                resizeMode === 'both' && "bg-blue-500/50",
              )}
              onMouseDown={handleResizeStart('both')}
            >
              <div
                className={cn(
                  "absolute bottom-0.5 right-0.5 w-2 h-2",
                  "border-b-2 border-r-2",
                  theme === "dark" ? "border-gray-400" : "border-gray-500",
                  "opacity-50 group-hover:opacity-100 transition-opacity",
                  resizeMode === 'both' && "opacity-100",
                )}
              />
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
