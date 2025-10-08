import { useState, useCallback, useRef, memo } from "react";
import { Eye, Edit } from "lucide-react";
import { cn } from "../utils/cn";
import { useUIStore } from "../stores/uiStore";
import { Markdown } from "./Markdown";

interface CompactMarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
    maxHeight?: string;
    autoFocus?: boolean;
    className?: string;
    flexible?: boolean; // Allow the editor to expand with container
}

export const CompactMarkdownEditor = memo(function CompactMarkdownEditor({
    value,
    onChange,
    placeholder = "Write your comment here... (Markdown supported)",
    minHeight = "80px",
    maxHeight = "160px",
    autoFocus = false,
    className,
    flexible = false,
}: CompactMarkdownEditorProps) {
    const { theme } = useUIStore();
    const [showPreview, setShowPreview] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            onChange(e.target.value);
        },
        [onChange],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            // Add tab support for indentation
            if (e.key === "Tab") {
                e.preventDefault();
                const textarea = textareaRef.current;
                if (!textarea) return;

                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newText =
                    value.substring(0, start) + "  " + value.substring(end);

                onChange(newText);

                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + 2, start + 2);
                }, 0);
            }
        },
        [value, onChange],
    );

    return (
        <div
            className={cn(
                "rounded-md border overflow-hidden",
                theme === "dark"
                    ? "bg-gray-900 border-gray-700"
                    : "bg-white border-gray-300",
                flexible && "flex flex-col h-full",
                className,
            )}
        >
            {/* Compact toolbar */}
            <div
                className={cn(
                    "flex items-center justify-between px-2 py-1 border-b",
                    theme === "dark"
                        ? "bg-gray-800 border-gray-700"
                        : "bg-gray-50 border-gray-200",
                )}
            >
                <span
                    className={cn(
                        "text-[10px]",
                        theme === "dark" ? "text-gray-500" : "text-gray-400",
                    )}
                >
                    Markdown supported
                </span>
                <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors",
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
                        <Edit className="w-3 h-3" />
                    ) : (
                        <Eye className="w-3 h-3" />
                    )}
                    <span className="text-[10px]">{showPreview ? "Edit" : "Preview"}</span>
                </button>
            </div>

            {/* Editor/Preview Area */}
            <div className={cn("relative", flexible && "flex-1 flex flex-col")}>
                {showPreview ? (
                    <div
                        className={cn(
                            "p-2 overflow-auto text-xs",
                            theme === "dark" ? "text-gray-200" : "text-gray-700",
                            flexible && "flex-1",
                        )}
                        style={flexible ? {} : { minHeight, maxHeight }}
                    >
                        {value ? (
                            <Markdown content={value} variant="compact" />
                        ) : (
                            <p
                                className={cn(
                                    "text-xs italic",
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
                            "w-full p-2 resize-none focus:outline-none text-xs",
                            theme === "dark"
                                ? "bg-gray-900 text-gray-100 placeholder-gray-500"
                                : "bg-white text-gray-900 placeholder-gray-400",
                            flexible && "flex-1",
                        )}
                        style={flexible ? {} : {
                            minHeight,
                            maxHeight,
                        }}
                    />
                )}
            </div>
        </div>
    );
});
