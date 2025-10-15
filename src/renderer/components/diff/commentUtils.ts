import { Comment } from "../../services/github";

export type CommentSide = "LEFT" | "RIGHT";

export interface CommentTarget {
  lineNumber: number;
  side: CommentSide;
  startLineNumber?: number | null;
  endLineNumber?: number | null;
}

export interface InlineCommentThread {
  id: number;
  side: CommentSide;
  lineNumber: number;
  startLineNumber?: number | null;
  endLineNumber?: number | null;
  comments: Comment[];
}

export type ActiveOverlay =
  | { type: "new"; target: CommentTarget }
  | { type: "thread"; target: CommentTarget; threadId: number };

interface PatchLineMapping {
  originalLineNumber: number | null;
  modifiedLineNumber: number | null;
  originalDiffPosition: number | null;
  modifiedDiffPosition: number | null;
}

interface PatchMappings {
  rows: PatchLineMapping[];
  originalLineToEditorLine: Map<number, number>;
  modifiedLineToEditorLine: Map<number, number>;
  diffPositionToEditorLine: {
    LEFT: Map<number, number>;
    RIGHT: Map<number, number>;
  };
}

interface ParsedPatch {
  original: string;
  modified: string;
  mappings: PatchMappings | null;
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

export const buildThreads = (comments: Comment[]): InlineCommentThread[] => {
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

const LANGUAGE_MAP: Record<string, string> = {
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

export const getLanguageFromFilename = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  return LANGUAGE_MAP[ext || ""] || "plaintext";
};

function parsePatch(patch: string): ParsedPatch {
  if (!patch || patch.trim() === "") {
    return { original: "", modified: "", mappings: null };
  }

  const lines = patch.split("\n");
  const rows: PatchLineMapping[] = [];
  const originalLines: string[] = [];
  const modifiedLines: string[] = [];

  let currentOriginalLine = 0;
  let currentModifiedLine = 0;
  let diffPosition = 0;

  for (let i = 0; i < lines.length; ) {
    const line = lines[i];

    if (
      line.startsWith("diff --git") ||
      line.startsWith("index ") ||
      line.startsWith("---") ||
      line.startsWith("+++")
    ) {
      i++;
      continue;
    }

    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        currentOriginalLine = parseInt(match[1], 10);
        currentModifiedLine = parseInt(match[3], 10);
      }
      i++;
      continue;
    }

    if (
      line === "\\No newline at end of file" ||
      line === "\\ No newline at end of file"
    ) {
      i++;
      continue;
    }

    if (line.startsWith(" ")) {
      diffPosition++;
      const content = line.substring(1);
      originalLines.push(content);
      modifiedLines.push(content);
      rows.push({
        originalLineNumber: currentOriginalLine,
        modifiedLineNumber: currentModifiedLine,
        originalDiffPosition: diffPosition,
        modifiedDiffPosition: diffPosition,
      });
      currentOriginalLine++;
      currentModifiedLine++;
      i++;
      continue;
    }

    if (line.startsWith("-")) {
      const deletions: Array<{ content: string; lineNumber: number; diffPos: number }> = [];
      while (i < lines.length && lines[i].startsWith("-")) {
        diffPosition++;
        deletions.push({
          content: lines[i].substring(1),
          lineNumber: currentOriginalLine,
          diffPos: diffPosition,
        });
        currentOriginalLine++;
        i++;
      }

      const additions: Array<{ content: string; lineNumber: number; diffPos: number }> = [];
      while (i < lines.length && lines[i].startsWith("+")) {
        diffPosition++;
        additions.push({
          content: lines[i].substring(1),
          lineNumber: currentModifiedLine,
          diffPos: diffPosition,
        });
        currentModifiedLine++;
        i++;
      }

      const maxLines = Math.max(deletions.length, additions.length);
      for (let j = 0; j < maxLines; j++) {
        const deletion = deletions[j];
        const addition = additions[j];
        originalLines.push(deletion ? deletion.content : "");
        modifiedLines.push(addition ? addition.content : "");
        rows.push({
          originalLineNumber: deletion ? deletion.lineNumber : null,
          modifiedLineNumber: addition ? addition.lineNumber : null,
          originalDiffPosition: deletion ? deletion.diffPos : null,
          modifiedDiffPosition: addition ? addition.diffPos : null,
        });
      }
      continue;
    }

    if (line.startsWith("+")) {
      diffPosition++;
      const content = line.substring(1);
      originalLines.push("");
      modifiedLines.push(content);
      rows.push({
        originalLineNumber: null,
        modifiedLineNumber: currentModifiedLine,
        originalDiffPosition: null,
        modifiedDiffPosition: diffPosition,
      });
      currentModifiedLine++;
      i++;
      continue;
    }

    i++;
  }

  if (rows.length === 0) {
    return {
      original: originalLines.length > 0 ? originalLines.join("\n") : "",
      modified: modifiedLines.length > 0 ? modifiedLines.join("\n") : "",
      mappings: null,
    };
  }

  const originalLineToEditorLine = new Map<number, number>();
  const modifiedLineToEditorLine = new Map<number, number>();
  const leftDiffPositionToEditorLine = new Map<number, number>();
  const rightDiffPositionToEditorLine = new Map<number, number>();

  rows.forEach((row, index) => {
    const editorLine = index + 1;
    if (row.originalLineNumber !== null) {
      originalLineToEditorLine.set(row.originalLineNumber, editorLine);
    }
    if (row.modifiedLineNumber !== null) {
      modifiedLineToEditorLine.set(row.modifiedLineNumber, editorLine);
    }
    if (row.originalDiffPosition !== null) {
      leftDiffPositionToEditorLine.set(row.originalDiffPosition, editorLine);
    }
    if (row.modifiedDiffPosition !== null) {
      rightDiffPositionToEditorLine.set(row.modifiedDiffPosition, editorLine);
    }
  });

  const mappings: PatchMappings = {
    rows,
    originalLineToEditorLine,
    modifiedLineToEditorLine,
    diffPositionToEditorLine: {
      LEFT: leftDiffPositionToEditorLine,
      RIGHT: rightDiffPositionToEditorLine,
    },
  };

  return {
    original: originalLines.length > 0 ? originalLines.join("\n") : "",
    modified: modifiedLines.length > 0 ? modifiedLines.join("\n") : "",
    mappings,
  };
}
