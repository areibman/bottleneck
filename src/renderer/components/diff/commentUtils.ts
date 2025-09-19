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

export const determineCommentSide = (comment: Comment): CommentSide => {
  if (comment.side === "LEFT" || comment.side === "RIGHT") {
    return comment.side;
  }
  if (comment.original_line && !comment.line) {
    return "LEFT";
  }
  return "RIGHT";
};

export const getLineNumberForSide = (
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

export function parsePatch(patch: string) {
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

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
            // Ignore
          } else if (
            hunkLine.startsWith("---") ||
            hunkLine.startsWith("+++") ||
            hunkLine.startsWith("index ")
          ) {
            // Skip headers
          } else if (hunkLine.startsWith("\\")) {
            // Skip Git markers
          } else {
            if (hunkLine.length > 0) {
              hunk.lines.push({ type: " ", content: hunkLine });
            }
          }
          i++;
        }
        i--;

        hunks.push(hunk);
      }
    }
  }

  if (hunks.length === 0) {
    return { original: "", modified: "" };
  }

  const originalLines: string[] = [];
  const modifiedLines: string[] = [];

  for (const hunk of hunks) {
    let i = 0;
    while (i < hunk.lines.length) {
      const line = hunk.lines[i];

      if (line.type === " ") {
        originalLines.push(line.content);
        modifiedLines.push(line.content);
        i++;
      } else if (line.type === "-") {
        const deletions: string[] = [];
        while (i < hunk.lines.length && hunk.lines[i].type === "-") {
          deletions.push(hunk.lines[i].content);
          i++;
        }

        const additions: string[] = [];
        while (i < hunk.lines.length && hunk.lines[i].type === "+") {
          additions.push(hunk.lines[i].content);
          i++;
        }

        const maxLines = Math.max(deletions.length, additions.length);
        for (let j = 0; j < maxLines; j++) {
          originalLines.push(deletions[j] || "");
          modifiedLines.push(additions[j] || "");
        }
      } else if (line.type === "+") {
        originalLines.push("");
        modifiedLines.push(line.content);
        i++;
      }
    }
  }

  return {
    original: originalLines.length > 0 ? originalLines.join("\n") : "",
    modified: modifiedLines.length > 0 ? modifiedLines.join("\n") : "",
  };
}
