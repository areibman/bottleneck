import { FC } from "react";
import {
  Eye,
  Columns,
  FileText,
  Check,
  WrapText,
  WholeWord,
  FilePlus,
  FileMinus,
  FileEdit,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { File } from "../../services/github";
import { cn } from "../../utils/cn";
import { isImageFile } from "../../utils/fileType";

interface DiffEditorHeaderProps {
  file: File;
  theme: string;
  diffView: "unified" | "split";
  showWhitespace: boolean;
  wordWrap: boolean;
  showFullFile: boolean;
  hideUnchangedRegions: boolean;
  isViewed: boolean;
  canShowFullFile: boolean;
  onToggleDiffView: () => void;
  onToggleWhitespace: () => void;
  onToggleWordWrap: () => void;
  onToggleFullFile: () => void;
  onToggleHideUnchanged: () => void;
  onMarkViewed: () => void;
}

export const DiffEditorHeader: FC<DiffEditorHeaderProps> = ({
  file,
  theme,
  diffView,
  showWhitespace,
  wordWrap,
  showFullFile,
  hideUnchangedRegions,
  isViewed,
  canShowFullFile,
  onToggleDiffView,
  onToggleWhitespace,
  onToggleWordWrap,
  onToggleFullFile,
  onToggleHideUnchanged,
  onMarkViewed,
}) => {
  const isDark = theme === "dark";
  const fullFileTitle = canShowFullFile
    ? showFullFile
      ? "Show diff"
      : "Show full file"
    : "Full file content not available";
  const isImage = isImageFile(file.filename);
  const hasNoLineChanges =
    file.additions === 0 && file.deletions === 0;

  return (
    <div
      className={cn(
        "py-1 px-2 flex items-center justify-between border-b",
        isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200",
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
              {file.additions === 0 && file.deletions === 0
                ? "New file"
                : `New file (+${file.additions} lines)`}
            </span>
          ) : file.status === "removed" ? (
            <span className="text-red-500 font-medium">
              Deleted (-{file.deletions} lines)
            </span>
          ) : (
            <>
              {isImage && hasNoLineChanges ? (
                <span className="text-yellow-500 font-medium">Changed</span>
              ) : (
                <>
                  <span className="text-green-400">+{file.additions}</span>
                  <span className="text-red-400">-{file.deletions}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {file.status !== "added" && (
          <button
            onClick={onToggleDiffView}
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
          onClick={onToggleWhitespace}
          className={cn(
            "btn btn-ghost p-1 text-xs",
            showWhitespace && (isDark ? "bg-gray-700" : "bg-gray-200"),
          )}
          title="Toggle whitespace"
        >
          W
        </button>

        {file.status === "modified" && (
          <>
            <button
              onClick={onToggleFullFile}
              className={cn(
                "btn btn-ghost px-2 py-1 text-xs flex items-center gap-1",
                showFullFile && (isDark ? "bg-gray-700" : "bg-gray-200"),
                !canShowFullFile && "opacity-50 cursor-not-allowed",
              )}
              disabled={!canShowFullFile}
              title={fullFileTitle}
            >
              <WholeWord className="w-4 h-4" />
              <span>{showFullFile ? "Diff" : "Full"}</span>
            </button>

            {showFullFile && (
              <button
                onClick={onToggleHideUnchanged}
                className={cn(
                  "btn btn-ghost p-1 text-xs",
                  hideUnchangedRegions && (isDark ? "bg-gray-700" : "bg-gray-200"),
                )}
                title={hideUnchangedRegions ? "Show all lines" : "Hide unchanged lines"}
              >
                {hideUnchangedRegions ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
            )}
          </>
        )}

        <button
          onClick={onToggleWordWrap}
          className={cn(
            "btn btn-ghost p-1 text-sm",
            wordWrap && (isDark ? "bg-gray-700" : "bg-gray-200"),
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
  );
};
