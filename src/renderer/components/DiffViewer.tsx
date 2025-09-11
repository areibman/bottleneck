import React, { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { 
  GitBranch, 
  MessageSquare, 
  CheckCircle, 
  XCircle,
  Plus,
  Minus,
  Eye,
  EyeOff
} from 'lucide-react';

interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  blob_url?: string;
  contents_url?: string;
}

interface DiffViewerProps {
  file: FileChange;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ file }) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('split');
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [selectedText, setSelectedText] = useState<string>('');

  useEffect(() => {
    // Load comments for this file
    loadComments();
  }, [file]);

  const loadComments = async () => {
    // This would load comments specific to this file
    // For now, we'll use mock data
    setComments([]);
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Configure Monaco editor for diff viewing
    editor.updateOptions({
      readOnly: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3,
    });

    // Add click handler for text selection
    editor.onDidChangeCursorSelection((e: any) => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const selectedText = editor.getModel()?.getValueInRange(selection);
        setSelectedText(selectedText || '');
      } else {
        setSelectedText('');
      }
    });
  };

  const getLanguageFromFilename = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'dockerfile': 'dockerfile',
    };
    return languageMap[extension || ''] || 'plaintext';
  };

  const generateDiffContent = () => {
    if (file.patch) {
      return file.patch;
    }

    // Generate a mock diff for demonstration
    const lines = [
      `diff --git a/${file.filename} b/${file.filename}`,
      `index 1234567..abcdefg 100644`,
      `--- a/${file.filename}`,
      `+++ b/${file.filename}`,
      `@@ -1,3 +1,4 @@`,
      ` line 1`,
      `-line 2 (removed)`,
      `+line 2 (modified)`,
      `+line 3 (added)`,
      ` line 4`,
    ];
    return lines.join('\n');
  };

  const handleAddComment = () => {
    if (selectedText) {
      // This would open a comment dialog
      console.log('Adding comment for selected text:', selectedText);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#30363d] bg-[#161b22]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium truncate">{file.filename}</h3>
            <span className={`px-2 py-1 text-xs rounded ${
              file.status === 'added' ? 'bg-green-900 text-green-200' :
              file.status === 'modified' ? 'bg-blue-900 text-blue-200' :
              file.status === 'removed' ? 'bg-red-900 text-red-200' :
              'bg-yellow-900 text-yellow-200'
            }`}>
              {file.status}
            </span>
            <div className="flex items-center gap-2 text-sm text-gray">
              {file.additions > 0 && (
                <span className="text-green-500">+{file.additions}</span>
              )}
              {file.deletions > 0 && (
                <span className="text-red-500">-{file.deletions}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={`p-2 rounded ${showUnchanged ? 'bg-[#1f6feb] text-white' : 'hover:bg-[#21262d]'}`}
              onClick={() => setShowUnchanged(!showUnchanged)}
              title="Show unchanged lines"
            >
              {showUnchanged ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            
            <div className="flex border border-[#30363d] rounded">
              <button
                className={`px-3 py-1 text-sm ${
                  viewMode === 'unified' 
                    ? 'bg-[#1f6feb] text-white' 
                    : 'hover:bg-[#21262d]'
                }`}
                onClick={() => setViewMode('unified')}
              >
                Unified
              </button>
              <button
                className={`px-3 py-1 text-sm ${
                  viewMode === 'split' 
                    ? 'bg-[#1f6feb] text-white' 
                    : 'hover:bg-[#21262d]'
                }`}
                onClick={() => setViewMode('split')}
              >
                Split
              </button>
            </div>
          </div>
        </div>

        {/* Comment Actions */}
        {selectedText && (
          <div className="flex items-center gap-2 p-2 bg-[#0d1117] rounded border border-[#30363d]">
            <span className="text-sm text-gray">Selected: "{selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}"</span>
            <button
              className="btn btn-primary text-sm"
              onClick={handleAddComment}
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Add Comment
            </button>
          </div>
        )}
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={getLanguageFromFilename(file.filename)}
          value={generateDiffContent()}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'line',
            renderWhitespace: 'selection',
            selectOnLineNumbers: true,
            cursorStyle: 'line',
            cursorWidth: 2,
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            fontSize: 14,
            lineHeight: 20,
          }}
        />
      </div>

      {/* Comments Sidebar */}
      {comments.length > 0 && (
        <div className="w-80 border-l border-[#30363d] bg-[#161b22] p-4">
          <h4 className="text-sm font-medium mb-3">Comments</h4>
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="p-3 bg-[#0d1117] rounded border border-[#30363d]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">{comment.author}</span>
                  <span className="text-xs text-gray">{comment.createdAt}</span>
                </div>
                <p className="text-sm text-gray">{comment.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};