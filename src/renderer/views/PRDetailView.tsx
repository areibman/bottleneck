import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  GitPullRequest,
  GitMerge,
  X,
  Check,
  MessageSquare,
  Eye,
  FileDiff,
  Terminal,
  Folder,
  FilePlus,
  FileMinus,
  FileEdit,
} from 'lucide-react';
import { DiffEditor } from '../components/DiffEditor';
import { ConversationTab } from '../components/ConversationTab';
import { useAuthStore } from '../stores/authStore';
import { GitHubAPI, PullRequest, File, Comment, Review } from '../services/github';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import { mockPullRequests, mockFiles, mockComments, mockReviews } from '../mockData';
import { useUIStore } from '../stores/uiStore';
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
  TreeItem,
  TreeItemIndex,
} from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';
import { useMemo } from 'react';

type TreeData = {
  isFolder: boolean;
  file?: File;
};

export default function PRDetailView() {
  const { owner, repo, number } = useParams<{ owner: string; repo: string; number: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { theme } = useUIStore();
  
  const [activeTab, setActiveTab] = useState<'conversation' | 'files'>('files');
  const [pr, setPR] = useState<PullRequest | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewedFiles, setViewedFiles] = useState<Set<string>>(new Set());
  const [fileContent, setFileContent] = useState<{ original: string; modified: string } | null>(null);
  const [fileListWidth, setFileListWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const fileListRef = useRef<HTMLDivElement>(null);

  const treeItems = useMemo(() => {
    if (!files || files.length === 0) {
      return {};
    }
  
    const items: Record<TreeItemIndex, TreeItem<TreeData>> = {
      root: {
        index: 'root',
        isFolder: true,
        children: [],
        data: { isFolder: true },
      },
    };
  
    for (const file of files) {
      const pathParts = file.filename.split('/');
      let currentPath = '';
      let parentIndex: TreeItemIndex = 'root';
  
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isFolder = i < pathParts.length - 1;
  
        if (!items[currentPath]) {
          items[currentPath] = {
            index: currentPath,
            isFolder,
            children: [],
            data: { isFolder, file: isFolder ? undefined : file },
          };
  
          const parent: TreeItem<TreeData> = items[parentIndex];
          if (parent && parent.children) {
            // Check if the child is already there before adding
            if (!parent.children.includes(currentPath)) {
              parent.children.push(currentPath);
            }
          }
        }
        parentIndex = currentPath;
      }
    }
  
    // Sort children alphabetically, folders first
    for (const item of Object.values(items)) {
      if (item.children) {
        item.children.sort((a, b) => {
          const itemA = items[a];
          const itemB = items[b];
          if (itemA.isFolder && !itemB.isFolder) return -1;
          if (!itemA.isFolder && itemB.isFolder) return 1;
          return a > b ? 1 : -1;
        });
      }
    }
    return items;
  }, [files]);

  const treeDataProvider: StaticTreeDataProvider<TreeData> = useMemo(() => {
    return new StaticTreeDataProvider<TreeData>(treeItems);
  }, [treeItems]);

  useEffect(() => {
    // Load data even without token if in dev mode
    if (!window.electron || (owner && repo && number)) {
      loadPRData();
    }
  }, [owner, repo, number, token]);

  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      handleFileSelect(files[0]);
    }
  }, [files, selectedFile]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setFileContent(null);

    if (token && owner && repo && pr) {
      try {
        const api = new GitHubAPI(token);
        const [original, modified] = await Promise.all([
          file.status === 'added' 
            ? Promise.resolve('') 
            : api.getFileContent(owner, repo, file.filename, pr.base.sha),
          file.status === 'removed'
            ? Promise.resolve('')
            : api.getFileContent(owner, repo, file.filename, pr.head.sha),
        ]);
        setFileContent({ original, modified });
      } catch (error) {
        console.error('Failed to fetch file content:', error);
        // Fallback to patch if content fetch fails
        setFileContent(null);
      }
    }
  };

  const loadPRData = async () => {
    setLoading(true);
    
    try {
      // Use mock data if Electron API is not available
      if (!window.electron || !token) {
        const prNumber = parseInt(number || '0');
        const mockPR = mockPullRequests.find(pr => pr.number === prNumber) || mockPullRequests[0];
        
        setPR(mockPR as any);
        setFiles(mockFiles as any);
        setComments(mockComments as any);
        setReviews(mockReviews as any);
        
        if (mockFiles.length > 0) {
          setSelectedFile(mockFiles[0] as any);
        }
      } else if (token && owner && repo && number) {
        const api = new GitHubAPI(token);
        const prNumber = parseInt(number);
        
        const [prData, filesData, commentsData, reviewsData] = await Promise.all([
          api.getPullRequest(owner, repo, prNumber),
          api.getPullRequestFiles(owner, repo, prNumber),
          api.getPullRequestComments(owner, repo, prNumber),
          api.getPullRequestReviews(owner, repo, prNumber),
        ]);
        
        setPR(prData);
        setFiles(filesData);
        setComments(commentsData);
        setReviews(reviewsData);
        
        // Auto-select first file is now handled by useEffect
      }
    } catch (error) {
      console.error('Failed to load PR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!pr) return;
    
    if (window.electron) {
      const localPath = await window.electron.app.selectDirectory();
      if (localPath) {
        await window.electron.git.checkout(localPath, pr.head.ref);
      }
    } else {
      console.log('Checkout not available in dev mode');
    }
  };


  const toggleFileViewed = (filename: string) => {
    const newViewed = new Set(viewedFiles);
    if (newViewed.has(filename)) {
      newViewed.delete(filename);
    } else {
      newViewed.add(filename);
    }
    setViewedFiles(newViewed);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX - (fileListRef.current?.getBoundingClientRect().left || 0);
    if (newWidth >= 200 && newWidth <= 600) {
      setFileListWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className={cn(
          theme === 'dark' ? "text-gray-400" : "text-gray-600"
        )}>Loading pull request...</div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className={cn(
          theme === 'dark' ? "text-gray-400" : "text-gray-600"
        )}>Pull request not found</div>
      </div>
    );
  }

  const fileStats = files.reduce(
    (acc, file) => ({
      additions: acc.additions + file.additions,
      deletions: acc.deletions + file.deletions,
      changed: acc.changed + 1,
    }),
    { additions: 0, deletions: 0, changed: 0 }
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        "p-4 border-b",
        theme === 'dark' 
          ? "bg-gray-800 border-gray-700" 
          : "bg-gray-50 border-gray-200"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/pulls')}
              className={cn(
                "p-1 rounded transition-colors",
                theme === 'dark' ? "hover:bg-gray-700" : "hover:bg-gray-100"
              )}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-2">
              {pr.draft ? (
                <div className="w-5 h-5 rounded-full bg-gray-600" title="Draft" />
              ) : pr.merged ? (
                <GitMerge className="w-5 h-5 text-purple-400" />
              ) : pr.state === 'open' ? (
                <GitPullRequest className="w-5 h-5 text-green-400" />
              ) : (
                <X className="w-5 h-5 text-red-400" />
              )}
              
              <h1 className="text-base font-semibold">
                {pr.title}
                <span className={cn(
                  "ml-2 text-xs",
                  theme === 'dark' ? "text-gray-500" : "text-gray-600"
                )}>#{pr.number}</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCheckout}
              className="btn btn-secondary text-xs"
            >
              <Terminal className="w-3 h-3 mr-1" />
              Checkout
            </button>
            
            {pr.state === 'open' && !pr.merged && (
              <>
                <button className="btn btn-success text-xs">
                  <Check className="w-3 h-3 mr-1" />
                  Approve
                </button>
                <button className="btn btn-primary text-xs">
                  <GitMerge className="w-3 h-3 mr-1" />
                  Merge
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* PR Info */}
        <div className={cn(
          "flex items-center space-x-4 text-xs",
          theme === 'dark' ? "text-gray-400" : "text-gray-600"
        )}>
          <div className="flex items-center space-x-2">
            <img
              src={pr.user.avatar_url}
              alt={pr.user.login}
              className="w-4 h-4 rounded-full"
            />
            <span>{pr.user.login}</span>
          </div>
          
          <span>wants to merge {pr.head.ref} into {pr.base.ref}</span>
          
          <span>
            {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
          </span>
          
          <div className="flex items-center space-x-2">
            <span className="text-green-400">+{fileStats.additions}</span>
            <span className="text-red-400">-{fileStats.deletions}</span>
            <span>{fileStats.changed} files</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={cn(
        "flex border-b",
        theme === 'dark' ? "border-gray-700" : "border-gray-200"
      )}>
        <div
          onClick={() => setActiveTab('conversation')}
          className={cn('tab flex items-center', activeTab === 'conversation' && 'active')}
        >
          <MessageSquare className="w-3 h-3 mr-1" />
          <span className="text-xs">Conversation</span>
          <span className={cn(
            "ml-2 px-1 py-0.5 rounded text-xs",
            theme === 'dark' ? "bg-gray-700" : "bg-gray-200"
          )}>
            {comments.length + reviews.length}
          </span>
        </div>
        <div
          onClick={() => setActiveTab('files')}
          className={cn('tab flex items-center', activeTab === 'files' && 'active')}
        >
          <FileDiff className="w-3 h-3 mr-1" />
          <span className="text-xs">Files changed</span>
          <span className={cn(
            "ml-2 px-1 py-0.5 rounded text-xs",
            theme === 'dark' ? "bg-gray-700" : "bg-gray-200"
          )}>
            {files.length}
          </span>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'conversation' ? (
          <ConversationTab
            pr={pr}
            comments={comments}
            reviews={reviews}
            onCommentSubmit={() => loadPRData()}
          />
        ) : (
          <>
            {/* File list */}
            <div 
              ref={fileListRef}
              className={cn(
                "border-r overflow-y-auto relative",
                theme === 'dark'
                  ? "bg-gray-800 border-gray-700"
                  : "bg-gray-50 border-gray-200"
              )}
              style={{ width: `${fileListWidth}px` }}
            >
              <UncontrolledTreeEnvironment
                dataProvider={treeDataProvider}
                getItemTitle={(item) => item.index.toString().split('/').pop() || ''}
                viewState={{
                  'pr-files': {
                    expandedItems: Array.from(
                      (Object.values(treeItems) as TreeItem<TreeData>[])
                        .filter(
                          (item: TreeItem<TreeData>) =>
                            item.isFolder && (item.children?.length ?? 0) > 0
                        )
                        .map((item: TreeItem<TreeData>) => item.index)
                    ),
                  },
                }}
                onPrimaryAction={(item: TreeItem<TreeData>) => {
                  if (item && !item.isFolder && item.data.file) {
                    handleFileSelect(item.data.file);
                  }
                }}
                renderItemTitle={({ title, item }) => (
                  <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                  <span className="text-xs truncate font-mono flex items-center"> 
                    {item.isFolder ? (
                      <Folder className={cn(
                        "w-3 h-3 flex-shrink-0 mx-1",
                        theme === 'dark' ? "text-gray-500" : "text-gray-600"
                      )} />
                    ) : (
                      <FileDiff className={cn(
                        "w-3 h-3 flex-shrink-0 mx-1",
                        theme === 'dark' ? "text-gray-500" : "text-gray-600"
                      )} />
                    )}
                    
                      {title}
                    </span>
                  </div>
        
                  {item.data.file && (
                    <div className="flex items-center space-x-1 ml-2">
                      {viewedFiles.has(item.data.file.filename) && (
                        <Eye className={cn(
                          "w-3 h-3",
                          theme === 'dark' ? "text-gray-500" : "text-gray-600"
                        )} />
                      )}
                      <div className="flex items-center space-x-1 text-[10px]">
                        {item.data.file.status === 'added' ? (
                          <>
                            <FilePlus className="w-3 h-3 text-green-500" />
                            <span className="text-green-500">+{item.data.file.additions}</span>
                          </>
                        ) : item.data.file.status === 'removed' ? (
                          <>
                            <FileMinus className="w-3 h-3 text-red-500" />
                            <span className="text-red-500">-{item.data.file.deletions}</span>
                          </>
                        ) : item.data.file.status === 'modified' ? (
                          <>
                            <FileEdit className="w-3 h-3 text-yellow-500" />
                            <span className="text-green-400">+{item.data.file.additions}</span>
                            <span className="text-red-400">-{item.data.file.deletions}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-green-400">+{item.data.file.additions}</span>
                            <span className="text-red-400">-{item.data.file.deletions}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                )}
                
              >
                <Tree treeId="pr-files" rootItem="root" />
              </UncontrolledTreeEnvironment>
            </div>

            {/* Resize handle */}
            <div
              className="relative cursor-col-resize group flex-shrink-0"
              style={{ width: '3px', marginLeft: '-1px', marginRight: '-1px', padding: '0 1px' }}
              onMouseDown={handleMouseDown}
            >
              <div
                className={cn(
                  "w-px h-full transition-colors",
                  isResizing && "bg-blue-500",
                  theme === 'dark' ? "bg-gray-700" : "bg-gray-300",
                  "group-hover:bg-blue-500"
                )}
              />
              <div
                className={cn(
                  "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                )}
              >
                <div className={cn(
                  "flex space-x-0.5 px-1 py-0.5 rounded",
                  theme === 'dark' ? "bg-gray-700" : "bg-gray-200"
                )}>
                  <div className={cn(
                    "w-0.5 h-3 rounded-full",
                    theme === 'dark' ? "bg-gray-500" : "bg-gray-400"
                  )} />
                  <div className={cn(
                    "w-0.5 h-3 rounded-full",
                    theme === 'dark' ? "bg-gray-500" : "bg-gray-400"
                  )} />
                </div>
              </div>
            </div>

            {/* Diff viewer */}
            <div className="flex-1 overflow-hidden">
              {selectedFile && (
                <DiffEditor
                  file={selectedFile}
                  originalContent={fileContent?.original}
                  modifiedContent={fileContent?.modified}
                  comments={comments.filter(c => c.path === selectedFile.filename)}
                  onMarkViewed={() => toggleFileViewed(selectedFile.filename)}
                  isViewed={viewedFiles.has(selectedFile.filename)}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
