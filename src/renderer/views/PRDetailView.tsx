import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  GitPullRequest,
  GitPullRequestDraft,
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
  ChevronDown,
  Copy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DiffEditor } from '../components/DiffEditor';
import { ConversationTab } from '../components/ConversationTab';
import { useAuthStore } from '../stores/authStore';
import { GitHubAPI, PullRequest, File, Comment, Review } from '../services/github';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import { mockPullRequests, mockFiles, mockComments, mockReviews } from '../mockData';
import { useUIStore } from '../stores/uiStore';
import { usePRStore } from '../stores/prStore';
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
  const location = useLocation();
  const { token } = useAuthStore();
  const { theme } = useUIStore();
  const { fetchPullRequests, pullRequests, fetchPRDetails, bulkUpdatePRs } = usePRStore();
  
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
  const [showCheckoutDropdown, setShowCheckoutDropdown] = useState(false);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeMethod, setMergeMethod] = useState<'merge' | 'squash' | 'rebase'>('merge');
  const [copiedCommand, setCopiedCommand] = useState(false);
  const checkoutDropdownRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<{ login: string; avatar_url?: string } | null>(null);
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [requestChangesFeedback, setRequestChangesFeedback] = useState('');
  const [showPRSwitcher, setShowPRSwitcher] = useState(false);
  const prSwitcherRef = useRef<HTMLDivElement>(null);
  
  // Extract sibling PRs from navigation state
  const [navigationState, setNavigationState] = useState<{
    siblingPRs?: any[];
    currentTaskGroup?: string;
    currentAgent?: string;
  } | null>(location.state as any);

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

  // Helper functions to detect subgroups
  const getAgentFromPR = useCallback((pr: PullRequest): string => {
    const branchName = pr.head?.ref || '';
    const agentMatch = branchName.match(/^([^/]+)\//); 
    if (agentMatch) {
      return agentMatch[1];
    }
    
    const titleLower = pr.title.toLowerCase();
    if (titleLower.includes('cursor') || branchName.includes('cursor')) {
      return 'cursor';
    }
    
    const hasAILabel = pr.labels?.some((label: any) => 
      label.name.toLowerCase().includes('ai') || 
      label.name.toLowerCase().includes('cursor')
    );
    if (hasAILabel) {
      return 'cursor';
    }
    
    return 'manual';
  }, []);

  const getTitlePrefix = useCallback((title: string): string => {
    const withoutNumber = title.replace(/^#?\d+\s*/, '');
    const colonMatch = withoutNumber.match(/^([^:]+):/);
    if (colonMatch) {
      return colonMatch[1].trim();
    }
    const words = withoutNumber.split(/\s+/);
    const prefixWords = words.slice(0, Math.min(3, words.length));
    return prefixWords.join(' ');
  }, []);

  // Function to fetch sibling PRs
  const fetchSiblingPRs = useCallback(async (currentPR: PullRequest) => {
    if (!owner || !repo) return;
    
    // First ensure we have all PRs for this repo
    await fetchPullRequests(owner, repo);
    
    // Get all PRs from the store
    const allPRs = Array.from(pullRequests.values()).filter(
      pr => pr.base.repo.owner.login === owner && pr.base.repo.name === repo
    );
    
    if (allPRs.length === 0) return;
    
    // Find siblings based on agent and title prefix
    const currentAgent = getAgentFromPR(currentPR);
    const currentPrefix = getTitlePrefix(currentPR.title);
    
    const siblingPRs = allPRs.filter(pr => {
      const prAgent = getAgentFromPR(pr);
      const prPrefix = getTitlePrefix(pr.title);
      return prAgent === currentAgent && prPrefix === currentPrefix;
    });
    
    if (siblingPRs.length > 1) {
      console.log(`Found ${siblingPRs.length} sibling PRs for task: ${currentPrefix}`);
      
      // Fetch detailed data for all siblings in parallel
      const detailPromises = siblingPRs.map(pr => 
        fetchPRDetails(owner, repo, pr.number)
          .catch(error => {
            console.error(`Failed to fetch details for PR #${pr.number}:`, error);
            return pr; // Return the basic PR data if fetch fails
          })
      );
      
      const detailedPRs = await Promise.all(detailPromises);
      const validPRs = detailedPRs.filter(pr => pr !== null) as PullRequest[];
      
      // Update the navigation state with fetched siblings
      const newNavState = {
        siblingPRs: validPRs.map(p => ({
          id: p.id,
          number: p.number,
          title: p.title,
          state: p.state,
          draft: p.draft,
          merged: p.merged,
          user: p.user,
          created_at: p.created_at,
          updated_at: p.updated_at,
          approvalStatus: p.approvalStatus,
          additions: p.additions,
          deletions: p.deletions,
          changed_files: p.changed_files
        })),
        currentTaskGroup: currentPrefix,
        currentAgent: currentAgent
      };
      
      setNavigationState(newNavState);
      
      // Cache the detailed PRs in the store
      if (validPRs.length > 0) {
        bulkUpdatePRs(validPRs);
      }
    }
  }, [owner, repo, fetchPullRequests, pullRequests, getAgentFromPR, getTitlePrefix, fetchPRDetails, bulkUpdatePRs]);

  useEffect(() => {
    // Load data even without token if in dev mode
    if (!window.electron || (owner && repo && number)) {
      loadPRData();
    }
    
    // Load current user if we have a token
    if (token) {
      const api = new GitHubAPI(token);
      api.getCurrentUser().then(user => {
        setCurrentUser(user);
      }).catch(err => {
        console.error('Failed to get current user:', err);
      });
    }
  }, [owner, repo, number, token]);
  
  // Add keyboard shortcuts for navigating between sibling PRs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we have sibling PRs and not typing in an input
      if (!navigationState?.siblingPRs || navigationState.siblingPRs.length <= 1) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const currentIndex = navigationState.siblingPRs.findIndex(p => p.number === parseInt(number || '0'));
      
      // Alt/Option + Arrow keys for navigation
      if (e.altKey) {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault();
          const prevPR = navigationState.siblingPRs[currentIndex - 1];
          navigate(`/pulls/${owner}/${repo}/${prevPR.number}`, { state: navigationState });
        } else if (e.key === 'ArrowRight' && currentIndex < navigationState.siblingPRs.length - 1) {
          e.preventDefault();
          const nextPR = navigationState.siblingPRs[currentIndex + 1];
          navigate(`/pulls/${owner}/${repo}/${nextPR.number}`, { state: navigationState });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setShowPRSwitcher(!showPRSwitcher);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigationState, number, owner, repo, navigate, showPRSwitcher]);
  
  // Update browser history state when navigation state changes
  useEffect(() => {
    if (navigationState?.siblingPRs && navigationState.siblingPRs.length > 1) {
      // Update the current history entry with the navigation state
      window.history.replaceState(
        { ...window.history.state, usr: navigationState },
        ''
      );
    }
  }, [navigationState]);

  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      handleFileSelect(files[0]);
    }
  }, [files, selectedFile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (checkoutDropdownRef.current && !checkoutDropdownRef.current.contains(event.target as Node)) {
        setShowCheckoutDropdown(false);
      }
      if (prSwitcherRef.current && !prSwitcherRef.current.contains(event.target as Node)) {
        setShowPRSwitcher(false);
      }
    };

    if (showCheckoutDropdown || showPRSwitcher) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCheckoutDropdown, showPRSwitcher]);

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
          api.getPullRequestConversationComments(owner, repo, prNumber), // Use conversation comments only
          api.getPullRequestReviews(owner, repo, prNumber),
        ]);
        
        setPR(prData);
        setFiles(filesData);
        setComments(commentsData);
        setReviews(reviewsData);
        
        // Auto-select first file is now handled by useEffect
        
        // If we don't have navigation state yet, try to fetch sibling PRs
        if (!navigationState?.siblingPRs) {
          fetchSiblingPRs(prData);
        }
      }
    } catch (error) {
      console.error('Failed to load PR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    setShowCheckoutDropdown(!showCheckoutDropdown);
  };

  const copyCheckoutCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(true);
    setTimeout(() => {
      setCopiedCommand(false);
      setShowCheckoutDropdown(false);
    }, 2000);
  };

  const handleApprove = async () => {
    if (!pr || !token || !owner || !repo || !currentUser) return;
    
    setIsApproving(true);
    
    // Optimistically update the PR state immediately
    const updatedPR = {
      ...pr,
      approvalStatus: 'approved' as const,
      approvedBy: [
        ...(pr.approvedBy || []),
        { login: currentUser.login, avatar_url: currentUser.avatar_url || '' }
      ],
      // Remove from changes requested if present
      changesRequestedBy: pr.changesRequestedBy?.filter(r => r.login !== currentUser.login) || []
    };
    setPR(updatedPR);
    
    try {
      const api = new GitHubAPI(token);
      
      // Create approval review
      await api.createReview(
        owner,
        repo,
        pr.number,
        '', // Empty body for simple approval
        'APPROVE'
      );
      
      // Reload PR data to get the actual server state
      await loadPRData();
      
      // Also refresh the PR list in the background to update approval status there
      if (owner && repo) {
        fetchPullRequests(owner, repo, true);
      }
      
      // Show success feedback
      console.log('Successfully approved PR #' + pr.number);
    } catch (error: any) {
      console.error('Failed to approve PR:', error);
      
      // Revert the optimistic update on error
      setPR(pr);
      
      // Provide more detailed error message
      let errorMessage = 'Failed to approve pull request.';
      
      if (error?.response?.status === 422) {
        // This could be because user already reviewed or is the author
        errorMessage = 'Unable to approve: You may have already reviewed this PR, or you cannot approve your own pull request.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'You do not have permission to approve this pull request.';
      } else if (error?.response?.data?.message) {
        errorMessage = `Failed to approve: ${error.response.data.message}`;
      } else if (error?.message) {
        errorMessage = `Failed to approve: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!pr || !token || !owner || !repo) return;
    
    // Show the modal instead of using prompt
    setShowRequestChangesModal(true);
  };

  const submitRequestChanges = async () => {
    if (!pr || !token || !owner || !repo || !requestChangesFeedback.trim() || !currentUser) {
      return;
    }
    
    setIsApproving(true);
    setShowRequestChangesModal(false);
    
    // Optimistically update the PR state immediately
    const updatedPR = {
      ...pr,
      approvalStatus: 'changes_requested' as const,
      changesRequestedBy: [
        ...(pr.changesRequestedBy || []),
        { login: currentUser.login, avatar_url: currentUser.avatar_url || '' }
      ],
      // Remove from approved if present
      approvedBy: pr.approvedBy?.filter(r => r.login !== currentUser.login) || []
    };
    setPR(updatedPR);
    
    try {
      const api = new GitHubAPI(token);
      
      // Create review requesting changes
      await api.createReview(
        owner,
        repo,
        pr.number,
        requestChangesFeedback,
        'REQUEST_CHANGES'
      );
      
      // Clear the feedback for next time
      setRequestChangesFeedback('');
      
      // Reload PR data to get the actual server state
      await loadPRData();
      
      // Also refresh the PR list in the background
      if (owner && repo) {
        fetchPullRequests(owner, repo, true);
      }
      
      // Show success feedback
      console.log('Successfully requested changes for PR #' + pr.number);
    } catch (error: any) {
      console.error('Failed to request changes:', error);
      
      // Revert the optimistic update on error
      setPR(pr);
      
      let errorMessage = 'Failed to request changes.';
      
      if (error?.response?.status === 422) {
        errorMessage = 'Unable to request changes: You may have already reviewed this PR, or you cannot review your own pull request.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'You do not have permission to review this pull request.';
      } else if (error?.response?.data?.message) {
        errorMessage = `Failed to request changes: ${error.response.data.message}`;
      } else if (error?.message) {
        errorMessage = `Failed to request changes: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsApproving(false);
    }
  };

  const handleMerge = async () => {
    if (!pr || !token || !owner || !repo) return;
    
    setIsMerging(true);
    try {
      const api = new GitHubAPI(token);
      await api.mergePullRequest(
        owner,
        repo,
        pr.number,
        mergeMethod,
        pr.title,
        pr.body || undefined
      );
      
      setShowMergeConfirm(false);
      // Reload PR data to reflect the merge
      await loadPRData();
    } catch (error) {
      console.error('Failed to merge PR:', error);
      alert('Failed to merge pull request. Please check if the PR is mergeable and try again.');
    } finally {
      setIsMerging(false);
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
                <div title="Draft">
                  <GitPullRequestDraft className="w-5 h-5 text-gray-400" />
                </div>
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
              
              {/* PR Subgroup Switcher */}
              {navigationState?.siblingPRs && navigationState.siblingPRs.length > 1 && (
                <div className="relative ml-3" ref={prSwitcherRef}>
                  <button
                    onClick={() => setShowPRSwitcher(!showPRSwitcher)}
                    className={cn(
                      "flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                      theme === 'dark'
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700",
                      showPRSwitcher && (theme === 'dark' ? "bg-gray-600" : "bg-gray-200")
                    )}
                    title={`Switch between ${navigationState.siblingPRs.length} related PRs in task: ${navigationState.currentTaskGroup}\n\nKeyboard shortcuts:\n• Alt/⌥ + ← : Previous PR\n• Alt/⌥ + → : Next PR\n• Alt/⌥ + ↓ : Open switcher`}
                  >
                    <span className="flex items-center">
                      {(() => {
                        const currentIndex = navigationState.siblingPRs.findIndex(p => p.number === pr.number);
                        const hasPrev = currentIndex > 0;
                        const hasNext = currentIndex < navigationState.siblingPRs.length - 1;
                        
                        return (
                          <>
                            <ChevronLeft className={cn(
                              "w-3 h-3 mr-1",
                              hasPrev ? "" : "opacity-30"
                            )} />
                            <span>
                              {currentIndex + 1} of {navigationState.siblingPRs.length}
                            </span>
                            <ChevronRight className={cn(
                              "w-3 h-3 ml-1",
                              hasNext ? "" : "opacity-30"
                            )} />
                          </>
                        );
                      })()}
                    </span>
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </button>
                  
                  {showPRSwitcher && (
                    <div className={cn(
                      "absolute top-full mt-1 left-0 w-80 max-h-96 overflow-y-auto rounded-md shadow-lg z-50",
                      theme === 'dark'
                        ? "bg-gray-800 border border-gray-700"
                        : "bg-white border border-gray-200"
                    )}>
                      <div className="p-2">
                        <div className={cn(
                          "text-xs font-semibold px-2 py-1 mb-1",
                          theme === 'dark' ? "text-gray-400" : "text-gray-600"
                        )}>
                          {navigationState.currentTaskGroup} ({navigationState.siblingPRs.length} PRs)
                        </div>
                        
                        {navigationState.siblingPRs.map((siblingPR) => {
                          const isCurrentPR = siblingPR.number === pr.number;
                          const isPROpen = siblingPR.state === 'open' && !siblingPR.merged;
                          const isPRDraft = siblingPR.draft;
                          const isPRMerged = siblingPR.merged;
                          
                          return (
                            <button
                              key={siblingPR.id}
                              onClick={() => {
                                if (!isCurrentPR) {
                                  // Navigate with the current navigation state
                                  navigate(`/pulls/${owner}/${repo}/${siblingPR.number}`, { 
                                    state: navigationState 
                                  });
                                  setShowPRSwitcher(false);
                                }
                              }}
                              disabled={isCurrentPR}
                              className={cn(
                                "w-full text-left px-2 py-2 rounded flex items-start space-x-2 transition-colors",
                                isCurrentPR
                                  ? theme === 'dark'
                                    ? "bg-blue-900/30 border border-blue-700"
                                    : "bg-blue-50 border border-blue-200"
                                  : theme === 'dark'
                                    ? "hover:bg-gray-700"
                                    : "hover:bg-gray-100"
                              )}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                {isPRDraft ? (
                                  <GitPullRequestDraft className="w-4 h-4 text-gray-400" />
                                ) : isPRMerged ? (
                                  <GitMerge className="w-4 h-4 text-purple-400" />
                                ) : isPROpen ? (
                                  <GitPullRequest className="w-4 h-4 text-green-400" />
                                ) : (
                                  <X className="w-4 h-4 text-red-400" />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center">
                                  <span className={cn(
                                    "text-xs font-medium truncate",
                                    theme === 'dark' ? "text-gray-200" : "text-gray-900"
                                  )}>
                                    #{siblingPR.number}
                                  </span>
                                  {isCurrentPR && (
                                    <span className={cn(
                                      "ml-2 text-xs px-1.5 py-0.5 rounded",
                                      theme === 'dark'
                                        ? "bg-blue-800 text-blue-200"
                                        : "bg-blue-100 text-blue-700"
                                    )}>
                                      Current
                                    </span>
                                  )}
                                  {siblingPR.approvalStatus === 'approved' && (
                                    <span title="Approved">
                                      <CheckCircle2 className="w-3 h-3 text-green-500 ml-2" />
                                    </span>
                                  )}
                                  {siblingPR.approvalStatus === 'changes_requested' && (
                                    <span title="Changes requested">
                                      <XCircle className="w-3 h-3 text-red-500 ml-2" />
                                    </span>
                                  )}
                                </div>
                                <div className={cn(
                                  "text-xs truncate mt-0.5",
                                  theme === 'dark' ? "text-gray-400" : "text-gray-600"
                                )}>
                                  {siblingPR.title}
                                </div>
                                {(siblingPR.additions > 0 || siblingPR.deletions > 0) && (
                                  <div className="flex items-center space-x-2 mt-1 text-xs">
                                    <span className="text-green-500">+{siblingPR.additions || 0}</span>
                                    <span className="text-red-500">−{siblingPR.deletions || 0}</span>
                                    <span className={cn(
                                      theme === 'dark' ? "text-gray-500" : "text-gray-600"
                                    )}>
                                      {siblingPR.changed_files || 0} files
                                    </span>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* GitHub Link */}
              <a
                href={`https://github.com/${pr.base.repo.owner.login}/${pr.base.repo.name}/pull/${pr.number}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "p-1 rounded transition-colors",
                  theme === 'dark' 
                    ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200" 
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                )}
                title="Open in GitHub"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative" ref={checkoutDropdownRef}>
              <button
                onClick={handleCheckout}
                className="btn btn-secondary text-xs flex items-center"
              >
                <Terminal className="w-3 h-3 mr-1" />
                Checkout
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>
              
              {showCheckoutDropdown && (
                <div className={cn(
                  "absolute right-0 mt-1 w-80 rounded-md shadow-lg z-50",
                  theme === 'dark' 
                    ? "bg-gray-800 border border-gray-700" 
                    : "bg-white border border-gray-200"
                )}>
                  <div className="p-3 space-y-2">
                    <div className={cn(
                      "text-xs font-semibold mb-2",
                      theme === 'dark' ? "text-gray-300" : "text-gray-700"
                    )}>
                      Checkout this branch locally:
                    </div>
                    
                    {/* GitHub CLI command */}
                    <div className={cn(
                      "p-2 rounded font-mono text-xs flex items-center justify-between",
                      theme === 'dark' ? "bg-gray-900" : "bg-gray-100"
                    )}>
                      <span>gh pr checkout {pr.number}</span>
                      <button
                        onClick={() => copyCheckoutCommand(`gh pr checkout ${pr.number}`)}
                        className={cn(
                          "ml-2 p-1 rounded transition-colors",
                          theme === 'dark' 
                            ? "hover:bg-gray-700" 
                            : "hover:bg-gray-200"
                        )}
                      >
                        {copiedCommand ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    
                    {/* Git commands */}
                    <div className={cn(
                      "text-xs mt-2",
                      theme === 'dark' ? "text-gray-400" : "text-gray-600"
                    )}>
                      Or using git:
                    </div>
                    <div className={cn(
                      "p-2 rounded font-mono text-xs space-y-1",
                      theme === 'dark' ? "bg-gray-900" : "bg-gray-100"
                    )}>
                      <div>git fetch origin pull/{pr.number}/head:{pr.head.ref}</div>
                      <div>git checkout {pr.head.ref}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {pr.state === 'open' && !pr.merged && (
              <>
                {(() => {
                  const isAuthor = currentUser && pr.user.login === currentUser.login;
                  const hasApproved = currentUser && pr.approvedBy?.some(
                    r => r.login === currentUser.login
                  );
                  const hasRequestedChanges = currentUser && pr.changesRequestedBy?.some(
                    r => r.login === currentUser.login
                  );
                  
                  // Don't show review buttons for PR authors
                  if (!isAuthor) {
                    return (
                      <>
                        <button 
                          onClick={handleApprove}
                          disabled={isApproving || !!hasApproved}
                          className={cn(
                            "btn text-xs",
                            hasApproved ? "btn-success" : "btn-secondary"
                          )}
                          title={
                            hasApproved ? "You have already approved this PR" :
                            "Approve this pull request"
                          }
                        >
                          {isApproving ? (
                            <>
                              <div className="w-3 h-3 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Reviewing...
                            </>
                          ) : hasApproved ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Approved
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Approve
                            </>
                          )}
                        </button>
                        
                        <button 
                          onClick={handleRequestChanges}
                          disabled={isApproving}
                          className={cn(
                            "btn text-xs",
                            hasRequestedChanges ? "btn-danger" : "btn-secondary"
                          )}
                          title={
                            hasRequestedChanges ? "You have requested changes on this PR" :
                            "Request changes to this pull request"
                          }
                        >
                          {hasRequestedChanges ? (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Changes Requested
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Request Changes
                            </>
                          )}
                        </button>
                      </>
                    );
                  }
                  
                  return null;
                })()}
                
                <button 
                  onClick={() => setShowMergeConfirm(true)}
                  className="btn btn-primary text-xs"
                >
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
          
          {/* Approval Status Badge */}
          {pr.state === 'open' && !pr.merged && (
            <div className="flex items-center">
              {pr.approvalStatus === 'approved' ? (
                <div className="flex items-center px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  <span className="text-xs">
                    Approved {pr.approvedBy && pr.approvedBy.length > 0 && `(${pr.approvedBy.length})`}
                  </span>
                </div>
              ) : pr.approvalStatus === 'changes_requested' ? (
                <div className="flex items-center px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                  <XCircle className="w-3 h-3 mr-1" />
                  <span className="text-xs">Changes requested</span>
                </div>
              ) : pr.approvalStatus === 'pending' ? (
                <div className="flex items-center px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                  <Clock className="w-3 h-3 mr-1" />
                  <span className="text-xs">Review pending</span>
                </div>
              ) : null}
            </div>
          )}
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

      {/* Merge Confirmation Dialog */}
      {showMergeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={cn(
            "rounded-lg shadow-xl p-6 max-w-md w-full mx-4",
            theme === 'dark' 
              ? "bg-gray-800 border border-gray-700" 
              : "bg-white border border-gray-200"
          )}>
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
              <h2 className="text-lg font-semibold">Confirm Merge</h2>
            </div>
            
            <p className={cn(
              "text-sm mb-4",
              theme === 'dark' ? "text-gray-300" : "text-gray-700"
            )}>
              Are you sure you want to merge <strong>#{pr.number} {pr.title}</strong>?
            </p>
            
            <div className="mb-4">
              <label className={cn(
                "block text-xs font-medium mb-2",
                theme === 'dark' ? "text-gray-400" : "text-gray-600"
              )}>
                Merge method:
              </label>
              <select
                value={mergeMethod}
                onChange={(e) => setMergeMethod(e.target.value as 'merge' | 'squash' | 'rebase')}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded border",
                  theme === 'dark'
                    ? "bg-gray-900 border-gray-700 text-gray-300"
                    : "bg-white border-gray-300 text-gray-900"
                )}
              >
                <option value="merge">Create a merge commit</option>
                <option value="squash">Squash and merge</option>
                <option value="rebase">Rebase and merge</option>
              </select>
            </div>
            
            {pr.mergeable === false && (
              <div className={cn(
                "mb-4 p-3 rounded text-sm",
                theme === 'dark' 
                  ? "bg-red-900/20 text-red-400 border border-red-800" 
                  : "bg-red-50 text-red-700 border border-red-200"
              )}>
                <strong>Warning:</strong> This pull request has conflicts that must be resolved before merging.
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowMergeConfirm(false)}
                className="btn btn-secondary text-sm"
                disabled={isMerging}
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={isMerging || pr.mergeable === false}
                className="btn btn-primary text-sm"
              >
                {isMerging ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <GitMerge className="w-4 h-4 mr-2" />
                    Confirm Merge
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {showRequestChangesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={cn(
            "rounded-lg shadow-xl p-6 max-w-md w-full mx-4",
            theme === 'dark' 
              ? "bg-gray-800 border border-gray-700" 
              : "bg-white border border-gray-200"
          )}>
            <div className="flex items-center mb-4">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <h2 className="text-lg font-semibold">Request Changes</h2>
            </div>
            
            <p className={cn(
              "text-sm mb-4",
              theme === 'dark' ? "text-gray-300" : "text-gray-700"
            )}>
              Please describe what changes need to be made to <strong>#{pr.number} {pr.title}</strong>
            </p>
            
            <div className="mb-4">
              <label className={cn(
                "block text-xs font-medium mb-2",
                theme === 'dark' ? "text-gray-400" : "text-gray-600"
              )}>
                Feedback (required):
              </label>
              <textarea
                value={requestChangesFeedback}
                onChange={(e) => setRequestChangesFeedback(e.target.value)}
                placeholder="Describe the changes that need to be made..."
                className={cn(
                  "w-full px-3 py-2 text-sm rounded border resize-none",
                  theme === 'dark'
                    ? "bg-gray-900 border-gray-700 text-gray-300 placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                )}
                rows={6}
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRequestChangesModal(false);
                  setRequestChangesFeedback('');
                }}
                className="btn btn-secondary text-sm"
                disabled={isApproving}
              >
                Cancel
              </button>
              <button
                onClick={submitRequestChanges}
                disabled={isApproving || !requestChangesFeedback.trim()}
                className="btn btn-danger text-sm"
              >
                {isApproving ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Request Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
