import { useRef, useEffect, useState } from "react";
import {
  DiffEditor as MonacoDiffEditor,
  Editor as MonacoEditor,
} from "@monaco-editor/react";
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
} from "lucide-react";
import { File, Comment } from "../services/github";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";
import "../utils/monaco-loader"; // Import Monaco loader configuration

interface DiffEditorProps {
  file: File;
  originalContent?: string;
  modifiedContent?: string;
  comments: Comment[];
  onMarkViewed: () => void;
  isViewed: boolean;
}

export function DiffEditor({
  file,
  originalContent,
  modifiedContent,
  comments,
  onMarkViewed,
  isViewed,
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
  const [patchOriginalContent, setPatchOriginalContent] = useState("");
  const [patchModifiedContent, setPatchModifiedContent] = useState("");
  const [showCommentForm, setShowCommentForm] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showFullFile, setShowFullFile] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    // Reset to patch view when file changes
    setShowFullFile(false);

    // Always parse the patch for diff view
    if (file.patch) {
      const { original, modified } = parsePatch(file.patch);
      setPatchOriginalContent(original);
      setPatchModifiedContent(modified);
    }
  }, [file.patch]);

  const parsePatch = (patch: string) => {
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

    // Parse the patch to extract hunks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Parse hunk header
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

          // Collect lines for this hunk
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
              // Skip this marker (with or without space after backslash)
            } else if (
              hunkLine.startsWith("---") ||
              hunkLine.startsWith("+++") ||
              hunkLine.startsWith("index ")
            ) {
              // Skip file headers
            } else if (hunkLine.startsWith("\\")) {
              // Skip any other backslash-prefixed Git markers
            } else {
              // Might be part of the content, treat as context
              if (hunkLine.length > 0) {
                hunk.lines.push({ type: " ", content: hunkLine });
              }
            }
            i++;
          }
          i--; // Back up one since the outer loop will increment

          hunks.push(hunk);
        }
      }
    }

    if (hunks.length === 0) {
      return { original: "", modified: "" };
    }

    // Build properly aligned content arrays
    const originalLines: string[] = [];
    const modifiedLines: string[] = [];

    for (const hunk of hunks) {
      // Process hunk lines maintaining alignment
      let i = 0;
      while (i < hunk.lines.length) {
        const line = hunk.lines[i];

        if (line.type === " ") {
          // Context line - same in both
          originalLines.push(line.content);
          modifiedLines.push(line.content);
          i++;
        } else if (line.type === "-") {
          // Deletion - collect all consecutive deletions
          const deletions: string[] = [];
          while (i < hunk.lines.length && hunk.lines[i].type === "-") {
            deletions.push(hunk.lines[i].content);
            i++;
          }

          // Check for following additions (replacement)
          const additions: string[] = [];
          while (i < hunk.lines.length && hunk.lines[i].type === "+") {
            additions.push(hunk.lines[i].content);
            i++;
          }

          // Add the lines, padding shorter side with empty lines
          const maxLines = Math.max(deletions.length, additions.length);
          for (let j = 0; j < maxLines; j++) {
            originalLines.push(deletions[j] || "");
            modifiedLines.push(additions[j] || "");
          }
        } else if (line.type === "+") {
          // Pure addition (no preceding deletion)
          originalLines.push("");
          modifiedLines.push(line.content);
          i++;
        }
      }
    }

    // Ensure we always have at least one line to prevent Monaco Editor issues
    const originalContent = originalLines.length > 0 ? originalLines.join("\n") : "";
    const modifiedContent = modifiedLines.length > 0 ? modifiedLines.join("\n") : "";

    return {
      original: originalContent,
      modified: modifiedContent,
    };
  };

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

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    // Submit comment via GitHub API
    // This would be implemented with the actual API call
    console.log(
      "Submitting comment:",
      commentText,
      "on line:",
      showCommentForm,
    );

    setCommentText("");
    setShowCommentForm(null);
  };

  const language = getLanguageFromFilename(file.filename);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
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
          {/* Only show diff view toggle for modified/removed files */}
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

          {/* Only show Full/Diff toggle for modified files, not for new or removed files */}
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

      {/* Editor */}
      <div className="flex-1 relative">
        {file.status === "added" ? (
          // For new files, show a regular editor with just the new content
          <MonacoEditor
            value={
              showFullFile && modifiedContent !== undefined
                ? modifiedContent
                : patchModifiedContent
            }
            language={language}
            theme={theme === "dark" ? "vs-dark" : "vs"}
            options={{
              readOnly: true,
              renderWhitespace: showWhitespace ? "all" : "none",
              wordWrap: wordWrap ? "on" : "off",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineHeight: 18,
              renderLineHighlight: "none",
              glyphMargin: true,
              folding: true,
              lineNumbers: "on",
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
              renderValidationDecorations: "off",
              scrollbar: {
                vertical: "visible",
                horizontal: "visible",
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
          />
        ) : (
          // For modified or removed files, show the diff editor
          <MonacoDiffEditor
            original={
              showFullFile && originalContent !== undefined
                ? originalContent || ""
                : patchOriginalContent || ""
            }
            modified={
              showFullFile && modifiedContent !== undefined
                ? modifiedContent || ""
                : patchModifiedContent || ""
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
              glyphMargin: true,
              folding: true,
              lineNumbers: "on",
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
              renderValidationDecorations: "off",
              scrollbar: {
                vertical: "visible",
                horizontal: "visible",
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
              // Enable collapsing of unchanged regions (works best with full file view)
              hideUnchangedRegions: {
                enabled: !showFullFile ? false : true, // Only enable for full file view
                revealLineCount: 3, // Show 3 lines of context around changes
                minimumLineCount: 3, // Minimum lines to show in collapsed region
                contextLineCount: 3, // Context lines to show around changes
              },
              // Improve diff algorithm
              diffAlgorithm: "advanced",
            }}
            onMount={(editor) => {
              editorRef.current = editor;

              // Add error handling for Monaco Editor
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
        )}

        {/* Comment overlay */}
        {showCommentForm !== null && (
          <div
            className={cn(
              "absolute top-16 right-4 w-96 rounded-lg shadow-lg p-4 z-10 border",
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200",
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Add comment</h4>
              <button
                onClick={() => setShowCommentForm(null)}
                className={cn(
                  theme === "dark"
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-600 hover:text-gray-900",
                )}
              >
                ×
              </button>
            </div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="input w-full h-24 resize-none mb-3"
              placeholder="Leave a comment..."
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCommentForm(null)}
                className="btn btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitComment}
                className="btn btn-primary text-sm"
              >
                Comment
              </button>
            </div>
          </div>
        )}

        {/* Inline comments */}
        {comments.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 max-h-48 overflow-y-auto">
            <div
              className={cn(
                "rounded-lg p-3 border",
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200",
              )}
            >
              <h4 className="text-sm font-semibold mb-2 flex items-center">
                <MessageSquare className="w-4 h-4 mr-1" />
                Comments ({comments.length})
              </h4>
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <div className="flex items-center space-x-2 mb-1">
                      <img
                        src={comment.user.avatar_url}
                        alt={comment.user.login}
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="font-medium">{comment.user.login}</span>
                      {comment.line && (
                        <span
                          className={cn(
                            "text-xs",
                            theme === "dark"
                              ? "text-gray-500"
                              : "text-gray-600",
                          )}
                        >
                          Line {comment.line}
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "ml-7",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      {comment.body}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
