import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  GitPullRequest,
  GitMerge,
  X,
  Check,
  MessageSquare,
  Eye,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  FileDiff,
  Terminal
} from 'lucide-react';
import { DiffEditor } from '../components/DiffEditor';
import { ConversationTab } from '../components/ConversationTab';
import { useAuthStore } from '../stores/authStore';
import { GitHubAPI, PullRequest, File, Comment, Review } from '../services/github';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import { mockPullRequests, mockFiles, mockComments, mockReviews } from '../mockData';
import { useUIStore } from '../stores/uiStore';

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
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [viewedFiles, setViewedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load data even without token if in dev mode
    if (!window.electron || (owner && repo && number)) {
      loadPRData();
    }
  }, [owner, repo, number, token]);

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
        
        // Auto-select first file
        if (filesData.length > 0) {
          setSelectedFile(filesData[0]);
        }
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

  const toggleFileExpanded = (filename: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const markFileViewed = (filename: string) => {
    const newViewed = new Set(viewedFiles);
    newViewed.add(filename);
    setViewedFiles(newViewed);
  };

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
                <GitMerge className="w-5 h-5 text-purple-400" title="Merged" />
              ) : pr.state === 'open' ? (
                <GitPullRequest className="w-5 h-5 text-green-400" title="Open" />
              ) : (
                <X className="w-5 h-5 text-red-400" title="Closed" />
              )}
              
              <h1 className="text-lg font-semibold">
                {pr.title}
                <span className={cn(
                  "ml-2 text-sm",
                  theme === 'dark' ? "text-gray-500" : "text-gray-600"
                )}>#{pr.number}</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCheckout}
              className="btn btn-secondary text-sm"
            >
              <Terminal className="w-4 h-4 mr-1" />
              Checkout
            </button>
            
            {pr.state === 'open' && !pr.merged && (
              <>
                <button className="btn btn-success text-sm">
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </button>
                <button className="btn btn-primary text-sm">
                  <GitMerge className="w-4 h-4 mr-1" />
                  Merge
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* PR Info */}
        <div className={cn(
          "flex items-center space-x-4 text-sm",
          theme === 'dark' ? "text-gray-400" : "text-gray-600"
        )}>
          <div className="flex items-center space-x-2">
            <img
              src={pr.user.avatar_url}
              alt={pr.user.login}
              className="w-5 h-5 rounded-full"
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
        <button
          onClick={() => setActiveTab('conversation')}
          className={cn('tab', activeTab === 'conversation' && 'active')}
        >
          <MessageSquare className="w-4 h-4 mr-1" />
          Conversation
          <span className={cn(
            "ml-2 px-1.5 py-0.5 rounded text-xs",
            theme === 'dark' ? "bg-gray-700" : "bg-gray-200"
          )}>
            {comments.length + reviews.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={cn('tab', activeTab === 'files' && 'active')}
        >
          <FileDiff className="w-4 h-4 mr-1" />
          Files changed
          <span className={cn(
            "ml-2 px-1.5 py-0.5 rounded text-xs",
            theme === 'dark' ? "bg-gray-700" : "bg-gray-200"
          )}>
            {files.length}
          </span>
        </button>
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
            <div className={cn(
              "w-80 border-r overflow-y-auto",
              theme === 'dark' 
                ? "bg-gray-800 border-gray-700" 
                : "bg-gray-50 border-gray-200"
            )}>
              <div className={cn(
                "p-3 border-b",
                theme === 'dark' ? "border-gray-700" : "border-gray-200"
              )}>
                <input
                  type="text"
                  placeholder="Filter files..."
                  className="input w-full text-sm"
                />
              </div>
              
              <div className={cn(
                "divide-y",
                theme === 'dark' ? "divide-gray-700" : "divide-gray-200"
              )}>
                {files.map((file) => {
                  const isSelected = selectedFile?.filename === file.filename;
                  const isViewed = viewedFiles.has(file.filename);
                  
                  return (
                    <div
                      key={file.filename}
                      className={cn(
                        'px-3 py-2 cursor-pointer transition-colors',
                        theme === 'dark' 
                          ? 'hover:bg-gray-700' 
                          : 'hover:bg-gray-100',
                        isSelected && (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100')
                      )}
                      onClick={() => setSelectedFile(file)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileDiff className={cn(
                            "w-4 h-4 flex-shrink-0",
                            theme === 'dark' ? "text-gray-500" : "text-gray-600"
                          )} />
                          <span className="text-sm truncate font-mono">
                            {file.filename}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-2">
                          {isViewed && (
                            <Eye className={cn(
                              "w-3 h-3",
                              theme === 'dark' ? "text-gray-500" : "text-gray-600"
                            )} />
                          )}
                          <div className="flex items-center space-x-1 text-xs">
                            <span className="text-green-400">+{file.additions}</span>
                            <span className="text-red-400">-{file.deletions}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Diff viewer */}
            <div className="flex-1 overflow-hidden">
              {selectedFile && (
                <DiffEditor
                  file={selectedFile}
                  comments={comments.filter(c => c.path === selectedFile.filename)}
                  onMarkViewed={() => markFileViewed(selectedFile.filename)}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
