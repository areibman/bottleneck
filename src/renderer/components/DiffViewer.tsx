import React, { useRef, useEffect, useState } from 'react';
import MonacoEditor, { DiffEditor } from '@monaco-editor/react';
import { MessageSquare, Plus } from 'lucide-react';

interface DiffViewerProps {
  file: any;
  isReviewing: boolean;
  onAddComment: (comment: any) => void;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ file, isReviewing, onAddComment }) => {
  const [showCommentForm, setShowCommentForm] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const editorRef = useRef<any>(null);

  useEffect(() => {
    // Reset comment form when file changes
    setShowCommentForm(null);
    setCommentText('');
  }, [file]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    // Add custom decorations for comments
    if (file?.comments) {
      // Add comment decorations
    }
  };

  const handleAddComment = (lineNumber: number) => {
    if (!commentText.trim()) return;
    
    onAddComment({
      path: file.filename,
      line: lineNumber,
      body: commentText,
    });
    
    setCommentText('');
    setShowCommentForm(null);
  };

  const parseGitDiff = (patch: string) => {
    if (!patch) return { original: '', modified: '' };
    
    const lines = patch.split('\n');
    let original = '';
    let modified = '';
    
    for (const line of lines) {
      if (line.startsWith('@@')) continue;
      if (line.startsWith('---') || line.startsWith('+++')) continue;
      
      if (line.startsWith('-')) {
        original += line.substring(1) + '\n';
      } else if (line.startsWith('+')) {
        modified += line.substring(1) + '\n';
      } else {
        // Context line
        original += line.substring(1) + '\n';
        modified += line.substring(1) + '\n';
      }
    }
    
    return { original, modified };
  };

  if (!file) return null;

  const { original, modified } = parseGitDiff(file.patch);
  const language = getLanguageFromFilename(file.filename);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
        <div className="flex items-center gap-3">
          <span className="font-medium text-[var(--text-primary)]">{file.filename}</span>
          <span className="text-sm text-[var(--text-secondary)]">
            {file.additions} additions, {file.deletions} deletions
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'split'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'unified'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
            }`}
          >
            Unified
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 relative">
        {viewMode === 'split' ? (
          <DiffEditor
            original={original}
            modified={modified}
            language={language}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            options={{
              readOnly: true,
              renderSideBySide: true,
              renderWhitespace: 'selection',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              fontFamily: "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace",
            }}
          />
        ) : (
          <MonacoEditor
            value={generateUnifiedDiff(original, modified)}
            language={language}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            options={{
              readOnly: true,
              renderWhitespace: 'selection',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              fontFamily: "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace",
              glyphMargin: true,
            }}
          />
        )}

        {/* Comment Form Overlay */}
        {isReviewing && showCommentForm !== null && (
          <div
            className="absolute bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-lg p-3 z-10"
            style={{ top: `${showCommentForm * 20}px`, right: '20px', width: '300px' }}
          >
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Leave a comment..."
              className="w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowCommentForm(null)}
                className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddComment(showCommentForm)}
                className="px-3 py-1 text-sm bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-secondary)]"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getLanguageFromFilename(filename: string): string {
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
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'sh': 'shell',
    'bash': 'shell',
    'yml': 'yaml',
    'yaml': 'yaml',
    'json': 'json',
    'xml': 'xml',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'less': 'less',
    'sql': 'sql',
    'md': 'markdown',
    'markdown': 'markdown',
  };
  
  return languageMap[ext || ''] || 'plaintext';
}

function generateUnifiedDiff(original: string, modified: string): string {
  // Simple unified diff representation
  // In a real implementation, this would use a proper diff algorithm
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  let result = '';
  
  for (let i = 0; i < Math.max(originalLines.length, modifiedLines.length); i++) {
    if (originalLines[i] !== modifiedLines[i]) {
      if (originalLines[i]) {
        result += `- ${originalLines[i]}\n`;
      }
      if (modifiedLines[i]) {
        result += `+ ${modifiedLines[i]}\n`;
      }
    } else if (originalLines[i]) {
      result += `  ${originalLines[i]}\n`;
    }
  }
  
  return result;
}

export default DiffViewer;