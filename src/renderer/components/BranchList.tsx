import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  CheckCircle, 
  Clock, 
  Plus,
  Trash2,
  ExternalLink,
  Search
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface Branch {
  name: string;
  type: 'local' | 'remote';
  ahead?: number;
  behind?: number;
  current?: boolean;
}

export const BranchList: React.FC = () => {
  const { selectedRepository } = useAppStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (selectedRepository) {
      loadBranches();
    }
  }, [selectedRepository]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      // This would need to be implemented in the main process
      // For now, we'll use mock data
      const mockBranches: Branch[] = [
        { name: 'main', type: 'local', current: true },
        { name: 'develop', type: 'local' },
        { name: 'feature/new-feature', type: 'local', ahead: 3, behind: 1 },
        { name: 'origin/main', type: 'remote' },
        { name: 'origin/develop', type: 'remote' },
        { name: 'origin/feature/another-feature', type: 'remote' },
      ];
      setBranches(mockBranches);
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBranches = branches.filter(branch => 
    branch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCheckout = async (branchName: string) => {
    try {
      // This would call the git checkout API
      console.log('Checking out branch:', branchName);
    } catch (error) {
      console.error('Failed to checkout branch:', error);
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    try {
      // This would call the git delete branch API
      console.log('Deleting branch:', branchName);
    } catch (error) {
      console.error('Failed to delete branch:', error);
    }
  };

  const handleCreateBranch = () => {
    // This would open a create branch modal
    console.log('Create new branch');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#30363d]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Branches</h3>
          <button
            className="p-1 hover:bg-[#21262d] rounded"
            onClick={handleCreateBranch}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray" />
          <input
            type="text"
            placeholder="Search branches..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Branch List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner" />
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="p-4 text-center text-gray">
            <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No branches found</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {/* Local Branches */}
            <div className="px-2 py-1">
              <h4 className="text-xs font-medium text-gray uppercase tracking-wide">Local</h4>
            </div>
            {filteredBranches
              .filter(branch => branch.type === 'local')
              .map((branch) => (
                <div
                  key={`local-${branch.name}`}
                  className="p-3 rounded hover:bg-[#21262d] border border-transparent"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <GitBranch className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {branch.name}
                          </span>
                          {branch.current && (
                            <span className="px-1.5 py-0.5 text-xs bg-green-900 text-green-200 rounded">
                              current
                            </span>
                          )}
                        </div>
                        {(branch.ahead || branch.behind) && (
                          <div className="text-xs text-gray mt-1">
                            {branch.ahead && branch.ahead > 0 && (
                              <span className="text-green-500">+{branch.ahead} ahead</span>
                            )}
                            {branch.ahead && branch.behind && <span className="mx-1">•</span>}
                            {branch.behind && branch.behind > 0 && (
                              <span className="text-red-500">{branch.behind} behind</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {!branch.current && (
                        <button
                          className="p-1 hover:bg-[#30363d] rounded"
                          onClick={() => handleCheckout(branch.name)}
                          title="Checkout branch"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className="p-1 hover:bg-[#30363d] rounded text-red-500"
                        onClick={() => handleDeleteBranch(branch.name)}
                        title="Delete branch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {/* Remote Branches */}
            <div className="px-2 py-1 mt-4">
              <h4 className="text-xs font-medium text-gray uppercase tracking-wide">Remote</h4>
            </div>
            {filteredBranches
              .filter(branch => branch.type === 'remote')
              .map((branch) => (
                <div
                  key={`remote-${branch.name}`}
                  className="p-3 rounded hover:bg-[#21262d] border border-transparent"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <GitBranch className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {branch.name}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1 hover:bg-[#30363d] rounded"
                        onClick={() => handleCheckout(branch.name)}
                        title="Checkout branch"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};