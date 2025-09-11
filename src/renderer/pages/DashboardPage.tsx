import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitPullRequest,
  GitBranch,
  GitCommit,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { repositories, selectedRepo, loadRepositories } = useAppStore();

  useEffect(() => {
    if (repositories.length === 0) {
      loadRepositories();
    }
  }, []);

  const { data: prStats } = useQuery({
    queryKey: ['pr-stats', selectedRepo?.full_name],
    queryFn: async () => {
      if (!selectedRepo) return null;
      const [owner, repo] = selectedRepo.full_name.split('/');
      const prs = await window.electronAPI.github.getPRs(owner, repo, { state: 'all' });
      
      return {
        open: prs.filter(pr => pr.state === 'open' && !pr.draft).length,
        draft: prs.filter(pr => pr.draft).length,
        merged: prs.filter(pr => pr.merged_at).length,
        closed: prs.filter(pr => pr.state === 'closed' && !pr.merged_at).length,
        myPRs: prs.filter(pr => pr.user.login === user?.login).length,
        needsReview: prs.filter(pr => 
          pr.requested_reviewers?.some((r: any) => r.login === user?.login)
        ).length,
      };
    },
    enabled: !!selectedRepo,
  });

  const stats = [
    {
      label: 'Open PRs',
      value: prStats?.open || 0,
      icon: GitPullRequest,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Draft PRs',
      value: prStats?.draft || 0,
      icon: AlertCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Merged',
      value: prStats?.merged || 0,
      icon: CheckCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Closed',
      value: prStats?.closed || 0,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  const quickActions = [
    {
      label: 'My Pull Requests',
      count: prStats?.myPRs || 0,
      icon: GitPullRequest,
      onClick: () => navigate('/pulls?author=me'),
    },
    {
      label: 'Needs My Review',
      count: prStats?.needsReview || 0,
      icon: Clock,
      onClick: () => navigate('/pulls?reviewer=me'),
    },
    {
      label: 'All Branches',
      count: '-',
      icon: GitBranch,
      onClick: () => navigate('/branches'),
    },
    {
      label: 'Recent Activity',
      count: '-',
      icon: TrendingUp,
      onClick: () => navigate('/activity'),
    },
  ];

  return (
    <div className="p-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          Welcome back, {user?.name || user?.login}!
        </h1>
        <p className="text-[var(--text-secondary)]">
          {selectedRepo ? (
            <>
              Currently viewing <span className="font-medium">{selectedRepo.full_name}</span>
            </>
          ) : (
            'Select a repository to get started'
          )}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[var(--bg-tertiary)] rounded-lg p-6 border border-[var(--border-color)]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon size={24} className={stat.color} />
                </div>
                <span className="text-3xl font-bold text-[var(--text-primary)]">
                  {stat.value}
                </span>
              </div>
              <div className="text-sm text-[var(--text-secondary)]">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className="text-[var(--text-secondary)]" />
                  <span className="text-[var(--text-primary)]">{action.label}</span>
                </div>
                {action.count !== '-' && (
                  <span className="px-2 py-1 bg-[var(--accent-primary)] text-white text-sm rounded-full">
                    {action.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Repositories */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
          Recent Repositories
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {repositories.slice(0, 6).map((repo) => (
            <button
              key={repo.id}
              onClick={() => navigate(`/pulls?repo=${repo.full_name}`)}
              className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <img
                  src={repo.owner.avatar_url}
                  alt={repo.owner.login}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)] truncate">
                    {repo.name}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">{repo.owner.login}</div>
                </div>
              </div>
              <div className="text-sm text-[var(--text-secondary)] truncate-2">
                {repo.description || 'No description'}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-tertiary)]">
                {repo.language && <span>{repo.language}</span>}
                <span>⭐ {repo.stargazers_count}</span>
                <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;