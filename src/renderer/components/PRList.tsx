import React, { useState, useEffect } from 'react';
import { 
  GitPullRequest, 
  GitMerge, 
  GitCommit, 
  Clock, 
  User, 
  Tag,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatDistanceToNow } from 'date-fns';

export const PRList: React.FC = () => {
  const {
    pullRequests,
    selectedPR,
    setSelectedPR,
    selectedRepository,
    loadPullRequests,
    prFilters,
    setPRFilters,
    loading,
    selectedPRs,
    setSelectedPRs
  } = useAppStore();

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (selectedRepository) {
      loadPullRequests(selectedRepository);
    }
  }, [selectedRepository, prFilters.state]);

  const filteredPRs = pullRequests.filter(pr => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        pr.title.toLowerCase().includes(query) ||
        pr.author.toLowerCase().includes(query) ||
        pr.labels.some(label => label.toLowerCase().includes(query)) ||
        pr.number.toString().includes(query)
      );
    }
    return true;
  });

  const handlePRSelect = (pr: any) => {
    setSelectedPR(pr);
  };

  const handlePRToggle = (prId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const newSelected = new Set(selectedPRs);
    if (newSelected.has(prId)) {
      newSelected.delete(prId);
    } else {
      newSelected.add(prId);
    }
    setSelectedPRs(newSelected);
  };

  const getStatusIcon = (pr: any) => {
    if (pr.state === 'merged') {
      return <GitMerge className="w-4 h-4 text-purple-500" />;
    }
    if (pr.state === 'closed') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (pr.checksStatus === 'success') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (pr.checksStatus === 'failure' || pr.checksStatus === 'error') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (pr.checksStatus === 'pending') {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-gray-500" />;
  };

  const getStatusColor = (pr: any) => {
    if (pr.state === 'merged') return 'text-purple-500';
    if (pr.state === 'closed') return 'text-red-500';
    if (pr.checksStatus === 'success') return 'text-green-500';
    if (pr.checksStatus === 'failure' || pr.checksStatus === 'error') return 'text-red-500';
    if (pr.checksStatus === 'pending') return 'text-yellow-500';
    return 'text-gray-500';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#30363d]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Pull Requests</h3>
          <div className="flex items-center gap-2">
            <button
              className="p-1 hover:bg-[#21262d] rounded"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </button>
            <div className="flex gap-1">
              <button
                className={`px-2 py-1 text-xs rounded ${
                  prFilters.state === 'open' 
                    ? 'bg-[#1f6feb] text-white' 
                    : 'bg-[#21262d] text-gray hover:bg-[#30363d]'
                }`}
                onClick={() => setPRFilters({ state: 'open' })}
              >
                Open
              </button>
              <button
                className={`px-2 py-1 text-xs rounded ${
                  prFilters.state === 'closed' 
                    ? 'bg-[#1f6feb] text-white' 
                    : 'bg-[#21262d] text-gray hover:bg-[#30363d]'
                }`}
                onClick={() => setPRFilters({ state: 'closed' })}
              >
                Closed
              </button>
              <button
                className={`px-2 py-1 text-xs rounded ${
                  prFilters.state === 'all' 
                    ? 'bg-[#1f6feb] text-white' 
                    : 'bg-[#21262d] text-gray hover:bg-[#30363d]'
                }`}
                onClick={() => setPRFilters({ state: 'all' })}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray" />
          <input
            type="text"
            placeholder="Search PRs..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 p-3 bg-[#0d1117] rounded border border-[#30363d]">
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray mb-1 block">Author</label>
                <input
                  type="text"
                  placeholder="Filter by author..."
                  className="input text-sm"
                  value={prFilters.author || ''}
                  onChange={(e) => setPRFilters({ author: e.target.value || undefined })}
                />
              </div>
              <div>
                <label className="text-xs text-gray mb-1 block">Labels</label>
                <input
                  type="text"
                  placeholder="Filter by labels..."
                  className="input text-sm"
                  value={prFilters.labels?.join(',') || ''}
                  onChange={(e) => setPRFilters({ 
                    labels: e.target.value ? e.target.value.split(',').map(l => l.trim()) : undefined 
                  })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PR List */}
      <div className="flex-1 overflow-y-auto">
        {loading.prs ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner" />
          </div>
        ) : filteredPRs.length === 0 ? (
          <div className="p-4 text-center text-gray">
            <GitPullRequest className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pull requests found</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredPRs.map((pr) => (
              <div
                key={pr.id}
                className={`p-3 rounded cursor-pointer hover:bg-[#21262d] border ${
                  selectedPR?.id === pr.id 
                    ? 'bg-[#1f6feb] text-white border-[#1f6feb]' 
                    : 'border-transparent'
                }`}
                onClick={() => handlePRSelect(pr)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedPRs.has(pr.id)}
                    onChange={(e) => handlePRToggle(pr.id, e)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(pr)}
                      <span className="text-sm font-medium truncate">
                        #{pr.number} {pr.title}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{pr.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GitCommit className="w-3 h-3" />
                        <span>+{pr.additions} -{pr.deletions}</span>
                      </div>
                    </div>

                    {pr.labels.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Tag className="w-3 h-3" />
                        <div className="flex gap-1 flex-wrap">
                          {pr.labels.slice(0, 3).map((label, index) => (
                            <span
                              key={index}
                              className="px-1.5 py-0.5 text-xs bg-[#21262d] rounded"
                            >
                              {label}
                            </span>
                          ))}
                          {pr.labels.length > 3 && (
                            <span className="text-xs text-gray">
                              +{pr.labels.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {pr.draft && (
                      <div className="mt-1">
                        <span className="px-2 py-0.5 text-xs bg-yellow-900 text-yellow-200 rounded">
                          Draft
                        </span>
                      </div>
                    )}
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