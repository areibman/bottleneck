import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  GitBranch,
  GitCommit,
  Plus,
  Trash2,
  GitPullRequest,
  RefreshCw,
  Check,
  Search,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

const BranchesPage: React.FC = () => {
  const { selectedRepo } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyLocal, setShowOnlyLocal] = useState(false);
  const [showOnlyRemote, setShowOnlyRemote] = useState(false);

  const { data: branches, isLoading, refetch } = useQuery({
    queryKey: ['branches', selectedRepo?.full_name],
    queryFn: async () => {
      if (!selectedRepo) return [];
      // In a real implementation, this would call git operations
      // For now, returning mock data
      return [
        {
          name: 'main',
          is_local: true,
          is_remote: true,
          current: true,
          ahead: 0,
          behind: 0,
          last_commit: {
            sha: 'abc123',
            message: 'Initial commit',
            date: new Date().toISOString(),
          },
        },
        {
          name: 'feature/new-feature',
          is_local: true,
          is_remote: true,
          current: false,
          ahead: 2,
          behind: 1,
          last_commit: {
            sha: 'def456',
            message: 'Add new feature',
            date: new Date().toISOString(),
          },
        },
      ];
    },
    enabled: !!selectedRepo,
  });

  const filteredBranches = branches?.filter(branch => {
    if (searchTerm && !branch.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (showOnlyLocal && !branch.is_local) return false;
    if (showOnlyRemote && !branch.is_remote) return false;
    return true;
  });

  const handleCheckout = async (branchName: string) => {
    // Implementation for checking out branch
    console.log('Checkout branch:', branchName);
  };

  const handleCreatePR = (branchName: string) => {
    // Implementation for creating PR from branch
    console.log('Create PR from branch:', branchName);
  };

  const handleDeleteBranch = async (branchName: string) => {
    // Implementation for deleting branch
    console.log('Delete branch:', branchName);
  };

  if (!selectedRepo) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
        <div className="text-center">
          <GitBranch size={48} className="mx-auto mb-4 opacity-50" />
          <p>Select a repository to view branches</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Branches - {selectedRepo.name}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
            >
              <RefreshCw size={18} />
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded text-sm hover:bg-[var(--accent-secondary)]">
              <Plus size={16} />
              <span>New Branch</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search branches..."
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={showOnlyLocal}
              onChange={(e) => setShowOnlyLocal(e.target.checked)}
              className="rounded"
            />
            <span>Local only</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={showOnlyRemote}
              onChange={(e) => setShowOnlyRemote(e.target.checked)}
              className="rounded"
            />
            <span>Remote only</span>
          </label>
        </div>
      </div>

      {/* Branches List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]" />
          </div>
        ) : filteredBranches && filteredBranches.length > 0 ? (
          <div className="p-4">
            {filteredBranches.map((branch) => (
              <div
                key={branch.name}
                className="flex items-center justify-between p-3 mb-2 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
              >
                <div className="flex items-center gap-3">
                  <GitBranch size={18} className="text-[var(--text-secondary)]" />
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--text-primary)]">
                        {branch.name}
                      </span>
                      {branch.current && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs rounded">
                          Current
                        </span>
                      )}
                      {branch.is_local && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-500 text-xs rounded">
                          Local
                        </span>
                      )}
                      {branch.is_remote && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-500 text-xs rounded">
                          Remote
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-tertiary)]">
                      <span className="flex items-center gap-1">
                        <GitCommit size={12} />
                        {branch.last_commit.message}
                      </span>
                      {branch.ahead > 0 && (
                        <span className="text-green-500">↑{branch.ahead}</span>
                      )}
                      {branch.behind > 0 && (
                        <span className="text-red-500">↓{branch.behind}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!branch.current && (
                    <button
                      onClick={() => handleCheckout(branch.name)}
                      className="px-3 py-1 text-sm bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)]"
                    >
                      Checkout
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleCreatePR(branch.name)}
                    className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
                    title="Create Pull Request"
                  >
                    <GitPullRequest size={16} />
                  </button>
                  
                  {!branch.current && (
                    <button
                      onClick={() => handleDeleteBranch(branch.name)}
                      className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-red-500"
                      title="Delete Branch"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
            <div className="text-center">
              <GitBranch size={48} className="mx-auto mb-4 opacity-50" />
              <p>No branches found</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchesPage;