import { useMemo } from "react";
import { Trophy, TrendingUp, Users, Zap, Target, Clock, MessageSquare, Award, Bot } from "lucide-react";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";
import { detectAgentName } from "../utils/agentIcons";
import { AgentIcon } from "../components/AgentIcon";

interface StatCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
}

interface ContributorStat {
  login: string;
  avatar_url: string;
  prsCreated: number;
  prsMerged: number;
  mergeRate: number;
  avgTimeToMerge: number;
  totalComments: number;
  isAgent: boolean;
  agentType?: string;
}

interface AgentStat {
  name: string;
  type: string;
  prsRaised: number;
  prsMerged: number;
  mergeRate: number;
  avgLinesChanged: number;
}

export default function HighScoresView() {
  const { pullRequests, selectedRepo } = usePRStore();
  const { theme } = useUIStore();

  const stats = useMemo(() => {
    if (!selectedRepo) return null;

    const repoKey = `${selectedRepo.owner}/${selectedRepo.name}`;
    const repoPRs = Array.from(pullRequests.values()).filter(pr => 
      `${pr.base.repo.owner.login}/${pr.base.repo.name}` === repoKey
    );

    if (repoPRs.length === 0) return null;

    // Calculate overall metrics
    const totalPRs = repoPRs.length;
    const mergedPRs = repoPRs.filter(pr => pr.merged).length;
    const openPRs = repoPRs.filter(pr => pr.state === "open").length;
    const mergeRate = totalPRs > 0 ? (mergedPRs / totalPRs) * 100 : 0;

    // Calculate average time to merge (for merged PRs)
    const mergedPRsWithTime = repoPRs.filter(pr => pr.merged && pr.merged_at && pr.created_at);
    const avgTimeToMerge = mergedPRsWithTime.length > 0 
      ? mergedPRsWithTime.reduce((acc, pr) => {
          const created = new Date(pr.created_at).getTime();
          const merged = new Date(pr.merged_at!).getTime();
          return acc + (merged - created);
        }, 0) / mergedPRsWithTime.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // Calculate total lines changed
    const totalAdditions = repoPRs.reduce((acc, pr) => acc + (pr.additions || 0), 0);
    const totalDeletions = repoPRs.reduce((acc, pr) => acc + (pr.deletions || 0), 0);
    const totalComments = repoPRs.reduce((acc, pr) => acc + (pr.comments || 0), 0);

    // Calculate contributor stats
    const contributorMap = new Map<string, ContributorStat>();
    
    repoPRs.forEach(pr => {
      const login = pr.user.login;
      const agentType = detectAgentName(login, pr.head.ref, pr.title);
      const isAgent = !!agentType;
      
      if (!contributorMap.has(login)) {
        contributorMap.set(login, {
          login,
          avatar_url: pr.user.avatar_url,
          prsCreated: 0,
          prsMerged: 0,
          mergeRate: 0,
          avgTimeToMerge: 0,
          totalComments: 0,
          isAgent,
          agentType: agentType || undefined,
        });
      }

      const contributor = contributorMap.get(login)!;
      contributor.prsCreated++;
      contributor.totalComments += pr.comments || 0;
      
      if (pr.merged) {
        contributor.prsMerged++;
      }
    });

    // Calculate merge rates and average time for each contributor
    contributorMap.forEach((contributor, login) => {
      contributor.mergeRate = contributor.prsCreated > 0 
        ? (contributor.prsMerged / contributor.prsCreated) * 100 
        : 0;

      const contributorMergedPRs = repoPRs.filter(pr => 
        pr.user.login === login && pr.merged && pr.merged_at && pr.created_at
      );
      
      if (contributorMergedPRs.length > 0) {
        contributor.avgTimeToMerge = contributorMergedPRs.reduce((acc, pr) => {
          const created = new Date(pr.created_at).getTime();
          const merged = new Date(pr.merged_at!).getTime();
          return acc + (merged - created);
        }, 0) / contributorMergedPRs.length / (1000 * 60 * 60 * 24);
      }
    });

    const contributors = Array.from(contributorMap.values());
    const humanContributors = contributors.filter(c => !c.isAgent);
    const agentContributors = contributors.filter(c => c.isAgent);

    // Calculate agent stats
    const agentStats: AgentStat[] = agentContributors.map(agent => {
      const agentPRs = repoPRs.filter(pr => pr.user.login === agent.login);
      const avgLinesChanged = agentPRs.length > 0 
        ? agentPRs.reduce((acc, pr) => acc + (pr.additions || 0) + (pr.deletions || 0), 0) / agentPRs.length
        : 0;

      return {
        name: agent.login,
        type: agent.agentType || 'unknown',
        prsRaised: agent.prsCreated,
        prsMerged: agent.prsMerged,
        mergeRate: agent.mergeRate,
        avgLinesChanged,
      };
    });

    // Top performers
    const topContributors = humanContributors
      .sort((a, b) => b.prsCreated - a.prsCreated)
      .slice(0, 5);

    const fastestMergers = contributors
      .filter(c => c.avgTimeToMerge > 0)
      .sort((a, b) => a.avgTimeToMerge - b.avgTimeToMerge)
      .slice(0, 3);

    const mostActiveReviewers = contributors
      .filter(c => c.totalComments > 0)
      .sort((a, b) => b.totalComments - a.totalComments)
      .slice(0, 3);

    return {
      totalPRs,
      mergedPRs,
      openPRs,
      mergeRate,
      avgTimeToMerge,
      totalAdditions,
      totalDeletions,
      totalComments,
      contributors,
      humanContributors,
      agentContributors,
      agentStats,
      topContributors,
      fastestMergers,
      mostActiveReviewers,
    };
  }, [pullRequests, selectedRepo]);

  if (!selectedRepo) {
    return (
      <div className={cn(
        "flex h-full items-center justify-center",
        theme === "dark" ? "text-gray-400" : "text-gray-600"
      )}>
        <div className="text-center">
          <Trophy className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>Select a repository to view high scores</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={cn(
        "flex h-full items-center justify-center",
        theme === "dark" ? "text-gray-400" : "text-gray-600"
      )}>
        <div className="text-center">
          <Trophy className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No pull request data available</p>
        </div>
      </div>
    );
  }

  const overallStats: StatCard[] = [
    {
      title: "Merge Success Rate",
      value: `${stats.mergeRate.toFixed(1)}%`,
      subtitle: `${stats.mergedPRs}/${stats.totalPRs} PRs merged`,
      icon: Target,
      color: "text-green-500",
    },
    {
      title: "Avg Time to Merge",
      value: stats.avgTimeToMerge > 0 ? `${stats.avgTimeToMerge.toFixed(1)}d` : "N/A",
      subtitle: "Days from creation to merge",
      icon: Clock,
      color: "text-blue-500",
    },
    {
      title: "Total Velocity",
      value: `${stats.totalAdditions + stats.totalDeletions}`,
      subtitle: `+${stats.totalAdditions} -${stats.totalDeletions} lines`,
      icon: TrendingUp,
      color: "text-purple-500",
    },
    {
      title: "Collaboration Score",
      value: stats.totalComments,
      subtitle: `${(stats.totalComments / Math.max(stats.totalPRs, 1)).toFixed(1)} comments/PR`,
      icon: MessageSquare,
      color: "text-orange-500",
    },
    {
      title: "Active Contributors",
      value: stats.contributors.length,
      subtitle: `${stats.humanContributors.length} human, ${stats.agentContributors.length} AI`,
      icon: Users,
      color: "text-cyan-500",
    },
  ];

  return (
    <div className={cn(
      "h-full overflow-auto",
      theme === "dark" ? "bg-gray-900" : "bg-gray-50"
    )}>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Trophy className={cn(
            "h-8 w-8",
            theme === "dark" ? "text-yellow-400" : "text-yellow-500"
          )} />
          <div>
            <h1 className={cn(
              "text-2xl font-bold",
              theme === "dark" ? "text-white" : "text-gray-900"
            )}>
              High Scores
            </h1>
            <p className={cn(
              "text-sm",
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            )}>
              Engineering metrics for {selectedRepo.full_name}
            </p>
          </div>
        </div>

        {/* Overall Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {overallStats.map((stat, index) => (
            <div
              key={index}
              className={cn(
                "p-4 rounded-lg border",
                theme === "dark" 
                  ? "bg-gray-800 border-gray-700" 
                  : "bg-white border-gray-200"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={cn("h-5 w-5", stat.color)} />
                {stat.trend && (
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                    stat.trend.isPositive 
                      ? "text-green-700 bg-green-100" 
                      : "text-red-700 bg-red-100"
                  )}>
                    {stat.trend.isPositive ? "+" : ""}{stat.trend.value}%
                  </span>
                )}
              </div>
              <div className={cn(
                "text-2xl font-bold mb-1",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}>
                {stat.value}
              </div>
              <div className={cn(
                "text-xs",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}>
                {stat.title}
              </div>
              {stat.subtitle && (
                <div className={cn(
                  "text-xs mt-1",
                  theme === "dark" ? "text-gray-500" : "text-gray-500"
                )}>
                  {stat.subtitle}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Top Contributors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={cn(
            "p-6 rounded-lg border",
            theme === "dark" 
              ? "bg-gray-800 border-gray-700" 
              : "bg-white border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-4">
              <Award className={cn(
                "h-5 w-5",
                theme === "dark" ? "text-yellow-400" : "text-yellow-500"
              )} />
              <h3 className={cn(
                "text-lg font-semibold",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}>
                Top Contributors
              </h3>
            </div>
            <div className="space-y-3">
              {stats.topContributors.map((contributor, index) => (
                <div key={contributor.login} className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    index === 0 ? "bg-yellow-500 text-white" :
                    index === 1 ? "bg-gray-400 text-white" :
                    index === 2 ? "bg-orange-500 text-white" :
                    theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                  )}>
                    {index + 1}
                  </div>
                  <img 
                    src={contributor.avatar_url} 
                    alt={contributor.login}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1">
                    <div className={cn(
                      "font-medium",
                      theme === "dark" ? "text-white" : "text-gray-900"
                    )}>
                      {contributor.login}
                    </div>
                    <div className={cn(
                      "text-sm",
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    )}>
                      {contributor.prsCreated} PRs • {contributor.mergeRate.toFixed(0)}% merged
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={cn(
            "p-6 rounded-lg border",
            theme === "dark" 
              ? "bg-gray-800 border-gray-700" 
              : "bg-white border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-4">
              <Zap className={cn(
                "h-5 w-5",
                theme === "dark" ? "text-green-400" : "text-green-500"
              )} />
              <h3 className={cn(
                "text-lg font-semibold",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}>
                Fastest Mergers
              </h3>
            </div>
            <div className="space-y-3">
              {stats.fastestMergers.map((contributor, index) => (
                <div key={contributor.login} className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    "bg-green-500 text-white"
                  )}>
                    {index + 1}
                  </div>
                  <img 
                    src={contributor.avatar_url} 
                    alt={contributor.login}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1">
                    <div className={cn(
                      "font-medium",
                      theme === "dark" ? "text-white" : "text-gray-900"
                    )}>
                      {contributor.login}
                    </div>
                    <div className={cn(
                      "text-sm",
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    )}>
                      {contributor.avgTimeToMerge.toFixed(1)} days avg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Performance Section */}
        {stats.agentStats.length > 0 && (
          <div className={cn(
            "p-6 rounded-lg border",
            theme === "dark" 
              ? "bg-gray-800 border-gray-700" 
              : "bg-white border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-6">
              <Bot className={cn(
                "h-5 w-5",
                theme === "dark" ? "text-purple-400" : "text-purple-500"
              )} />
              <h3 className={cn(
                "text-lg font-semibold",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}>
                Agent Performance
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.agentStats.map((agent) => (
                <div
                  key={agent.name}
                  className={cn(
                    "p-4 rounded-lg border",
                    theme === "dark" 
                      ? "bg-gray-700 border-gray-600" 
                      : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <AgentIcon agentName={agent.type} className="w-6 h-6" />
                    <div>
                      <div className={cn(
                        "font-medium",
                        theme === "dark" ? "text-white" : "text-gray-900"
                      )}>
                        {agent.name}
                      </div>
                      <div className={cn(
                        "text-xs capitalize",
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      )}>
                        {agent.type}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={cn(
                        "text-sm",
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      )}>
                        PRs Raised
                      </span>
                      <span className={cn(
                        "text-sm font-medium",
                        theme === "dark" ? "text-white" : "text-gray-900"
                      )}>
                        {agent.prsRaised}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={cn(
                        "text-sm",
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      )}>
                        PRs Merged
                      </span>
                      <span className={cn(
                        "text-sm font-medium",
                        theme === "dark" ? "text-white" : "text-gray-900"
                      )}>
                        {agent.prsMerged}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={cn(
                        "text-sm",
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      )}>
                        Merge Rate
                      </span>
                      <span className={cn(
                        "text-sm font-medium",
                        agent.mergeRate >= 80 ? "text-green-500" :
                        agent.mergeRate >= 60 ? "text-yellow-500" : "text-red-500"
                      )}>
                        {agent.mergeRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={cn(
                        "text-sm",
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      )}>
                        Avg Lines/PR
                      </span>
                      <span className={cn(
                        "text-sm font-medium",
                        theme === "dark" ? "text-white" : "text-gray-900"
                      )}>
                        {agent.avgLinesChanged.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most Active Reviewers */}
        <div className={cn(
          "p-6 rounded-lg border",
          theme === "dark" 
            ? "bg-gray-800 border-gray-700" 
            : "bg-white border-gray-200"
        )}>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className={cn(
              "h-5 w-5",
              theme === "dark" ? "text-blue-400" : "text-blue-500"
            )} />
            <h3 className={cn(
              "text-lg font-semibold",
              theme === "dark" ? "text-white" : "text-gray-900"
            )}>
              Most Active Reviewers
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.mostActiveReviewers.map((reviewer, index) => (
              <div key={reviewer.login} className="flex items-center gap-3">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  "bg-blue-500 text-white"
                )}>
                  {index + 1}
                </div>
                <img 
                  src={reviewer.avatar_url} 
                  alt={reviewer.login}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1">
                  <div className={cn(
                    "font-medium",
                    theme === "dark" ? "text-white" : "text-gray-900"
                  )}>
                    {reviewer.login}
                  </div>
                  <div className={cn(
                    "text-sm",
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  )}>
                    {reviewer.totalComments} comments
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}