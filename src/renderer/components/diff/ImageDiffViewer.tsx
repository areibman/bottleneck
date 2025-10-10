import { FC } from "react";
import { File } from "../../services/github";
import { cn } from "../../utils/cn";

interface ImageDiffViewerProps {
  file: File;
  originalSrc?: string | null;
  modifiedSrc?: string | null;
  diffView: "unified" | "split";
  theme: "light" | "dark";
}

const Panel: FC<{
  title: string;
  src?: string | null;
  emptyMessage: string;
  theme: "light" | "dark";
}> = ({ title, src, emptyMessage, theme }) => {
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded border p-4 overflow-auto",
        isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white",
      )}
    >
      <h4
        className={cn(
          "text-xs font-medium uppercase mb-3",
          isDark ? "text-gray-300" : "text-gray-600",
        )}
      >
        {title}
      </h4>
      <div className="flex-1 flex items-center justify-center">
        {typeof src === "string" ? (
          <img
            src={src}
            alt={title}
            className="max-h-full max-w-full object-contain rounded shadow-sm"
          />
        ) : src === undefined ? (
          <div
            className={cn(
              "text-xs text-center px-4 py-6 rounded border border-dashed",
              isDark ? "text-gray-400 border-gray-600" : "text-gray-500 border-gray-300",
            )}
          >
            Loading image…
          </div>
        ) : (
          <div
            className={cn(
              "text-xs text-center px-4 py-6 rounded border border-dashed",
              isDark ? "text-gray-400 border-gray-600" : "text-gray-500 border-gray-300",
            )}
          >
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export const ImageDiffViewer: FC<ImageDiffViewerProps> = ({
  file,
  originalSrc,
  modifiedSrc,
  diffView,
  theme,
}) => {
  const isSplit = diffView === "split";

  const showOriginalPanel = file.status !== "added" || originalSrc !== undefined;
  const showModifiedPanel = file.status !== "removed" || modifiedSrc !== undefined;

  return (
    <div
      className={cn(
        "h-full w-full overflow-auto p-6",
        isSplit ? "grid grid-cols-1 gap-6 md:grid-cols-2" : "flex flex-col gap-6",
      )}
    >
      {showOriginalPanel && (
        <Panel
          title="Original"
          src={originalSrc}
          emptyMessage={
            file.status === "added"
              ? "No original image — this file was added."
              : "Original image unavailable."
          }
          theme={theme}
        />
      )}
      {showModifiedPanel && (
        <Panel
          title="Updated"
          src={modifiedSrc}
          emptyMessage={
            file.status === "removed"
              ? "No updated image — this file was removed."
              : "Updated image unavailable."
          }
          theme={theme}
        />
      )}
    </div>
  );
};
