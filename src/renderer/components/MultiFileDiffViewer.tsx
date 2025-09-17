import { useState, useEffect, useRef } from 'react';
import { DiffEditor as MonacoDiffEditor, Editor as MonacoEditor } from '@monaco-editor/react';
import {
  Eye,
  MessageSquare,
  Check,
  WholeWord,
  FilePlus,
  FileMinus,
  FileEdit,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { File, Comment } from '../services/github';
import { useUIStore } from '../stores/uiStore';
import { cn } from '../utils/cn';
import '../utils/monaco-loader';

interface FileWithContent {
  file: File;
  originalContent?: string;
  modifiedContent?: string;
  patchOriginalContent: string;
  patchModifiedContent: string;
}

interface MultiFileDiffViewerProps {
  files: File[];
  comments: Comment[];
  viewedFiles: Set<string>;
  onToggleViewed: (filename: string) => void;
  owner?: string;
  repo?: string;
  prBaseSha?: string;
  prHeadSha?: string;
  token?: string;
}

export function MultiFileDiffViewer({
  files,
  comments,
  viewedFiles,
  onToggleViewed,
  owner,
  repo,
  prBaseSha,
  prHeadSha,
  token
}: MultiFileDiffViewerProps) {
  const {
    diffView,
    showWhitespace,
    wordWrap,
    theme
  } = useUIStore();

  const [filesWithContent, setFilesWithContent] = useState<FileWithContent[]>([]);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [showFullFile, setShowFullFile] = useState<Record<string, boolean>>({});
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRefs = useRef<Record<string, HTMLDivElement>>({});

  // Parse patch content for a file
  const parsePatch = (patch: string) => {
    if (!patch) {
      return { original: '', modified: '' };
    }

    const lines = patch.split('\n');
    const hunks: Array<{
      oldStart: number;
      oldLines: number;
      newStart: number;
      newLines: number;
      lines: Array<{ type: '-' | '+' | ' ', content: string }>
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (match) {
          const hunk = {
            oldStart: parseInt(match[1], 10),
            oldLines: parseInt(match[2] || '1', 10),
            newStart: parseInt(match[3], 10),
            newLines: parseInt(match[4] || '1', 10),
            lines: [] as Array<{ type: '-' | '+' | ' ', content: string }>
          };

          i++;
          while (i < lines.length && !lines[i].startsWith('@@') && !lines[i].startsWith('diff --git')) {
            const hunkLine = lines[i];
            if (hunkLine.startsWith('-')) {
              hunk.lines.push({ type: '-', content: hunkLine.substring(1) });
            } else if (hunkLine.startsWith('+')) {
              hunk.lines.push({ type: '+', content: hunkLine.substring(1) });
            } else if (hunkLine.startsWith(' ')) {
              hunk.lines.push({ type: ' ', content: hunkLine.substring(1) });
            } else if (hunkLine === '\\No newline at end of file' || hunkLine === '\\ No newline at end of file') {
              // Skip this marker
            } else if (hunkLine.startsWith('---') || hunkLine.startsWith('+++') || hunkLine.startsWith('index ')) {
              // Skip file headers
            } else if (hunkLine.startsWith('\\')) {
              // Skip any other backslash-prefixed Git markers
            } else {
              // Might be part of the content, treat as context
              if (hunkLine.length > 0) {
                hunk.lines.push({ type: ' ', content: hunkLine });
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
      return { original: '', modified: '' };
    }

    const originalLines: string[] = [];
    const modifiedLines: string[] = [];

    for (const hunk of hunks) {
      let i = 0;
      while (i < hunk.lines.length) {
        const line = hunk.lines[i];

        if (line.type === ' ') {
          originalLines.push(line.content);
          modifiedLines.push(line.content);
          i++;
        } else if (line.type === '-') {
          const deletions: string[] = [];
          while (i < hunk.lines.length && hunk.lines[i].type === '-') {
            deletions.push(hunk.lines[i].content);
            i++;
          }

          const additions: string[] = [];
          while (i < hunk.lines.length && hunk.lines[i].type === '+') {
            additions.push(hunk.lines[i].content);
            i++;
          }

          const maxLines = Math.max(deletions.length, additions.length);
          for (let j = 0; j < maxLines; j++) {
            originalLines.push(deletions[j] || '');
            modifiedLines.push(additions[j] || '');
          }
        } else if (line.type === '+') {
          originalLines.push('');
          modifiedLines.push(line.content);
          i++;
        }
      }
    }

    return {
      original: originalLines.join('\n'),
      modified: modifiedLines.join('\n')
    };
  };

  // Initialize files with patch content
  useEffect(() => {
    const initialFiles = files.map(file => {
      const { original, modified } = parsePatch(file.patch || '');
      return {
        file,
        patchOriginalContent: original,
        patchModifiedContent: modified
      };
    });
    setFilesWithContent(initialFiles);
  }, [files]);

  // Load full file content when needed
  const loadFileContent = async (fileWithContent: FileWithContent) => {
    if (!token || !owner || !repo || !prBaseSha || !prHeadSha) {
      return;
    }

    const filename = fileWithContent.file.filename;
    if (loadingFiles.has(filename)) {
      return;
    }

    setLoadingFiles(prev => new Set(prev).add(filename));

    try {
      const { GitHubAPI } = await import('../services/github');
      const api = new GitHubAPI(token);

      const [original, modified] = await Promise.all([
        fileWithContent.file.status === 'added'
          ? Promise.resolve('')
          : api.getFileContent(owner, repo, fileWithContent.file.filename, prBaseSha),
        fileWithContent.file.status === 'removed'
          ? Promise.resolve('')
          : api.getFileContent(owner, repo, fileWithContent.file.filename, prHeadSha),
      ]);

      setFilesWithContent(prev => prev.map(f =>
        f.file.filename === filename
          ? { ...f, originalContent: original, modifiedContent: modified }
          : f
      ));
    } catch (error) {
      console.error('Failed to fetch file content:', error);
    } finally {
      setLoadingFiles(prev => {
        const next = new Set(prev);
        next.delete(filename);
        return next;
      });
    }
  };

  const toggleFileCollapse = (filename: string) => {
    setCollapsedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  const toggleFullFile = async (fileWithContent: FileWithContent) => {
    const filename = fileWithContent.file.filename;
    const newShowFull = !showFullFile[filename];

    setShowFullFile(prev => ({ ...prev, [filename]: newShowFull }));

    // Load full content if switching to full view and not already loaded
    if (newShowFull && !fileWithContent.originalContent && !fileWithContent.modifiedContent) {
      await loadFileContent(fileWithContent);
    }
  };

  const getLanguageFromFilename = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'r': 'r',
      'lua': 'lua',
      'dart': 'dart',
      'vue': 'vue',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'html': 'html',
      'xml': 'xml',
      'json': 'json',
      'yml': 'yaml',
      'yaml': 'yaml',
      'toml': 'toml',
      'md': 'markdown',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'fish': 'shell',
      'ps1': 'powershell',
      'sql': 'sql',
      'graphql': 'graphql',
      'dockerfile': 'dockerfile',
    };

    return languageMap[ext || ''] || 'plaintext';
  };

  // Calculate editor height based on content - show full content
  const calculateEditorHeight = (content: string) => {
    const lines = content.split('\n').length;
    const lineHeight = 19; // Slightly more for Monaco's line height
    const padding = 20; // Minimal padding since we're showing full content
    const calculatedHeight = lines * lineHeight + padding;
    return Math.max(calculatedHeight, 100); // Lower minimum since we show full content
  };

  return (
    <div ref={containerRef} className="h-full overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
      <div className="space-y-4 p-4">
        {filesWithContent.map((fileWithContent) => {
          const { file } = fileWithContent;
          const isCollapsed = collapsedFiles.has(file.filename);
          const isShowingFull = showFullFile[file.filename] || false;
          const fileComments = comments.filter(c => c.path === file.filename);
          const isViewed = viewedFiles.has(file.filename);
          const language = getLanguageFromFilename(file.filename);

          // Determine which content to show
          const originalToShow = isShowingFull && fileWithContent.originalContent !== undefined
            ? fileWithContent.originalContent
            : fileWithContent.patchOriginalContent;
          const modifiedToShow = isShowingFull && fileWithContent.modifiedContent !== undefined
            ? fileWithContent.modifiedContent
            : fileWithContent.patchModifiedContent;

          // Calculate height based on the content that will be shown
          let contentForHeight: string;
          if (file.status === 'added') {
            contentForHeight = modifiedToShow || '';
          } else {
            // For diff view, use the longer of the two sides
            const originalLines = (originalToShow || '').split('\n').length;
            const modifiedLines = (modifiedToShow || '').split('\n').length;
            const maxLines = Math.max(originalLines, modifiedLines);
            contentForHeight = Array(maxLines).fill('line').join('\n');
          }
          const editorHeight = calculateEditorHeight(contentForHeight);

          return (
            <div
              key={file.filename}
              ref={el => {
                if (el) fileRefs.current[file.filename] = el;
              }}
              className={cn(
                "rounded-lg border overflow-hidden",
                theme === 'dark'
                  ? "bg-gray-900 border-gray-700"
                  : "bg-white border-gray-200"
              )}
            >
              {/* File Header */}
              <div
                className={cn(
                  "px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-opacity-50 transition-colors",
                  theme === 'dark'
                    ? "bg-gray-800 hover:bg-gray-750"
                    : "bg-gray-50 hover:bg-gray-100"
                )}
                onClick={() => toggleFileCollapse(file.filename)}
              >
                <div className="flex items-center space-x-3">
                  <button className="p-0.5">
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-2">
                    {file.status === 'added' && <FilePlus className="w-4 h-4 text-green-500" />}
                    {file.status === 'removed' && <FileMinus className="w-4 h-4 text-red-500" />}
                    {file.status === 'modified' && <FileEdit className="w-4 h-4 text-yellow-500" />}
                    <span className="font-mono text-sm">{file.filename}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    {file.status === 'added' ? (
                      <span className="text-green-500 font-medium">+{file.additions} lines</span>
                    ) : file.status === 'removed' ? (
                      <span className="text-red-500 font-medium">-{file.deletions} lines</span>
                    ) : (
                      <>
                        <span className="text-green-400">+{file.additions}</span>
                        <span className="text-red-400">-{file.deletions}</span>
                      </>
                    )}
                  </div>
                  {fileComments.length > 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <MessageSquare className="w-3 h-3" />
                      <span>{fileComments.length}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {file.status === 'modified' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFullFile(fileWithContent);
                      }}
                      className={cn(
                        'btn btn-ghost px-2 py-1 text-xs flex items-center gap-1',
                        isShowingFull && (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200')
                      )}
                      title={isShowingFull ? 'Show diff only' : 'Show full file'}
                    >
                      <WholeWord className="w-3 h-3" />
                      <span>{isShowingFull ? 'Diff' : 'Full'}</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleViewed(file.filename);
                    }}
                    className="btn btn-ghost p-1 text-sm"
                    title={isViewed ? "Mark as not viewed" : "Mark as viewed"}
                  >
                    {isViewed ? <Check className="w-4 h-4 text-green-500" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* File Content */}
              {!isCollapsed && (
                <div style={{ height: `${editorHeight}px`, overflow: 'visible', position: 'relative' }}>
                  {file.status === 'added' ? (
                    <MonacoEditor
                      height={editorHeight}
                      value={modifiedToShow || '// No content'}
                      language={language}
                      theme={theme === 'dark' ? "vs-dark" : "vs"}
                      options={{
                        readOnly: true,
                        renderWhitespace: showWhitespace ? 'all' : 'none',
                        wordWrap: wordWrap ? 'on' : 'off',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 12,
                        lineHeight: 19,
                        renderLineHighlight: 'none',
                        glyphMargin: true,
                        folding: false,
                        lineNumbers: 'on',
                        lineDecorationsWidth: 0,
                        lineNumbersMinChars: 3,
                        renderValidationDecorations: 'off',
                        scrollbar: {
                          vertical: 'hidden',
                          horizontal: 'auto',
                          alwaysConsumeMouseWheel: false,
                        },
                        automaticLayout: true,
                      }}
                    />
                  ) : (
                    <MonacoDiffEditor
                      height={editorHeight}
                      original={originalToShow || ''}
                      modified={modifiedToShow || ''}
                      language={language}
                      theme={theme === 'dark' ? "vs-dark" : "vs"}
                      options={{
                        readOnly: true,
                        renderSideBySide: diffView === 'split',
                        renderWhitespace: showWhitespace ? 'all' : 'none',
                        wordWrap: wordWrap ? 'on' : 'off',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 12,
                        lineHeight: 19,
                        renderLineHighlight: 'none',
                        glyphMargin: true,
                        folding: false,
                        lineNumbers: 'on',
                        lineDecorationsWidth: 0,
                        lineNumbersMinChars: 3,
                        renderValidationDecorations: 'off',
                        scrollbar: {
                          vertical: 'hidden',
                          horizontal: 'auto',
                          alwaysConsumeMouseWheel: false,
                        },
                        automaticLayout: true,
                        hideUnchangedRegions: {
                          enabled: isShowingFull,
                          revealLineCount: 3,
                          minimumLineCount: 3,
                          contextLineCount: 3,
                        },
                        diffAlgorithm: 'advanced',
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
