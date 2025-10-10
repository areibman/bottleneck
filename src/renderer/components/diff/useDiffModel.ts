import { useMemo, useCallback } from "react";

import type { File } from "../../services/github";
import {
  parsePatch,
  type CommentSide,
} from "./commentUtils";

interface PatchData {
  original: string;
  modified: string;
  mappings: ReturnType<typeof parsePatch>["mappings"] | null;
}

export interface DiffModel {
  patchData: PatchData;
  mapLineForSide: (line: number | null | undefined, side: CommentSide) => number | null;
  mapPositionForSide: (position: number | null | undefined, side: CommentSide) => number | null;
  mapEditorLineToFileLine: (
    editorLine: number | null | undefined,
    side: CommentSide,
  ) => number | null;
  getDiffPositionForEditorLine: (editorLine: number, side: CommentSide) => number | undefined;
  getDiffHunkForLine: (targetLine: number, side: CommentSide) => string | undefined;
}

export function useDiffModel(file: File, showFullFile: boolean): DiffModel {
  const patchData = useMemo<PatchData>(() => {
    if (!file.patch) {
      return { original: "", modified: "", mappings: null };
    }

    const parsed = parsePatch(file.patch);
    return {
      original: parsed.original,
      modified: parsed.modified,
      mappings: parsed.mappings,
    };
  }, [file.patch]);

  const mapLineForSide = useCallback(
    (line: number | null | undefined, side: CommentSide): number | null => {
      if (!line || line <= 0) {
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
      if (!position || position <= 0 || showFullFile || !patchData.mappings) {
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

  const getDiffPositionForEditorLine = useCallback(
    (editorLine: number, side: CommentSide): number | undefined => {
      if (!file.patch || !patchData.mappings) {
        return undefined;
      }

      if (showFullFile) {
        const targetLine = editorLine;
        const row = patchData.mappings.rows.find((r) =>
          side === "LEFT"
            ? r.originalLineNumber === targetLine
            : r.modifiedLineNumber === targetLine,
        );

        if (!row) {
          return undefined;
        }

        return side === "LEFT" ? row.originalDiffPosition : row.modifiedDiffPosition;
      }

      if (editorLine <= 0 || editorLine > patchData.mappings.rows.length) {
        return undefined;
      }

      const row = patchData.mappings.rows[editorLine - 1];
      return side === "LEFT" ? row.originalDiffPosition : row.modifiedDiffPosition;
    },
    [file.patch, patchData.mappings, showFullFile],
  );

  const getDiffHunkForLine = useCallback(
    (targetLine: number, side: CommentSide): string | undefined => {
      if (!file.patch) {
        return undefined;
      }

      const lines = file.patch.split("\n");
      let currentHunkHeader = "";
      let currentHunkLines: string[] = [];
      let leftLine = 0;
      let rightLine = 0;
      let foundHunk = false;

      for (const line of lines) {
        if (line.startsWith("@@")) {
          if (foundHunk && currentHunkHeader) {
            return [currentHunkHeader, ...currentHunkLines].join("\n");
          }

          currentHunkHeader = line;
          currentHunkLines = [];

          const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
          if (match) {
            leftLine = parseInt(match[1], 10);
            rightLine = parseInt(match[3], 10);
          }
          continue;
        }

        if (!currentHunkHeader) {
          continue;
        }

        if (
          line.startsWith("diff --git")
          || line.startsWith("index ")
          || line.startsWith("---")
          || line.startsWith("+++")
        ) {
          continue;
        }

        currentHunkLines.push(line);

        const updateMatch = () => {
          if (side === "LEFT" && leftLine === targetLine) {
            foundHunk = true;
          }
          if (side === "RIGHT" && rightLine === targetLine) {
            foundHunk = true;
          }
        };

        if (line.startsWith("-")) {
          updateMatch();
          leftLine++;
        } else if (line.startsWith("+")) {
          updateMatch();
          rightLine++;
        } else if (line.startsWith(" ")) {
          updateMatch();
          leftLine++;
          rightLine++;
        } else if (!line.startsWith("\\")) {
          updateMatch();
          leftLine++;
          rightLine++;
        }
      }

      if (foundHunk && currentHunkHeader) {
        return [currentHunkHeader, ...currentHunkLines].join("\n");
      }

      return undefined;
    },
    [file.patch],
  );

  return {
    patchData,
    mapLineForSide,
    mapPositionForSide,
    mapEditorLineToFileLine,
    getDiffPositionForEditorLine,
    getDiffHunkForLine,
  };
}
