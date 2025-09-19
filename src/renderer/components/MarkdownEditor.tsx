import { useState, useCallback, useRef, useEffect, memo } from "react";
import {
  Eye,
  Edit,
  Maximize2,
  Minimize2,
  Bold,
  Italic,
  Link,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading,
} from "lucide-react";
import { cn } from "../utils/cn";
import { useUIStore } from "../stores/uiStore";
import { Markdown } from "./Markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  autoFocus?: boolean;
  className?: string;
}

// Memoize the toolbar to prevent re-renders
const Toolbar = memo(
  ({
    onBold,
    onItalic,
    onCode,
    onLink,
    onList,
    onOrderedList,
    onQuote,
    onHeading,
    showPreview,
    onTogglePreview,
    isFullscreen,
    onToggleFullscreen,
    theme,
  }: any) => {
    return (
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-gray-50 border-gray-200",
        )}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onBold}
            className={cn(
              "p-1.5 rounded transition-colors",
              theme === "dark"
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
            )}
            title="Bold (Cmd+B)"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onItalic}
            className={cn(
              "p-1.5 rounded transition-colors",
              theme === "dark"
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
            )}
            title="Italic (Cmd+I)"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onHeading}
            className={cn(
              "p-1.5 rounded transition-colors",
              theme === "dark"
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
            )}
            title="Heading"
          >
            <Heading className="w-4 h-4" />
          </button>

          <div
            className={cn(
              "w-px h-5 mx-1",
              theme === "dark" ? "bg-gray-700" : "bg-gray-300",
            )}
          />

          <button
            type="button"
            onClick={onCode}
            className={cn(
              "p-1.5 rounded transition-colors",
              theme === "dark"
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
            )}
            title="Code"
          >
            <Code className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onLink}
            className={cn(
              "p-1.5 rounded transition-colors",
              theme === "dark"
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
            )}
            title="Link (Cmd+K)"
          >
            <Link className="w-4 h-4" />
          </button>

          <div
            className={cn(
              "w-px h-5 mx-1",
              theme === "dark" ? "bg-gray-700" : "bg-gray-300",
            )}
          />

          <button
            type="button"
            onClick={onList}
            className={cn(
              "p-1.5 rounded transition-colors",
              theme === "dark"
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
            )}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOrderedList}
            className={cn(
              "p-1.5 rounded transition-colors",
              theme === "dark"
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
            )}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onQuote}
            className={cn(
              "p-1.5 rounded transition-colors",
              theme === "dark"
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
            )}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onTogglePreview}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors",
              theme === "dark"
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
              showPreview &&
              (theme === "dark"
                ? "bg-gray-700 text-gray-200"
                : "bg-gray-200 text-gray-800"),
            )}
            title="Toggle Preview"
          >
            {showPreview ? (
              <Edit className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span>{showPreview ? "Edit" : "Preview"}</span>
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            className={cn(
              "p-1.5 rounded transition-colors",
              theme === "dark"
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-200 text-gray-600 hover:text-gray-800",
            )}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    );
  },
);

Toolbar.displayName = "Toolbar";

export const MarkdownEditor = memo(function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your comment here... (Markdown supported)",
  minHeight = "120px",
  maxHeight = "400px",
  autoFocus = false,
  className,
}: MarkdownEditorProps) {
  const { theme } = useUIStore();
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Don't use local state - directly use the value from props
  // This prevents the double state management that was causing lag
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const insertMarkdown = useCallback(
    (before: string, after: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const newText =
        value.substring(0, start) +
        before +
        selectedText +
        after +
        value.substring(end);

      onChange(newText);

      // Restore focus and selection
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length + selectedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange],
  );

  const handleBold = useCallback(
    () => insertMarkdown("**", "**"),
    [insertMarkdown],
  );
  const handleItalic = useCallback(
    () => insertMarkdown("*", "*"),
    [insertMarkdown],
  );
  const handleCode = useCallback(
    () => insertMarkdown("`", "`"),
    [insertMarkdown],
  );

  const handleLink = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || "link text";
    const newText =
      value.substring(0, start) +
      `[${selectedText}](url)` +
      value.substring(end);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const urlStart = start + selectedText.length + 3;
      textarea.setSelectionRange(urlStart, urlStart + 3);
    }, 0);
  }, [value, onChange]);

  const handleList = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newText =
      value.substring(0, lineStart) + "- " + value.substring(lineStart);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2);
    }, 0);
  }, [value, onChange]);

  const handleOrderedList = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newText =
      value.substring(0, lineStart) + "1. " + value.substring(lineStart);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 3, start + 3);
    }, 0);
  }, [value, onChange]);

  const handleQuote = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newText =
      value.substring(0, lineStart) + "> " + value.substring(lineStart);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2);
    }, 0);
  }, [value, onChange]);

  const handleHeading = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newText =
      value.substring(0, lineStart) + "## " + value.substring(lineStart);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 3, start + 3);
    }, 0);
  }, [value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Add tab support for indentation
      if (e.key === "Tab") {
        e.preventDefault();
        insertMarkdown("  ");
      }

      // Cmd/Ctrl + B for bold
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        handleBold();
      }

      // Cmd/Ctrl + I for italic
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        handleItalic();
      }

      // Cmd/Ctrl + K for link
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleLink();
      }
    },
    [insertMarkdown, handleBold, handleItalic, handleLink],
  );

  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden",
        theme === "dark"
          ? "bg-gray-900 border-gray-700"
          : "bg-white border-gray-300",
        isFullscreen && "fixed inset-4 z-50",
        className,
      )}
    >
      <Toolbar
        onBold={handleBold}
        onItalic={handleItalic}
        onCode={handleCode}
        onLink={handleLink}
        onList={handleList}
        onOrderedList={handleOrderedList}
        onQuote={handleQuote}
        onHeading={handleHeading}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview(!showPreview)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        theme={theme}
      />

      {/* Editor/Preview Area */}
      <div
        className={cn("relative", isFullscreen ? "h-[calc(100%-3rem)]" : "")}
      >
        {showPreview ? (
          <div
            className={cn(
              "p-4 overflow-auto",
              isFullscreen
                ? "h-full"
                : `min-h-[${minHeight}] max-h-[${maxHeight}]`,
            )}
            style={{ minHeight, maxHeight: isFullscreen ? "100%" : maxHeight }}
          >
            {value ? (
              <Markdown content={value} />
            ) : (
              <p
                className={cn(
                  "text-sm italic",
                  theme === "dark" ? "text-gray-500" : "text-gray-400",
                )}
              >
                Nothing to preview
              </p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              "w-full p-4 resize-none focus:outline-none font-mono text-sm",
              theme === "dark"
                ? "bg-gray-900 text-gray-100 placeholder-gray-500"
                : "bg-white text-gray-900 placeholder-gray-400",
              isFullscreen ? "h-full" : "",
            )}
            style={{
              minHeight: isFullscreen ? "100%" : minHeight,
              maxHeight: isFullscreen ? "100%" : maxHeight,
            }}
          />
        )}
      </div>

      {/* Footer with tips */}
      {!showPreview && (
        <div
          className={cn(
            "px-3 py-1 text-xs border-t",
            theme === "dark"
              ? "bg-gray-800 border-gray-700 text-gray-500"
              : "bg-gray-50 border-gray-200 text-gray-400",
          )}
        >
          <span>
            Markdown supported • Drag & drop images • Cmd+B for bold, Cmd+I for
            italic
          </span>
        </div>
      )}
    </div>
  );
});
