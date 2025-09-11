import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Plus,
  Minus,
  Eye,
  EyeOff,
  MessageSquare,
  GitBranch,
  Search
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { DiffViewer } from './DiffViewer';

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

export const FilesTab: React.FC = () => {
  const { selectedPR } = useAppStore();
  const [files, setFiles] = useState<FileChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileChange | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnchanged, setShowUnchanged] = useState(false);

  useEffect(() => {
    if (selectedPR) {
      loadFiles();
    }
  }, [selectedPR]);

  const loadFiles = async () => {
    if (!selectedPR) return;
    
    setLoading(true);
    try {
      const filesData = await window.electronAPI.github.getPRFiles(
        selectedPR.repo, 
        selectedPR.number
      );
      setFiles(filesData);
      
      // Auto-expand first file
      if (filesData.length > 0) {
        setSelectedFile(filesData[0]);
        setExpandedFiles(new Set([filesData[0].filename]));
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter(file => {
    if (!showUnchanged && file.changes === 0) return false;
    if (searchQuery && !file.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const toggleFileExpansion = (filename: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    // This would be expanded with more file type icons
    return <FileText className="w-4 h-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'modified':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'removed':
        return <Minus className="w-4 h-4 text-red-500" />;
      case 'renamed':
        return <GitBranch className="w-4 h-4 text-yellow-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return 'text-green-500';
      case 'modified':
        return 'text-blue-500';
      case 'removed':
        return 'text-red-500';
      case 'renamed':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  if (!selectedPR) return null;

  return (
    <div className="h-full flex">
      {/* File List Sidebar */}
      <div className="w-80 border-r border-[#30363d] bg-[#161b22] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#30363d]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Files Changed</h3>
            <div className="flex items-center gap-2">
              <button
                className={`p-1 rounded ${showUnchanged ? 'bg-[#1f6feb] text-white' : 'hover:bg-[#21262d]'}`}
                onClick={() => setShowUnchanged(!showUnchanged)}
                title="Show unchanged files"
              >
                {showUnchanged ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray" />
            <input
              type="text"
              placeholder="Search files..."
              className="input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="spinner" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-4 text-center text-gray">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No files found</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredFiles.map((file) => (
                <div
                  key={file.filename}
                  className={`p-2 rounded cursor-pointer hover:bg-[#21262d] ${
                    selectedFile?.filename === file.filename ? 'bg-[#1f6feb] text-white' : ''
                  }`}
                  onClick={() => {
                    setSelectedFile(file);
                    setExpandedFiles(prev => new Set([...prev, file.filename]));
                  }}
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(file.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {file.filename.split('/').pop()}
                        </span>
                        <span className={`text-xs ${getStatusColor(file.status)}`}>
                          {file.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray">
                        {file.additions > 0 && <span className="text-green-500">+{file.additions}</span>}
                        {file.additions > 0 && file.deletions > 0 && <span className="mx-1">•</span>}
                        {file.deletions > 0 && <span className="text-red-500">-{file.deletions}</span>}
                        {file.changes > 0 && (
                          <>
                            <span className="mx-1">•</span>
                            <span>{file.changes} changes</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Diff Viewer */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <DiffViewer file={selectedFile} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a file to view changes</h3>
              <p className="text-gray">Choose a file from the sidebar to see its diff</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};