import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

type ResizeMode = "none" | "width" | "height" | "both";

interface OverlayResizeOptions {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  initialWidth?: number;
  initialHeight?: number;
}

const DEFAULTS = {
  minWidth: 320,
  maxWidth: 800,
  minHeight: 200,
  maxHeight: 600,
  initialWidth: 384,
  initialHeight: 300,
} as const;

export const useOverlayResize = (
  options: OverlayResizeOptions = {},
) => {
  const {
    minWidth = DEFAULTS.minWidth,
    maxWidth = DEFAULTS.maxWidth,
    minHeight = DEFAULTS.minHeight,
    maxHeight = DEFAULTS.maxHeight,
    initialWidth = DEFAULTS.initialWidth,
    initialHeight = DEFAULTS.initialHeight,
  } = options;

  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [mode, setMode] = useState<ResizeMode>("none");

  const startX = useRef(0);
  const startY = useRef(0);
  const startWidth = useRef(initialWidth);
  const startHeight = useRef(initialHeight);

  const handleResizeStart = useCallback(
    (resizeMode: Exclude<ResizeMode, "none">) =>
      (event: ReactMouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setMode(resizeMode);
        startX.current = event.clientX;
        startY.current = event.clientY;
        startWidth.current = width;
        startHeight.current = height;
      },
    [height, width],
  );

  const handleResizeMove = useCallback(
    (event: MouseEvent) => {
      if (mode === "none") return;

      if (mode === "width" || mode === "both") {
        const deltaX = event.clientX - startX.current;
        const nextWidth = Math.max(
          minWidth,
          Math.min(maxWidth, startWidth.current + deltaX),
        );
        setWidth(nextWidth);
      }

      if (mode === "height" || mode === "both") {
        const deltaY = event.clientY - startY.current;
        const nextHeight = Math.max(
          minHeight,
          Math.min(maxHeight, startHeight.current + deltaY),
        );
        setHeight(nextHeight);
      }
    },
    [maxHeight, maxWidth, minHeight, minWidth, mode],
  );

  const handleResizeEnd = useCallback(() => {
    setMode("none");
  }, []);

  useEffect(() => {
    if (mode === "none") return;

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);

    if (mode === "width") {
      document.body.style.cursor = "ew-resize";
    } else if (mode === "height") {
      document.body.style.cursor = "ns-resize";
    } else if (mode === "both") {
      document.body.style.cursor = "nwse-resize";
    }
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [handleResizeEnd, handleResizeMove, mode]);

  const resetSize = useCallback(() => {
    setWidth(initialWidth);
    setHeight(initialHeight);
    setMode("none");
  }, [initialHeight, initialWidth]);

  return {
    width,
    height,
    resizeMode: mode,
    handleResizeStart,
    resetSize,
  } as const;
};
