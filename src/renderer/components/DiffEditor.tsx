import React, { useRef, useEffect, useState } from 'react';
import Editor, { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react';
import { 
  Eye, 
  MessageSquare, 
  Plus,
  ChevronUp,
  ChevronDown,
  Columns,
  FileText
} from 'lucide-react';
import { File, Comment } from '../services/github';
import { useUIStore } from '../stores/uiStore';
import { cn } from '../utils/cn';
import '../utils/monaco-loader'; // Import Monaco loader configuration

interface DiffEditorProps {
  file: File;
  comments: Comment[];
  onMarkViewed: () => void;
}

export function DiffEditor({ file, comments, onMarkViewed }: DiffEditorProps) {
  const { diffView, showWhitespace, toggleDiffView, toggleWhitespace } = useUIStore();
  const [originalContent, setOriginalContent] = useState('');
  const [modifiedContent, setModifiedContent] = useState('');
  const [showCommentForm, setShowCommentForm] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const editorRef = useRef<any>(null);

  useEffect(() => {
    // Parse the patch to get original and modified content
    if (file.patch) {
      const { original, modified } = parsePatch(file.patch);
      setOriginalContent(original);
      setModifiedContent(modified);
    }
  }, [file]);

  const parsePatch = (patch: string) => {
    // Simple patch parser - in production, use a proper diff parser
    const lines = patch.split('\n');
    const original: string[] = [];
    const modified: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
        continue;
      }
      
      if (line.startsWith('-')) {
        original.push(line.substring(1));
      } else if (line.startsWith('+')) {
        modified.push(line.substring(1));
      } else if (line.startsWith(' ')) {
        original.push(line.substring(1));
        modified.push(line.substring(1));
      }
    }
    
    return {
      original: original.join('\n'),
      modified: modified.join('\n')
    };
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

  const handleAddComment = (lineNumber: number) => {
    setShowCommentForm(lineNumber);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    
    // Submit comment via GitHub API
    // This would be implemented with the actual API call
    console.log('Submitting comment:', commentText, 'on line:', showCommentForm);
    
    setCommentText('');
    setShowCommentForm(null);
  };

  const language = getLanguageFromFilename(file.filename);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="font-mono text-sm">{file.filename}</h3>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-green-400">+{file.additions}</span>
            <span className="text-red-400">-{file.deletions}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleDiffView}
            className="btn btn-ghost p-2 text-sm"
            title={diffView === 'unified' ? 'Switch to split view' : 'Switch to unified view'}
          >
            {diffView === 'unified' ? <Columns className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </button>
          
          <button
            onClick={toggleWhitespace}
            className={cn('btn btn-ghost p-2 text-sm', showWhitespace && 'bg-gray-700')}
            title="Toggle whitespace"
          >
            W
          </button>
          
          <button
            onClick={onMarkViewed}
            className="btn btn-ghost p-2 text-sm"
            title="Mark as viewed"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        {diffView === 'split' ? (
          <MonacoDiffEditor
            original={originalContent}
            modified={modifiedContent}
            language={language}
            theme="vs-dark"
            options={{
              readOnly: true,
              renderSideBySide: true,
              renderWhitespace: showWhitespace ? 'all' : 'none',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              lineHeight: 20,
              renderLineHighlight: 'none',
              glyphMargin: true,
              folding: true,
              lineNumbers: 'on',
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
              renderValidationDecorations: 'off',
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
          />
        ) : (
          <Editor
            value={modifiedContent}
            language={language}
            theme="vs-dark"
            options={{
              readOnly: true,
              renderWhitespace: showWhitespace ? 'all' : 'none',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              lineHeight: 20,
              renderLineHighlight: 'none',
              glyphMargin: true,
              folding: true,
              lineNumbers: 'on',
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
              renderValidationDecorations: 'off',
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
            onMount={(editor) => {
              editorRef.current = editor;
              
              // Add decorations for additions/deletions
              const decorations: any[] = [];
              const lines = modifiedContent.split('\n');
              
              lines.forEach((line, index) => {
                if (file.patch) {
                  const patchLines = file.patch.split('\n');
                  const patchLine = patchLines.find(pl => pl.includes(line));
                  
                  if (patchLine?.startsWith('+')) {
                    decorations.push({
                      range: {
                        startLineNumber: index + 1,
                        startColumn: 1,
                        endLineNumber: index + 1,
                        endColumn: line.length + 1,
                      },
                      options: {
                        isWholeLine: true,
                        className: 'diff-addition',
                      },
                    });
                  } else if (patchLine?.startsWith('-')) {
                    decorations.push({
                      range: {
                        startLineNumber: index + 1,
                        startColumn: 1,
                        endLineNumber: index + 1,
                        endColumn: line.length + 1,
                      },
                      options: {
                        isWholeLine: true,
                        className: 'diff-deletion',
                      },
                    });
                  }
                }
              });
              
              editor.deltaDecorations([], decorations);
            }}
          />
        )}

        {/* Comment overlay */}
        {showCommentForm !== null && (
          <div className="absolute top-16 right-4 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 z-10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Add comment</h4>
              <button
                onClick={() => setShowCommentForm(null)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="input w-full h-24 resize-none mb-3"
              placeholder="Leave a comment..."
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCommentForm(null)}
                className="btn btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitComment}
                className="btn btn-primary text-sm"
              >
                Comment
              </button>
            </div>
          </div>
        )}

        {/* Inline comments */}
        {comments.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 max-h-48 overflow-y-auto">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <h4 className="text-sm font-semibold mb-2 flex items-center">
                <MessageSquare className="w-4 h-4 mr-1" />
                Comments ({comments.length})
              </h4>
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <div className="flex items-center space-x-2 mb-1">
                      <img
                        src={comment.user.avatar_url}
                        alt={comment.user.login}
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="font-medium">{comment.user.login}</span>
                      {comment.line && (
                        <span className="text-xs text-gray-500">
                          Line {comment.line}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-300 ml-7">{comment.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
