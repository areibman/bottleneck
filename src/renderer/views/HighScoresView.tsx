import { useState, useEffect, useMemo } from "react";
import { useUIStore } from "../stores/uiStore";
import { usePRStore } from "../stores/prStore";
import { useIssueStore } from "../stores/issueStore";
import { Trophy, TrendingUp, Clock, GitPullRequest, Code, Users, Bot, CheckCircle2, XCircle, GitMerge } from "lucide-react";
import { cn } from "../utils/cn";
import { getAgentFromBranch } from "../utils/prUtils";
import { AgentIcon } from "../components/AgentIcon";

interface ContributorStats {
  name: string;
  avatar?: string;
  isAgent?: boolean;
  prsRaised: number;
  prsMerged: number;
  prsOpen: number;
  prsClosed: number;
  totalAdditions: number;
  totalDeletions: number;
  averageMergeTime: number; // in hours
  averageReviewTime: number; // in hours
  approvalRate: number; // percentage
  codeChurn: number; // additions + deletions
}

interface AgentStats {
  name: string;
  prsRaised: number;
  prsMerged: number;
  successRate: number; // percentage
}

interface TeamMetrics {
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  averageMergeTime: number; // in hours
  averageReviewTime: number; // in hours
  codeVelocity: number; // lines of code per week
  topReviewers: Array<{ name: string; count: number; avatar?: string }>;
  busiestDay: string;
  mostActiveRepo: { name: string; count: number };
}

export default function HighScoresView() {
  const { theme } = useUIStore();
  const { pullRequests, repositories } = usePRStore();
  const { issues } = useIssueStore();
  const [selectedTimeRange, setSelectedTimeRange] = useState<"week" | "month" | "quarter" | "all">("month");
  const [loading, setLoading] = useState(false);

  // Known agents
  const knownAgents = ["cursor", "devin", "chatgpt", "claude", "codex", "openai", "gpt"];

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    const ranges = {
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      quarter: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      all: new Date(0),
    };
    return ranges[selectedTimeRange];
  };

  // Filter PRs by date range
  const filteredPRs = useMemo(() => {
    const dateRange = getDateRange();
    return Array.from(pullRequests.values()).filter(pr => 
      new Date(pr.created_at) >= dateRange
    );
  }, [pullRequests, selectedTimeRange]);

  // Calculate contributor statistics
  const contributorStats = useMemo((): ContributorStats[] => {
    const statsMap = new Map<string, ContributorStats>();

    filteredPRs.forEach(pr => {
      const contributorName = pr.user?.login || "Unknown";
      const agent = getAgentFromBranch(pr.head?.ref || "");
      const isAgent = knownAgents.some(a => 
        contributorName.toLowerCase().includes(a) || 
        agent.toLowerCase() === a
      );

      if (!statsMap.has(contributorName)) {
        statsMap.set(contributorName, {
          name: contributorName,
          avatar: pr.user?.avatar_url,
          isAgent,
          prsRaised: 0,
          prsMerged: 0,
          prsOpen: 0,
          prsClosed: 0,
          totalAdditions: 0,
          totalDeletions: 0,
          averageMergeTime: 0,
          averageReviewTime: 0,
          approvalRate: 0,
          codeChurn: 0,
        });
      }

      const stats = statsMap.get(contributorName)!;
      stats.prsRaised++;
      
      if (pr.merged) {
        stats.prsMerged++;
        // Calculate merge time
        if (pr.merged_at && pr.created_at) {
          const mergeTime = (new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60);
          stats.averageMergeTime = (stats.averageMergeTime * (stats.prsMerged - 1) + mergeTime) / stats.prsMerged;
        }
      } else if (pr.state === "open") {
        stats.prsOpen++;
      } else {
        stats.prsClosed++;
      }

      // Add code changes
      stats.totalAdditions += pr.additions || 0;
      stats.totalDeletions += pr.deletions || 0;
      stats.codeChurn = stats.totalAdditions + stats.totalDeletions;

      // Calculate approval rate
      if (pr.approvalStatus === "approved") {
        stats.approvalRate = ((stats.approvalRate * (stats.prsRaised - 1)) + 100) / stats.prsRaised;
      } else {
        stats.approvalRate = (stats.approvalRate * (stats.prsRaised - 1)) / stats.prsRaised;
      }
    });

    return Array.from(statsMap.values()).sort((a, b) => b.prsMerged - a.prsMerged);
  }, [filteredPRs]);

  // Calculate agent-specific statistics
  const agentStats = useMemo((): AgentStats[] => {
    const statsMap = new Map<string, AgentStats>();

    knownAgents.forEach(agent => {
      statsMap.set(agent, {
        name: agent.charAt(0).toUpperCase() + agent.slice(1),
        prsRaised: 0,
        prsMerged: 0,
        successRate: 0,
      });
    });

    filteredPRs.forEach(pr => {
      const branchAgent = getAgentFromBranch(pr.head?.ref || "").toLowerCase();
      const userAgent = knownAgents.find(a => pr.user?.login?.toLowerCase().includes(a));
      const agent = branchAgent || userAgent;

      if (agent && statsMap.has(agent)) {
        const stats = statsMap.get(agent)!;
        stats.prsRaised++;
        if (pr.merged) {
          stats.prsMerged++;
        }
        stats.successRate = stats.prsRaised > 0 ? (stats.prsMerged / stats.prsRaised) * 100 : 0;
      }
    });

    return Array.from(statsMap.values()).filter(s => s.prsRaised > 0);
  }, [filteredPRs]);

  // Calculate team metrics
  const teamMetrics = useMemo((): TeamMetrics => {
    const reviewerCounts = new Map<string, { count: number; avatar?: string }>();
    let totalMergeTime = 0;
    let mergedCount = 0;
    let totalReviewTime = 0;
    let reviewedCount = 0;
    const dayActivity = new Map<string, number>();
    const repoActivity = new Map<string, number>();

    filteredPRs.forEach(pr => {
      // Count reviewers
      pr.requested_reviewers?.forEach(reviewer => {
        if (!reviewerCounts.has(reviewer.login)) {
          reviewerCounts.set(reviewer.login, { count: 0, avatar: reviewer.avatar_url });
        }
        reviewerCounts.get(reviewer.login)!.count++;
      });

      // Calculate merge times
      if (pr.merged && pr.merged_at && pr.created_at) {
        const mergeTime = (new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60);
        totalMergeTime += mergeTime;
        mergedCount++;
      }

      // Track day activity
      const day = new Date(pr.created_at).toLocaleDateString('en-US', { weekday: 'long' });
      dayActivity.set(day, (dayActivity.get(day) || 0) + 1);

      // Track repo activity
      const repoName = pr.base?.repo?.name || "Unknown";
      repoActivity.set(repoName, (repoActivity.get(repoName) || 0) + 1);

      // Calculate review time (time to first review)
      if (pr.approvalStatus !== "none" && pr.created_at) {
        // Approximate review time as 24 hours (since we don't have exact review timestamps)
        totalReviewTime += 24;
        reviewedCount++;
      }
    });

    // Find busiest day
    let busiestDay = "Monday";
    let maxActivity = 0;
    dayActivity.forEach((count, day) => {
      if (count > maxActivity) {
        maxActivity = count;
        busiestDay = day;
      }
    });

    // Find most active repo
    let mostActiveRepo = { name: "Unknown", count: 0 };
    repoActivity.forEach((count, repo) => {
      if (count > mostActiveRepo.count) {
        mostActiveRepo = { name: repo, count };
      }
    });

    // Calculate code velocity (lines per week)
    const totalLines = filteredPRs.reduce((sum, pr) => 
      sum + (pr.additions || 0) + (pr.deletions || 0), 0
    );
    const weeks = Math.max(1, (new Date().getTime() - getDateRange().getTime()) / (1000 * 60 * 60 * 24 * 7));
    const codeVelocity = Math.round(totalLines / weeks);

    return {
      totalPRs: filteredPRs.length,
      mergedPRs: filteredPRs.filter(pr => pr.merged).length,
      openPRs: filteredPRs.filter(pr => pr.state === "open").length,
      averageMergeTime: mergedCount > 0 ? totalMergeTime / mergedCount : 0,
      averageReviewTime: reviewedCount > 0 ? totalReviewTime / reviewedCount : 0,
      codeVelocity,
      topReviewers: Array.from(reviewerCounts.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      busiestDay,
      mostActiveRepo,
    };
  }, [filteredPRs]);

  // Format time duration
  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else if (hours < 168) {
      return `${Math.round(hours / 24)}d`;
    } else {
      return `${Math.round(hours / 168)}w`;
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full overflow-hidden",
      theme === "dark" ? "bg-gray-900" : "bg-gray-50"
    )}>
      {/* Header */}
      <div className={cn(
        "px-6 py-4 border-b",
        theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className={cn(
              "w-6 h-6",
              theme === "dark" ? "text-yellow-400" : "text-yellow-600"
            )} />
            <h1 className={cn(
              "text-2xl font-bold",
              theme === "dark" ? "text-gray-100" : "text-gray-900"
            )}>
              High Scores
            </h1>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {(["week", "month", "quarter", "all"] as const).map(range => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all capitalize",
                  selectedTimeRange === range
                    ? theme === "dark"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-500 text-white"
                    : theme === "dark"
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                )}
              >
                {range === "all" ? "All Time" : `Last ${range}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Team Metrics Section */}
        <div className={cn(
          "rounded-lg p-6",
          theme === "dark" ? "bg-gray-800" : "bg-white"
        )}>
          <h2 className={cn(
            "text-xl font-semibold mb-4 flex items-center gap-2",
            theme === "dark" ? "text-gray-100" : "text-gray-900"
          )}>
            <TrendingUp className="w-5 h-5" />
            Team Performance Metrics
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Merge Rate */}
            <div className={cn(
              "p-4 rounded-lg",
              theme === "dark" ? "bg-gray-700" : "bg-gray-50"
            )}>
              <div className={cn(
                "text-sm font-medium mb-1",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}>
                Merge Rate
              </div>
              <div className={cn(
                "text-2xl font-bold",
                theme === "dark" ? "text-green-400" : "text-green-600"
              )}>
                {teamMetrics.totalPRs > 0 
                  ? `${Math.round((teamMetrics.mergedPRs / teamMetrics.totalPRs) * 100)}%`
                  : "0%"}
              </div>
              <div className={cn(
                "text-xs mt-1",
                theme === "dark" ? "text-gray-500" : "text-gray-500"
              )}>
                {teamMetrics.mergedPRs} merged / {teamMetrics.totalPRs} total
              </div>
            </div>

            {/* Average Merge Time */}
            <div className={cn(
              "p-4 rounded-lg",
              theme === "dark" ? "bg-gray-700" : "bg-gray-50"
            )}>
              <div className={cn(
                "text-sm font-medium mb-1",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}>
                Avg Merge Time
              </div>
              <div className={cn(
                "text-2xl font-bold flex items-center gap-2",
                theme === "dark" ? "text-blue-400" : "text-blue-600"
              )}>
                <Clock className="w-5 h-5" />
                {formatDuration(teamMetrics.averageMergeTime)}
              </div>
              <div className={cn(
                "text-xs mt-1",
                theme === "dark" ? "text-gray-500" : "text-gray-500"
              )}>
                From creation to merge
              </div>
            </div>

            {/* Code Velocity */}
            <div className={cn(
              "p-4 rounded-lg",
              theme === "dark" ? "bg-gray-700" : "bg-gray-50"
            )}>
              <div className={cn(
                "text-sm font-medium mb-1",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}>
                Code Velocity
              </div>
              <div className={cn(
                "text-2xl font-bold flex items-center gap-2",
                theme === "dark" ? "text-purple-400" : "text-purple-600"
              )}>
                <Code className="w-5 h-5" />
                {teamMetrics.codeVelocity.toLocaleString()}
              </div>
              <div className={cn(
                "text-xs mt-1",
                theme === "dark" ? "text-gray-500" : "text-gray-500"
              )}>
                Lines per week
              </div>
            </div>

            {/* Most Active Repo */}
            <div className={cn(
              "p-4 rounded-lg",
              theme === "dark" ? "bg-gray-700" : "bg-gray-50"
            )}>
              <div className={cn(
                "text-sm font-medium mb-1",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}>
                Busiest Day
              </div>
              <div className={cn(
                "text-2xl font-bold",
                theme === "dark" ? "text-orange-400" : "text-orange-600"
              )}>
                {teamMetrics.busiestDay}
              </div>
              <div className={cn(
                "text-xs mt-1",
                theme === "dark" ? "text-gray-500" : "text-gray-500"
              )}>
                Most PRs created
              </div>
            </div>
          </div>

          {/* Additional Insights */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Most Active Repository */}
            <div className={cn(
              "p-4 rounded-lg",
              theme === "dark" ? "bg-gray-700" : "bg-gray-50"
            )}>
              <div className={cn(
                "text-sm font-medium mb-2",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}>
                Most Active Repository
              </div>
              <div className={cn(
                "font-semibold",
                theme === "dark" ? "text-gray-200" : "text-gray-800"
              )}>
                {teamMetrics.mostActiveRepo.name}
              </div>
              <div className={cn(
                "text-sm",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}>
                {teamMetrics.mostActiveRepo.count} PRs
              </div>
            </div>

            {/* Top Reviewers */}
            <div className={cn(
              "p-4 rounded-lg",
              theme === "dark" ? "bg-gray-700" : "bg-gray-50"
            )}>
              <div className={cn(
                "text-sm font-medium mb-2",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}>
                Top Reviewers
              </div>
              <div className="space-y-1">
                {teamMetrics.topReviewers.slice(0, 3).map(reviewer => (
                  <div key={reviewer.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {reviewer.avatar && (
                        <img src={reviewer.avatar} alt={reviewer.name} className="w-5 h-5 rounded-full" />
                      )}
                      <span className={cn(
                        "text-sm",
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      )}>
                        {reviewer.name}
                      </span>
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    )}>
                      {reviewer.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Agent Statistics Section */}
        <div className={cn(
          "rounded-lg p-6",
          theme === "dark" ? "bg-gray-800" : "bg-white"
        )}>
          <h2 className={cn(
            "text-xl font-semibold mb-4 flex items-center gap-2",
            theme === "dark" ? "text-gray-100" : "text-gray-900"
          )}>
            <Bot className="w-5 h-5" />
            AI Agent Performance
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agentStats.length > 0 ? (
              agentStats.map(agent => (
                <div
                  key={agent.name}
                  className={cn(
                    "p-4 rounded-lg border",
                    theme === "dark" 
                      ? "bg-gray-700 border-gray-600" 
                      : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AgentIcon agent={agent.name.toLowerCase()} className="w-6 h-6" />
                      <span className={cn(
                        "font-semibold",
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      )}>
                        {agent.name}
                      </span>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      agent.successRate >= 80
                        ? theme === "dark" 
                          ? "bg-green-900 text-green-300" 
                          : "bg-green-100 text-green-700"
                        : agent.successRate >= 50
                          ? theme === "dark"
                            ? "bg-yellow-900 text-yellow-300"
                            : "bg-yellow-100 text-yellow-700"
                          : theme === "dark"
                            ? "bg-red-900 text-red-300"
                            : "bg-red-100 text-red-700"
                    )}>
                      {Math.round(agent.successRate)}% success
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-sm",
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      )}>
                        PRs Raised
                      </span>
                      <span className={cn(
                        "font-medium",
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      )}>
                        {agent.prsRaised}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-sm flex items-center gap-1",
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      )}>
                        <GitMerge className="w-3 h-3" />
                        Merged
                      </span>
                      <span className={cn(
                        "font-medium",
                        theme === "dark" ? "text-green-400" : "text-green-600"
                      )}>
                        {agent.prsMerged}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={cn(
                "col-span-3 text-center py-8",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}>
                No agent activity in this time period
              </div>
            )}
          </div>
        </div>

        {/* Top Contributors Leaderboard */}
        <div className={cn(
          "rounded-lg p-6",
          theme === "dark" ? "bg-gray-800" : "bg-white"
        )}>
          <h2 className={cn(
            "text-xl font-semibold mb-4 flex items-center gap-2",
            theme === "dark" ? "text-gray-100" : "text-gray-900"
          )}>
            <Users className="w-5 h-5" />
            Top Contributors
          </h2>

          <div className="space-y-2">
            {contributorStats.slice(0, 10).map((contributor, index) => (
              <div
                key={contributor.name}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                    index === 0
                      ? "bg-yellow-500 text-white"
                      : index === 1
                        ? "bg-gray-400 text-white"
                        : index === 2
                          ? "bg-orange-600 text-white"
                          : theme === "dark"
                            ? "bg-gray-600 text-gray-300"
                            : "bg-gray-300 text-gray-700"
                  )}>
                    {index + 1}
                  </div>

                  {/* Avatar and Name */}
                  <div className="flex items-center gap-2">
                    {contributor.avatar && (
                      <img
                        src={contributor.avatar}
                        alt={contributor.name}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium",
                          theme === "dark" ? "text-gray-200" : "text-gray-800"
                        )}>
                          {contributor.name}
                        </span>
                        {contributor.isAgent && (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            theme === "dark"
                              ? "bg-blue-900 text-blue-300"
                              : "bg-blue-100 text-blue-700"
                          )}>
                            AI Agent
                          </span>
                        )}
                      </div>
                      <div className={cn(
                        "text-xs",
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      )}>
                        {contributor.codeChurn.toLocaleString()} lines changed
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className={cn(
                      "text-sm font-medium",
                      theme === "dark" ? "text-gray-200" : "text-gray-800"
                    )}>
                      {contributor.prsRaised}
                    </div>
                    <div className={cn(
                      "text-xs",
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    )}>
                      Raised
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={cn(
                      "text-sm font-medium",
                      theme === "dark" ? "text-green-400" : "text-green-600"
                    )}>
                      {contributor.prsMerged}
                    </div>
                    <div className={cn(
                      "text-xs",
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    )}>
                      Merged
                    </div>
                  </div>
                  {contributor.averageMergeTime > 0 && (
                    <div className="text-center">
                      <div className={cn(
                        "text-sm font-medium",
                        theme === "dark" ? "text-blue-400" : "text-blue-600"
                      )}>
                        {formatDuration(contributor.averageMergeTime)}
                      </div>
                      <div className={cn(
                        "text-xs",
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      )}>
                        Avg Time
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}