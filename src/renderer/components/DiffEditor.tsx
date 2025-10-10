import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DiffEditor as MonacoDiffEditor, loader } from "@monaco-editor/react";
import type { editor as MonacoEditorType } from "monaco-editor";
import type { Monaco } from "@monaco-editor/react";

import type { Comment, File } from "../services/github";
import { useUIStore } from "../stores/uiStore";
import { DiffEditorHeader } from "./diff/DiffEditorHeader";
import { CommentOverlay } from "./diff/CommentOverlay";
import { ImageDiffViewer } from "./diff/ImageDiffViewer";
import { isImageFile } from "../utils/fileType";
import { useDiffModel } from "./diff/useDiffModel";
import { useCommentManager } from "./diff/useCommentManager";
import { getLanguageFromFilename } from "./diff/commentUtils";

// Configure Monaco Editor loader
loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs",
  },
});

interface DiffEditorProps {
  file: File;
  originalContent?: string;
  modifiedContent?: string;
  originalBinaryContent?: string | null;
  modifiedBinaryContent?: string | null;
  isBinary?: boolean;
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
  originalBinaryContent,
  modifiedBinaryContent,
  isBinary = false,
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

  const hasFullContent = !(originalContent === undefined && modifiedContent === undefined);
  const [showFullFile, setShowFullFile] = useState(hasFullContent);
  const [diffEditorReady, setDiffEditorReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hideUnchangedRegions, setHideUnchangedRegions] = useState(false);

  useEffect(() => {
    setShowFullFile(hasFullContent);
  }, [file.filename, hasFullContent]);

  useEffect(() => {
    diffEditorRef.current = null;
    monacoRef.current = null;
    setIsInitializing(true);
    setDiffEditorReady(false);

    const timer = window.setTimeout(() => {
      setIsInitializing(false);
    }, 50);

    return () => window.clearTimeout(timer);
  }, [file.filename]);

  const diffModel = useDiffModel(file, showFullFile);
  const { patchData } = diffModel;

  const commentManager = useCommentManager({
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
  });

  const isRecognizedImage = useMemo(
    () => isImageFile(file.filename),
    [file.filename],
  );
  const isImageDiff = (isBinary || isRecognizedImage) && isRecognizedImage;

  const effectiveOriginalContent =
    showFullFile && originalContent !== undefined
      ? originalContent || ""
      : patchData.original || "";
  const effectiveModifiedContent =
    showFullFile && modifiedContent !== undefined
      ? modifiedContent || ""
      : patchData.modified || "";

  const isContentReady = showFullFile
    ? (originalContent !== undefined && modifiedContent !== undefined)
    : true;

  const shouldRenderImageViewer = isImageDiff && !isInitializing;
  const shouldRenderEditor = !isImageDiff && !isInitializing && isContentReady;

  const language = getLanguageFromFilename(file.filename);

  const handleToggleFullFile = useCallback(() => {
    if (file.status !== "modified" || !hasFullContent) return;
    setShowFullFile((prev) => !prev);
  }, [file.status, hasFullContent]);

  const handleToggleHideUnchanged = useCallback(() => {
    setHideUnchangedRegions((prev) => !prev);
  }, []);

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
        canShowFullFile={hasFullContent}
        onToggleDiffView={toggleDiffView}
        onToggleWhitespace={toggleWhitespace}
        onToggleWordWrap={toggleWordWrap}
        onToggleFullFile={handleToggleFullFile}
        onToggleHideUnchanged={handleToggleHideUnchanged}
        onMarkViewed={onMarkViewed}
      />

      <div className="flex-1 relative" ref={containerRef}>
        {shouldRenderImageViewer ? (
          <ImageDiffViewer
            file={file}
            originalSrc={originalBinaryContent}
            modifiedSrc={modifiedBinaryContent}
            diffView={diffView}
            theme={theme}
          />
        ) : shouldRenderEditor ? (
          <MonacoDiffEditor
            key={file.filename}
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
              diffEditorRef.current = editor;
              monacoRef.current = monaco;

              try {
                const originalModel = editor.getOriginalEditor().getModel();
                const modifiedModel = editor.getModifiedEditor().getModel();

                if (originalModel && originalModel.getLineCount() === 0) {
                  originalModel.setValue(" ");
                }
                if (modifiedModel && modifiedModel.getLineCount() === 0) {
                  modifiedModel.setValue(" ");
                }

                setDiffEditorReady(true);
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

        {!isImageDiff &&
          commentManager.activeOverlay &&
          commentManager.overlayPosition && (
            <CommentOverlay
              overlay={commentManager.activeOverlay}
              position={commentManager.overlayPosition}
              theme={theme}
              canSubmitComments={commentManager.canSubmitComments}
              currentUser={currentUser}
              activeThread={commentManager.activeThread}
              commentDraft={commentManager.commentDraft}
              commentError={commentManager.commentError}
              isSubmittingComment={commentManager.isSubmittingComment}
              overlayWidth={commentManager.overlayWidth}
              overlayHeight={commentManager.overlayHeight}
              resizeMode={commentManager.resizeMode}
              onCommentDraftChange={commentManager.handleCommentDraftChange}
              onClose={commentManager.closeOverlay}
              onSubmit={commentManager.handleCommentSubmit}
              onResizeStart={commentManager.handleResizeStart}
            />
          )}
      </div>
    </div>
  );
}
