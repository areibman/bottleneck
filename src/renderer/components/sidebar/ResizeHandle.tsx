import type { MouseEvent as ReactMouseEvent } from "react";
import { cn } from "../../utils/cn";

interface ResizeHandleProps {
  theme: "light" | "dark";
  isResizing: boolean;
  onResizeStart: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

export function ResizeHandle({ theme, isResizing, onResizeStart }: ResizeHandleProps) {
  return (
    <div
      className={cn(
        "absolute top-0 right-0 w-1 h-full cursor-col-resize",
        isResizing ? "bg-blue-500" : "",
        !isResizing && theme === "dark" ? "hover:bg-blue-400" : "",
        !isResizing && theme === "light" ? "hover:bg-blue-500" : "",
      )}
      onMouseDown={onResizeStart}
      style={{ touchAction: "none" }}
    />
  );
}
