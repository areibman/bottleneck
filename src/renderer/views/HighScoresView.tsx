import React, { useMemo } from "react";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";
import { 
  Trophy, 
  Users, 
  GitPullRequest, 
  GitMerge, 
  Clock, 
  TrendingUp,
  Code,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Zap
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  color?: "blue" | "green" | "yellow" | "red" | "purple";
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color = "blue" }: StatCardProps) {
  const { theme } = useUIStore();
  
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
    green: "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300",
    red: "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300",
    purple: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300",
  };

  const trendIcon = {
    up: <TrendingUp className="h-4 w-4 text-green-500" />,
    down: <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />,
    neutral: <BarChart3 className="h-4 w-4 text-gray-500" />,
  };

  return (
    <div className={cn(
      "p-6 rounded-lg border-2 transition-all hover:shadow-md",
      colorClasses[color],
      theme === "dark" ? "bg-gray-800/50" : "bg-white"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "p-2 rounded-lg",
            colorClasses[color]
          )}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium opacity-80">{title}</h3>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
          </div>
        </div>
        {trend && (
          <div className="flex items-center space-x-1">
            {trendIcon[trend]}
          </div>
        )}
      </div>
    </div>
  );
}

interface AgentStats {
  name: string;
  prsRaised: number;
  prsMerged: number;
  mergeRate: number;
  avgTimeToMerge: number;
  totalLinesChanged: number;
  avgPrSize: number;
}

function AgentCard({ agent }: { agent: AgentStats }) {
  const { theme } = useUIStore();
  
  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all hover:shadow-md",
      theme === "dark" 
        ? "bg-gray-800/50 border-gray-700 hover:border-gray-600" 
        : "bg-white border-gray-200 hover:border-gray-300"
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{agent.name}</h3>
        <div className="text-sm text-gray-500">
          {agent.mergeRate.toFixed(1)}% merge rate
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">PRs Raised</div>
          <div className="font-semibold text-lg">{agent.prsRaised}</div>
        </div>
        <div>
          <div className="text-gray-500">PRs Merged</div>
          <div className="font-semibold text-lg text-green-600">{agent.prsMerged}</div>
        </div>
        <div>
          <div className="text-gray-500">Avg Time to Merge</div>
          <div className="font-semibold">{agent.avgTimeToMerge}h</div>
        </div>
        <div>
          <div className="text-gray-500">Avg PR Size</div>
          <div className="font-semibold">{agent.avgPrSize} lines</div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-500">Total Lines Changed</div>
        <div className="font-semibold text-lg">{agent.totalLinesChanged.toLocaleString()}</div>
      </div>
    </div>
  );
}

export default function HighScoresView() {
  const { pullRequests, selectedRepo } = usePRStore();
  const { theme } = useUIStore();

  const stats = useMemo(() => {
    if (!selectedRepo) {
      return {
        totalPRs: 0,
        mergedPRs: 0,
        openPRs: 0,
        draftPRs: 0,
        avgTimeToMerge: 0,
        totalContributors: 0,
        humanContributors: 0,
        agentContributors: 0,
        avgPrSize: 0,
        totalLinesChanged: 0,
        avgCommentsPerPR: 0,
        mergeRate: 0,
        avgReviewTime: 0,
        mostActiveContributor: "",
        mostProductiveAgent: "",
        agents: [] as AgentStats[],
      };
    }

    const repoPRs = Array.from(pullRequests.values()).filter((pr) => {
      const baseOwner = pr.base?.repo?.owner?.login;
      const baseName = pr.base?.repo?.name;
      return baseOwner === selectedRepo.owner && baseName === selectedRepo.name;
    });

    const totalPRs = repoPRs.length;
    const mergedPRs = repoPRs.filter(pr => pr.merged).length;
    const openPRs = repoPRs.filter(pr => pr.state === "open" && !pr.merged).length;
    const draftPRs = repoPRs.filter(pr => pr.draft).length;
    
    // Calculate average time to merge
    const mergedPRsWithTime = repoPRs.filter(pr => pr.merged && pr.merged_at && pr.created_at);
    const avgTimeToMerge = mergedPRsWithTime.length > 0 
      ? mergedPRsWithTime.reduce((acc, pr) => {
          const created = new Date(pr.created_at);
          const merged = new Date(pr.merged_at!);
          return acc + (merged.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
        }, 0) / mergedPRsWithTime.length
      : 0;

    // Calculate contributors
    const contributors = new Set(repoPRs.map(pr => pr.user.login));
    const totalContributors = contributors.size;
    
    // Separate human and agent contributors
    const agentPatterns = ['cursor-ai', 'devin-ai', 'chatgpt-ai', 'claude-ai', 'copilot-ai'];
    const humanContributors = Array.from(contributors).filter(login => 
      !agentPatterns.some(pattern => login.toLowerCase().includes(pattern))
    );
    const agentContributors = Array.from(contributors).filter(login => 
      agentPatterns.some(pattern => login.toLowerCase().includes(pattern))
    );

    // Calculate PR size and lines changed
    const prsWithSize = repoPRs.filter(pr => pr.additions !== undefined && pr.deletions !== undefined);
    const avgPrSize = prsWithSize.length > 0 
      ? prsWithSize.reduce((acc, pr) => acc + (pr.additions || 0) + (pr.deletions || 0), 0) / prsWithSize.length
      : 0;
    
    const totalLinesChanged = prsWithSize.reduce((acc, pr) => 
      acc + (pr.additions || 0) + (pr.deletions || 0), 0
    );

    // Calculate average comments per PR
    const avgCommentsPerPR = totalPRs > 0 
      ? repoPRs.reduce((acc, pr) => acc + pr.comments, 0) / totalPRs
      : 0;

    const mergeRate = totalPRs > 0 ? (mergedPRs / totalPRs) * 100 : 0;

    // Calculate most active contributor
    const contributorCounts = new Map<string, number>();
    repoPRs.forEach(pr => {
      const count = contributorCounts.get(pr.user.login) || 0;
      contributorCounts.set(pr.user.login, count + 1);
    });
    const mostActiveContributor = contributorCounts.size > 0 
      ? Array.from(contributorCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : "";

    // Calculate agent stats
    const agentStats = new Map<string, {
      prsRaised: number;
      prsMerged: number;
      totalLinesChanged: number;
      mergeTimes: number[];
    }>();

    repoPRs.forEach(pr => {
      const isAgent = agentPatterns.some(pattern => 
        pr.user.login.toLowerCase().includes(pattern)
      );
      
      if (isAgent) {
        const agentName = pr.user.login;
        const current = agentStats.get(agentName) || {
          prsRaised: 0,
          prsMerged: 0,
          totalLinesChanged: 0,
          mergeTimes: [],
        };
        
        current.prsRaised++;
        if (pr.merged) {
          current.prsMerged++;
          if (pr.merged_at && pr.created_at) {
            const created = new Date(pr.created_at);
            const merged = new Date(pr.merged_at);
            current.mergeTimes.push((merged.getTime() - created.getTime()) / (1000 * 60 * 60));
          }
        }
        
        if (pr.additions !== undefined && pr.deletions !== undefined) {
          current.totalLinesChanged += pr.additions + pr.deletions;
        }
        
        agentStats.set(agentName, current);
      }
    });

    const agents: AgentStats[] = Array.from(agentStats.entries()).map(([name, stats]) => ({
      name: name.replace('-ai', '').toUpperCase(),
      prsRaised: stats.prsRaised,
      prsMerged: stats.prsMerged,
      mergeRate: stats.prsRaised > 0 ? (stats.prsMerged / stats.prsRaised) * 100 : 0,
      avgTimeToMerge: stats.mergeTimes.length > 0 
        ? stats.mergeTimes.reduce((a, b) => a + b, 0) / stats.mergeTimes.length
        : 0,
      totalLinesChanged: stats.totalLinesChanged,
      avgPrSize: stats.prsRaised > 0 ? stats.totalLinesChanged / stats.prsRaised : 0,
    }));

    const mostProductiveAgent = agents.length > 0 
      ? agents.sort((a, b) => b.prsMerged - a.prsMerged)[0].name
      : "";

    // Calculate average review time (simplified - using time between creation and last update)
    const avgReviewTime = totalPRs > 0 
      ? repoPRs.reduce((acc, pr) => {
          const created = new Date(pr.created_at);
          const updated = new Date(pr.updated_at);
          return acc + (updated.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
        }, 0) / totalPRs
      : 0;

    return {
      totalPRs,
      mergedPRs,
      openPRs,
      draftPRs,
      avgTimeToMerge,
      totalContributors,
      humanContributors: humanContributors.length,
      agentContributors: agentContributors.length,
      avgPrSize: Math.round(avgPrSize),
      totalLinesChanged,
      avgCommentsPerPR: Math.round(avgCommentsPerPR * 10) / 10,
      mergeRate: Math.round(mergeRate * 10) / 10,
      avgReviewTime: Math.round(avgReviewTime * 10) / 10,
      mostActiveContributor,
      mostProductiveAgent,
      agents: agents.sort((a, b) => b.prsMerged - a.prsMerged),
    };
  }, [pullRequests, selectedRepo]);

  if (!selectedRepo) {
    return (
      <div className={cn(
        "flex h-full items-center justify-center",
        theme === "dark" 
          ? "bg-gray-900 text-gray-100" 
          : "bg-gray-50 text-gray-900"
      )}>
        <div className="text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2">No Repository Selected</h2>
          <p className="text-gray-500">Select a repository to view high scores and statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-full overflow-auto p-6",
      theme === "dark" 
        ? "bg-gray-900 text-gray-100" 
        : "bg-gray-50 text-gray-900"
    )}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">High Scores</h1>
          </div>
          <p className="text-gray-500 text-lg">
            Engineering insights for {selectedRepo.owner}/{selectedRepo.name}
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total PRs"
            value={stats.totalPRs}
            subtitle={`${stats.mergedPRs} merged`}
            icon={GitPullRequest}
            color="blue"
          />
          <StatCard
            title="Merge Rate"
            value={`${stats.mergeRate}%`}
            subtitle={`${stats.mergedPRs}/${stats.totalPRs} PRs`}
            icon={GitMerge}
            color="green"
            trend={stats.mergeRate > 70 ? "up" : stats.mergeRate < 50 ? "down" : "neutral"}
          />
          <StatCard
            title="Avg Time to Merge"
            value={`${Math.round(stats.avgTimeToMerge)}h`}
            subtitle="From creation to merge"
            icon={Clock}
            color="yellow"
            trend={stats.avgTimeToMerge < 24 ? "up" : stats.avgTimeToMerge > 72 ? "down" : "neutral"}
          />
          <StatCard
            title="Active Contributors"
            value={stats.totalContributors}
            subtitle={`${stats.humanContributors} human, ${stats.agentContributors} AI`}
            icon={Users}
            color="purple"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Code Velocity"
            value={`${stats.totalLinesChanged.toLocaleString()}`}
            subtitle="Total lines changed"
            icon={Code}
            color="blue"
          />
          <StatCard
            title="Avg PR Size"
            value={`${stats.avgPrSize} lines`}
            subtitle="Lines per PR"
            icon={BarChart3}
            color="green"
          />
          <StatCard
            title="Review Activity"
            value={`${stats.avgCommentsPerPR}`}
            subtitle="Comments per PR"
            icon={MessageSquare}
            color="yellow"
          />
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Open PRs"
            value={stats.openPRs}
            subtitle="Currently active"
            icon={AlertCircle}
            color="yellow"
          />
          <StatCard
            title="Draft PRs"
            value={stats.draftPRs}
            subtitle="Work in progress"
            icon={Code}
            color="blue"
          />
          <StatCard
            title="Review Time"
            value={`${stats.avgReviewTime}h`}
            subtitle="Avg time in review"
            icon={Clock}
            color="purple"
          />
        </div>

        {/* Top Performers */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            <span>Top Performers</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cn(
              "p-6 rounded-lg border-2",
              theme === "dark" 
                ? "bg-gray-800/50 border-gray-700" 
                : "bg-white border-gray-200"
            )}>
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span>Most Active Contributor</span>
              </h3>
              <div className="text-2xl font-bold text-blue-600">
                {stats.mostActiveContributor || "N/A"}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Highest number of PRs created
              </p>
            </div>
            
            <div className={cn(
              "p-6 rounded-lg border-2",
              theme === "dark" 
                ? "bg-gray-800/50 border-gray-700" 
                : "bg-white border-gray-200"
            )}>
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>Most Productive Agent</span>
              </h3>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.mostProductiveAgent || "N/A"}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Highest number of merged PRs
              </p>
            </div>
          </div>
        </div>

        {/* Agents Section */}
        {stats.agents.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span>AI Agents Performance</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.agents.map((agent) => (
                <AgentCard key={agent.name} agent={agent} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}