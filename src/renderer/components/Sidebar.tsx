import React, { useState } from 'react';
import { 
  GitBranch, 
  GitPullRequest, 
  Settings, 
  Search, 
  Filter,
  ChevronDown,
  ChevronRight,
  Plus,
  Folder
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { PRList } from './PRList';
import { BranchList } from './BranchList';

export const Sidebar: React.FC = () => {
  const { 
    sidebarCollapsed, 
    setSidebarCollapsed,
    selectedRepository,
    setSelectedRepository,
    repositories,
    loading
  } = useAppStore();

  const [activeSection, setActiveSection] = useState<'prs' | 'branches' | 'repos'>('prs');
  const [searchQuery, setSearchQuery] = useState('');

  const handleRepositorySelect = (repo: string) => {
    setSelectedRepository(repo);
  };

  const filteredRepos = repositories.filter(repo => 
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (sidebarCollapsed) {
    return (
      <div className="w-12 bg-[#161b22] border-r border-[#30363d] flex flex-col">
        <button
          className="p-3 hover:bg-[#21262d] border-b border-[#30363d]"
          onClick={() => setSidebarCollapsed(false)}
        >
          <GitPullRequest className="w-5 h-5" />
        </button>
        <button
          className={`p-3 hover:bg-[#21262d] ${activeSection === 'prs' ? 'bg-[#21262d]' : ''}`}
          onClick={() => setActiveSection('prs')}
        >
          <GitPullRequest className="w-5 h-5" />
        </button>
        <button
          className={`p-3 hover:bg-[#21262d] ${activeSection === 'branches' ? 'bg-[#21262d]' : ''}`}
          onClick={() => setActiveSection('branches')}
        >
          <GitBranch className="w-5 h-5" />
        </button>
        <button
          className={`p-3 hover:bg-[#21262d] ${activeSection === 'repos' ? 'bg-[#21262d]' : ''}`}
          onClick={() => setActiveSection('repos')}
        >
          <Folder className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[#161b22] border-r border-[#30363d] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#30363d]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Bottleneck</h1>
          <button
            className="p-1 hover:bg-[#21262d] rounded"
            onClick={() => setSidebarCollapsed(true)}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray" />
          <input
            type="text"
            placeholder="Search repositories..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-[#30363d]">
        <button
          className={`flex-1 p-3 text-sm font-medium ${
            activeSection === 'prs' 
              ? 'bg-[#21262d] text-white border-b-2 border-[#1f6feb]' 
              : 'text-gray hover:bg-[#21262d]'
          }`}
          onClick={() => setActiveSection('prs')}
        >
          Pull Requests
        </button>
        <button
          className={`flex-1 p-3 text-sm font-medium ${
            activeSection === 'branches' 
              ? 'bg-[#21262d] text-white border-b-2 border-[#1f6feb]' 
              : 'text-gray hover:bg-[#21262d]'
          }`}
          onClick={() => setActiveSection('branches')}
        >
          Branches
        </button>
        <button
          className={`flex-1 p-3 text-sm font-medium ${
            activeSection === 'repos' 
              ? 'bg-[#21262d] text-white border-b-2 border-[#1f6feb]' 
              : 'text-gray hover:bg-[#21262d]'
          }`}
          onClick={() => setActiveSection('repos')}
        >
          Repos
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeSection === 'prs' && <PRList />}
        {activeSection === 'branches' && <BranchList />}
        {activeSection === 'repos' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Repositories</h3>
              <button className="p-1 hover:bg-[#21262d] rounded">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {loading.repos ? (
              <div className="flex items-center justify-center py-8">
                <div className="spinner" />
              </div>
            ) : (
              <div className="space-y-1">
                {filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className={`p-2 rounded cursor-pointer hover:bg-[#21262d] ${
                      selectedRepository === repo.full_name ? 'bg-[#1f6feb] text-white' : ''
                    }`}
                    onClick={() => handleRepositorySelect(repo.full_name)}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm truncate">{repo.full_name}</span>
                    </div>
                    {repo.private && (
                      <div className="text-xs text-gray ml-6">Private</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};