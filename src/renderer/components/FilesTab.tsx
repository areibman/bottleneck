import React, { useState } from 'react';
import {
  FileText,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  MessageSquare,
  Plus,
  Minus,
} from 'lucide-react';
import DiffViewer from './DiffViewer';

interface FilesTabProps {
  pr: any;
  files: any[];
  isLoading: boolean;
  isReviewing: boolean;
  onAddComment: (comment: any) => void;
}

const FilesTab: React.FC<FilesTabProps> = ({ pr, files, isLoading, isReviewing, onAddComment }) => {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [viewedFiles, setViewedFiles] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const toggleFileExpansion = (filename: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
      setSelectedFile(filename);
      markFileAsViewed(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const markFileAsViewed = (filename: string) => {
    setViewedFiles(new Set([...viewedFiles, filename]));
  };

  const getFileStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return 'text-green-500';
      case 'removed':
        return 'text-red-500';
      case 'modified':
        return 'text-yellow-500';
      case 'renamed':
        return 'text-blue-500';
      default:
        return 'text-[var(--text-secondary)]';
    }
  };

  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'added':
        return <Plus size={14} className="text-green-500" />;
      case 'removed':
        return <Minus size={14} className="text-red-500" />;
      default:
        return <FileText size={14} className="text-[var(--text-secondary)]" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* File Tree Sidebar */}
      <div className="w-80 border-r border-[var(--border-color)] bg-[var(--bg-tertiary)] overflow-auto">
        <div className="p-3 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-primary)]">
              {files.length} file{files.length !== 1 ? 's' : ''} changed
            </span>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <span className="text-green-500">+{pr.additions}</span>
              <span className="text-red-500">-{pr.deletions}</span>
            </div>
          </div>
        </div>

        <div className="p-2">
          {files.map((file) => (
            <button
              key={file.filename}
              onClick={() => toggleFileExpansion(file.filename)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-[var(--bg-hover)] ${
                selectedFile === file.filename ? 'bg-[var(--bg-hover)]' : ''
              }`}
            >
              <div className="flex items-center gap-1">
                {expandedFiles.has(file.filename) ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                {getFileStatusIcon(file.status)}
              </div>
              
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className={`truncate ${getFileStatusColor(file.status)}`}>
                    {file.filename.split('/').pop()}
                  </span>
                  {viewedFiles.has(file.filename) ? (
                    <Eye size={12} className="text-[var(--text-tertiary)]" />
                  ) : (
                    <EyeOff size={12} className="text-[var(--text-tertiary)]" />
                  )}
                </div>
                <div className="text-xs text-[var(--text-tertiary)] truncate">
                  {file.filename}
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-xs">
                <span className="text-green-500">+{file.additions}</span>
                <span className="text-red-500">-{file.deletions}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Diff Viewer */}
      <div className="flex-1 overflow-hidden">
        {selectedFile ? (
          <DiffViewer
            file={files.find(f => f.filename === selectedFile)}
            isReviewing={isReviewing}
            onAddComment={onAddComment}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a file to view changes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilesTab;