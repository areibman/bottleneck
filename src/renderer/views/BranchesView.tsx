import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  GitMerge,
  RefreshCw,
  Terminal,
  ArrowUpDown,
  Search
} from 'lucide-react';
import { cn } from '../utils/cn';

interface Branch {
  name: string;
  current: boolean;
  commit: string;
  label: string;
  linkedWorkTree?: string;
  isLocal: boolean;
  isRemote: boolean;
}

export default function BranchesView() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocal, setShowLocal] = useState(true);
  const [showRemote, setShowRemote] = useState(true);
  const [loading, setLoading] = useState(false);
  const [repoPath, setRepoPath] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, [repoPath]);

  const loadBranches = async () => {
    if (!repoPath) return;
    
    setLoading(true);
    try {
      const result = await window.electron.git.getBranches(repoPath);
      if (result.success) {
        setBranches(result.data);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (branch: Branch) => {
    if (!repoPath) return;
    
    try {
      await window.electron.git.checkout(repoPath, branch.name);
      await loadBranches(); // Refresh to update current branch
    } catch (error) {
      console.error('Failed to checkout branch:', error);
    }
  };

  const handleFetch = async () => {
    if (!repoPath) return;
    
    setLoading(true);
    try {
      await window.electron.git.fetch(repoPath);
      await loadBranches();
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    if (!repoPath) return;
    
    setLoading(true);
    try {
      await window.electron.git.pull(repoPath);
      await loadBranches();
    } catch (error) {
      console.error('Failed to pull:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectRepository = async () => {
    const path = await window.electron.app.selectDirectory();
    if (path) {
      setRepoPath(path);
    }
  };

  const filteredBranches = branches.filter(branch => {
    const matchesSearch = branch.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = (showLocal && branch.isLocal) || (showRemote && branch.isRemote);
    return matchesSearch && matchesType;
  });

  const localBranches = filteredBranches.filter(b => b.isLocal);
  const remoteBranches = filteredBranches.filter(b => b.isRemote);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold flex items-center">
            <GitBranch className="w-5 h-5 mr-2" />
            Branches
          </h1>
          
          <div className="flex items-center space-x-2">
            {repoPath ? (
              <>
                <button
                  onClick={handleFetch}
                  disabled={loading}
                  className="btn btn-ghost p-2"
                  title="Fetch all branches"
                >
                  <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                </button>
                <button
                  onClick={handlePull}
                  disabled={loading}
                  className="btn btn-ghost p-2"
                  title="Pull current branch"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
                <button className="btn btn-primary text-sm">
                  <Plus className="w-4 h-4 mr-1" />
                  New Branch
                </button>
              </>
            ) : (
              <button
                onClick={selectRepository}
                className="btn btn-primary text-sm"
              >
                Select Repository
              </button>
            )}
          </div>
        </div>

        {repoPath && (
          <>
            <div className="flex items-center space-x-4 mb-3">
              <div className="text-sm text-gray-400">
                Repository: <span className="font-mono text-white">{repoPath}</span>
              </div>
            </div>

            {/* Search and filters */}
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search branches..."
                  className="input pl-10 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowLocal(!showLocal)}
                  className={cn('btn btn-ghost text-sm', showLocal && 'bg-gray-700')}
                >
                  Local
                </button>
                <button
                  onClick={() => setShowRemote(!showRemote)}
                  className={cn('btn btn-ghost text-sm', showRemote && 'bg-gray-700')}
                >
                  Remote
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Branch list */}
      {!repoPath ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 mb-4">No repository selected</p>
            <button
              onClick={selectRepository}
              className="btn btn-primary"
            >
              Select Repository
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">Loading branches...</div>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <GitBranch className="w-12 h-12 mb-4 opacity-50" />
              <p>No branches found</p>
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Local branches */}
              {localBranches.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Local Branches ({localBranches.length})
                  </h3>
                  <div className="space-y-2">
                    {localBranches.map((branch) => (
                      <div
                        key={branch.name}
                        className={cn(
                          'card p-3 flex items-center justify-between cursor-pointer hover:bg-gray-700 transition-colors',
                          branch.current && 'border-blue-500 bg-gray-700'
                        )}
                        onClick={() => setSelectedBranch(branch)}
                      >
                        <div className="flex items-center space-x-3">
                          <GitBranch className={cn(
                            'w-4 h-4',
                            branch.current ? 'text-blue-400' : 'text-gray-400'
                          )} />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm">{branch.name}</span>
                              {branch.current && (
                                <span className="text-xs px-2 py-0.5 bg-blue-900 text-blue-300 rounded">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {branch.commit.substring(0, 7)} · {branch.label}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {!branch.current && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckout(branch);
                              }}
                              className="btn btn-ghost p-2 text-sm"
                              title="Checkout branch"
                            >
                              <Terminal className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle delete
                            }}
                            className="btn btn-ghost p-2 text-sm text-red-400 hover:text-red-300"
                            title="Delete branch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remote branches */}
              {remoteBranches.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Remote Branches ({remoteBranches.length})
                  </h3>
                  <div className="space-y-2">
                    {remoteBranches.map((branch) => (
                      <div
                        key={branch.name}
                        className="card p-3 flex items-center justify-between cursor-pointer hover:bg-gray-700 transition-colors"
                        onClick={() => setSelectedBranch(branch)}
                      >
                        <div className="flex items-center space-x-3">
                          <GitBranch className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="font-mono text-sm">{branch.name}</span>
                            <div className="text-xs text-gray-500 mt-1">
                              {branch.commit.substring(0, 7)} · {branch.label}
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckout(branch);
                          }}
                          className="btn btn-ghost p-2 text-sm"
                          title="Checkout branch"
                        >
                          <Terminal className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
