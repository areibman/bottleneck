import { useMemo } from "react";
import { Trophy, TrendingUp, Clock, GitMerge, Users, Bot } from "lucide-react";
import { useUIStore } from "../stores/uiStore";
import { usePRStore } from "../stores/prStore";
import { cn } from "../utils/cn";
import type { PullRequest } from "../services/github";

interface ContributorStats {
  author: string;
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  avgMergeTimeHours: number;
  linesAdded: number;
  linesRemoved: number;
  isAgent: boolean;
  agentType?: string;
}

interface AgentStats {
  agentType: string;
  raised: number;
  merged: number;
  mergeRate: number;
}

// Detect if a PR is from an agent and what type
function detectAgent(pr: PullRequest): { isAgent: boolean; agentType?: string } {
  const branchName = pr.head?.ref?.toLowerCase() || "";
  const title = pr.title?.toLowerCase() || "";
  const author = pr.user?.login?.toLowerCase() || "";

  // Check for cursor
  if (branchName.includes("cursor/") || title.includes("cursor:") || author.includes("cursor")) {
    return { isAgent: true, agentType: "cursor" };
  }

  // Check for devin
  if (branchName.includes("devin/") || title.includes("devin:") || author.includes("devin")) {
    return { isAgent: true, agentType: "devin" };
  }

  // Check for chatgpt/codex
  if (
    branchName.includes("chatgpt/") ||
    branchName.includes("codex/") ||
    title.includes("chatgpt:") ||
    title.includes("codex:") ||
    author.includes("chatgpt") ||
    author.includes("codex")
  ) {
    return { isAgent: true, agentType: "chatgpt" };
  }

  // Check for github copilot
  if (branchName.includes("copilot/") || title.includes("copilot:") || author.includes("copilot")) {
    return { isAgent: true, agentType: "copilot" };
  }

  return { isAgent: false };
}

export default function HighScoresView() {
  const { theme } = useUIStore();
  const { pullRequests } = usePRStore();

  const { contributorStats, agentStats, globalStats } = useMemo(() => {
    const prs = Array.from(pullRequests.values());
    const contributorMap = new Map<string, ContributorStats>();
    const agentMap = new Map<string, AgentStats>();

    let totalMergeTimeHours = 0;
    let mergedCount = 0;
    let fastestMergeTimeHours = Infinity;
    let fastestMergePR = "";

    prs.forEach((pr) => {
      const author = pr.user?.login || "unknown";
      const { isAgent, agentType } = detectAgent(pr);

      // Update contributor stats
      if (!contributorMap.has(author)) {
        contributorMap.set(author, {
          author,
          totalPRs: 0,
          mergedPRs: 0,
          openPRs: 0,
          avgMergeTimeHours: 0,
          linesAdded: 0,
          linesRemoved: 0,
          isAgent,
          agentType,
        });
      }

      const stats = contributorMap.get(author)!;
      stats.totalPRs++;

      if (pr.state === "open") {
        stats.openPRs++;
      }

      if (pr.merged && pr.merged_at && pr.created_at) {
        stats.mergedPRs++;
        const mergeTime = new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime();
        const mergeTimeHours = mergeTime / (1000 * 60 * 60);
        totalMergeTimeHours += mergeTimeHours;
        mergedCount++;

        if (mergeTimeHours < fastestMergeTimeHours) {
          fastestMergeTimeHours = mergeTimeHours;
          fastestMergePR = `#${pr.number} by ${author}`;
        }
      }

      if (pr.additions) {
        stats.linesAdded += pr.additions;
      }
      if (pr.deletions) {
        stats.linesRemoved += pr.deletions;
      }

      // Update agent stats
      if (isAgent && agentType) {
        if (!agentMap.has(agentType)) {
          agentMap.set(agentType, {
            agentType,
            raised: 0,
            merged: 0,
            mergeRate: 0,
          });
        }

        const agentStat = agentMap.get(agentType)!;
        agentStat.raised++;
        if (pr.merged) {
          agentStat.merged++;
        }
      }
    });

    // Calculate average merge time for each contributor
    contributorMap.forEach((stats) => {
      if (stats.mergedPRs > 0) {
        const contributorMergeTime = prs
          .filter((pr) => pr.user?.login === stats.author && pr.merged && pr.merged_at && pr.created_at)
          .reduce((sum, pr) => {
            const mergeTime = new Date(pr.merged_at!).getTime() - new Date(pr.created_at).getTime();
            return sum + mergeTime / (1000 * 60 * 60);
          }, 0);
        stats.avgMergeTimeHours = contributorMergeTime / stats.mergedPRs;
      }
    });

    // Calculate merge rates for agents
    agentMap.forEach((agentStat) => {
      agentStat.mergeRate = agentStat.raised > 0 ? (agentStat.merged / agentStat.raised) * 100 : 0;
    });

    const sortedContributors = Array.from(contributorMap.values()).sort(
      (a, b) => b.totalPRs - a.totalPRs
    );

    const sortedAgents = Array.from(agentMap.values()).sort((a, b) => b.raised - a.raised);

    const avgMergeTimeHours = mergedCount > 0 ? totalMergeTimeHours / mergedCount : 0;

    return {
      contributorStats: sortedContributors,
      agentStats: sortedAgents,
      globalStats: {
        totalPRs: prs.length,
        mergedPRs: prs.filter((pr) => pr.merged).length,
        openPRs: prs.filter((pr) => pr.state === "open").length,
        avgMergeTimeHours,
        fastestMergeTimeHours: fastestMergeTimeHours === Infinity ? 0 : fastestMergeTimeHours,
        fastestMergePR,
        totalContributors: contributorMap.size,
        humanContributors: Array.from(contributorMap.values()).filter((s) => !s.isAgent).length,
        agentContributors: Array.from(contributorMap.values()).filter((s) => s.isAgent).length,
      },
    };
  }, [pullRequests]);

  const topContributors = contributorStats.slice(0, 5);
  const fastestMergers = contributorStats
    .filter((s) => s.mergedPRs > 0)
    .sort((a, b) => a.avgMergeTimeHours - b.avgMergeTimeHours)
    .slice(0, 5);

  const mostProductiveContributors = contributorStats
    .filter((s) => !s.isAgent)
    .sort((a, b) => b.linesAdded + b.linesRemoved - (a.linesAdded + a.linesRemoved))
    .slice(0, 5);

  const formatTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      return `${(hours / 24).toFixed(1)}d`;
    }
  };

  const StatCard = ({
    title,
    icon: Icon,
    children,
  }: {
    title: string;
    icon: any;
    children: React.ReactNode;
  }) => (
    <div
      className={cn(
        "rounded-lg border p-6",
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className={cn("w-5 h-5", theme === "dark" ? "text-blue-400" : "text-blue-600")} />
        <h3
          className={cn(
            "text-lg font-semibold",
            theme === "dark" ? "text-gray-100" : "text-gray-900"
          )}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-auto",
        theme === "dark" ? "bg-gray-900" : "bg-gray-50"
      )}
    >
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1
              className={cn(
                "text-3xl font-bold flex items-center gap-3",
                theme === "dark" ? "text-gray-100" : "text-gray-900"
              )}
            >
              <Trophy className="w-8 h-8 text-yellow-500" />
              High Scores
            </h1>
            <p
              className={cn(
                "text-sm",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}
            >
              Top contributors, fastest mergers, and agent performance metrics
            </p>
          </div>

          {/* Global Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div
              className={cn(
                "p-4 rounded-lg border",
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              )}
            >
              <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                Total PRs
              </div>
              <div className={cn("text-2xl font-bold", theme === "dark" ? "text-gray-100" : "text-gray-900")}>
                {globalStats.totalPRs}
              </div>
            </div>
            <div
              className={cn(
                "p-4 rounded-lg border",
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              )}
            >
              <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                Avg Merge Time
              </div>
              <div className={cn("text-2xl font-bold", theme === "dark" ? "text-gray-100" : "text-gray-900")}>
                {formatTime(globalStats.avgMergeTimeHours)}
              </div>
            </div>
            <div
              className={cn(
                "p-4 rounded-lg border",
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              )}
            >
              <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                Human Contributors
              </div>
              <div className={cn("text-2xl font-bold", theme === "dark" ? "text-gray-100" : "text-gray-900")}>
                {globalStats.humanContributors}
              </div>
            </div>
            <div
              className={cn(
                "p-4 rounded-lg border",
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              )}
            >
              <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                Agent Contributors
              </div>
              <div className={cn("text-2xl font-bold", theme === "dark" ? "text-gray-100" : "text-gray-900")}>
                {globalStats.agentContributors}
              </div>
            </div>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Contributors by PR Count */}
            <StatCard title="Top Contributors by PRs" icon={Trophy}>
              <div className="space-y-3">
                {topContributors.length > 0 ? (
                  topContributors.map((contributor, index) => (
                    <div
                      key={contributor.author}
                      className={cn(
                        "flex items-center justify-between p-3 rounded",
                        theme === "dark" ? "bg-gray-700/50" : "bg-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                            index === 0
                              ? "bg-yellow-500 text-white"
                              : index === 1
                              ? "bg-gray-400 text-white"
                              : index === 2
                              ? "bg-orange-600 text-white"
                              : theme === "dark"
                              ? "bg-gray-600 text-gray-300"
                              : "bg-gray-300 text-gray-700"
                          )}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-medium",
                                theme === "dark" ? "text-gray-200" : "text-gray-900"
                              )}
                            >
                              {contributor.author}
                            </span>
                            {contributor.isAgent && (
                              <Bot className="w-3 h-3 text-blue-500" />
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-xs",
                              theme === "dark" ? "text-gray-400" : "text-gray-600"
                            )}
                          >
                            {contributor.mergedPRs} merged, {contributor.openPRs} open
                          </span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-lg font-bold",
                          theme === "dark" ? "text-gray-100" : "text-gray-900"
                        )}
                      >
                        {contributor.totalPRs}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                    No PR data available
                  </p>
                )}
              </div>
            </StatCard>

            {/* Fastest Mergers */}
            <StatCard title="Fastest Average Merge Time" icon={Clock}>
              <div className="space-y-3">
                {fastestMergers.length > 0 ? (
                  fastestMergers.map((contributor, index) => (
                    <div
                      key={contributor.author}
                      className={cn(
                        "flex items-center justify-between p-3 rounded",
                        theme === "dark" ? "bg-gray-700/50" : "bg-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                            index === 0
                              ? "bg-green-500 text-white"
                              : theme === "dark"
                              ? "bg-gray-600 text-gray-300"
                              : "bg-gray-300 text-gray-700"
                          )}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-medium",
                                theme === "dark" ? "text-gray-200" : "text-gray-900"
                              )}
                            >
                              {contributor.author}
                            </span>
                            {contributor.isAgent && (
                              <Bot className="w-3 h-3 text-blue-500" />
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-xs",
                              theme === "dark" ? "text-gray-400" : "text-gray-600"
                            )}
                          >
                            {contributor.mergedPRs} PRs merged
                          </span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-lg font-bold",
                          theme === "dark" ? "text-gray-100" : "text-gray-900"
                        )}
                      >
                        {formatTime(contributor.avgMergeTimeHours)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                    No merged PRs available
                  </p>
                )}
              </div>
            </StatCard>

            {/* Most Productive (by lines changed) */}
            <StatCard title="Most Lines Changed (Humans)" icon={TrendingUp}>
              <div className="space-y-3">
                {mostProductiveContributors.length > 0 ? (
                  mostProductiveContributors.map((contributor, index) => (
                    <div
                      key={contributor.author}
                      className={cn(
                        "flex items-center justify-between p-3 rounded",
                        theme === "dark" ? "bg-gray-700/50" : "bg-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                            index === 0
                              ? "bg-purple-500 text-white"
                              : theme === "dark"
                              ? "bg-gray-600 text-gray-300"
                              : "bg-gray-300 text-gray-700"
                          )}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <span
                            className={cn(
                              "font-medium",
                              theme === "dark" ? "text-gray-200" : "text-gray-900"
                            )}
                          >
                            {contributor.author}
                          </span>
                          <div
                            className={cn(
                              "text-xs",
                              theme === "dark" ? "text-gray-400" : "text-gray-600"
                            )}
                          >
                            <span className="text-green-500">+{contributor.linesAdded}</span>
                            {" / "}
                            <span className="text-red-500">-{contributor.linesRemoved}</span>
                          </div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-lg font-bold",
                          theme === "dark" ? "text-gray-100" : "text-gray-900"
                        )}
                      >
                        {(contributor.linesAdded + contributor.linesRemoved).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                    No human contributor data available
                  </p>
                )}
              </div>
            </StatCard>

            {/* Merge Rate Leaders */}
            <StatCard title="Best Merge Rate" icon={GitMerge}>
              <div className="space-y-3">
                {contributorStats
                  .filter((s) => s.totalPRs >= 3) // At least 3 PRs to be meaningful
                  .sort((a, b) => b.mergedPRs / b.totalPRs - a.mergedPRs / a.totalPRs)
                  .slice(0, 5)
                  .map((contributor, index) => {
                    const mergeRate = (contributor.mergedPRs / contributor.totalPRs) * 100;
                    return (
                      <div
                        key={contributor.author}
                        className={cn(
                          "flex items-center justify-between p-3 rounded",
                          theme === "dark" ? "bg-gray-700/50" : "bg-gray-100"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                              index === 0
                                ? "bg-blue-500 text-white"
                                : theme === "dark"
                                ? "bg-gray-600 text-gray-300"
                                : "bg-gray-300 text-gray-700"
                            )}
                          >
                            {index + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "font-medium",
                                  theme === "dark" ? "text-gray-200" : "text-gray-900"
                                )}
                              >
                                {contributor.author}
                              </span>
                              {contributor.isAgent && (
                                <Bot className="w-3 h-3 text-blue-500" />
                              )}
                            </div>
                            <span
                              className={cn(
                                "text-xs",
                                theme === "dark" ? "text-gray-400" : "text-gray-600"
                              )}
                            >
                              {contributor.mergedPRs}/{contributor.totalPRs} merged
                            </span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-lg font-bold",
                            theme === "dark" ? "text-gray-100" : "text-gray-900"
                          )}
                        >
                          {mergeRate.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </StatCard>
          </div>

          {/* Agent Stats Section */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-6">
              <Bot className={cn("w-6 h-6", theme === "dark" ? "text-blue-400" : "text-blue-600")} />
              <h2
                className={cn(
                  "text-2xl font-bold",
                  theme === "dark" ? "text-gray-100" : "text-gray-900"
                )}
              >
                Agent Performance
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agentStats.length > 0 ? (
                agentStats.map((agent) => (
                  <div
                    key={agent.agentType}
                    className={cn(
                      "rounded-lg border p-6",
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700"
                        : "bg-white border-gray-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3
                        className={cn(
                          "text-lg font-semibold capitalize",
                          theme === "dark" ? "text-gray-100" : "text-gray-900"
                        )}
                      >
                        {agent.agentType}
                      </h3>
                      <Bot className="w-5 h-5 text-blue-500" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                          PRs Raised
                        </span>
                        <span
                          className={cn(
                            "text-xl font-bold",
                            theme === "dark" ? "text-gray-100" : "text-gray-900"
                          )}
                        >
                          {agent.raised}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                          PRs Merged
                        </span>
                        <span
                          className={cn(
                            "text-xl font-bold",
                            theme === "dark" ? "text-gray-100" : "text-gray-900"
                          )}
                        >
                          {agent.merged}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-gray-700">
                        <div className="flex justify-between items-center">
                          <span className={cn("text-sm font-medium", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                            Merge Rate
                          </span>
                          <span
                            className={cn(
                              "text-2xl font-bold",
                              agent.mergeRate >= 75
                                ? "text-green-500"
                                : agent.mergeRate >= 50
                                ? "text-yellow-500"
                                : "text-orange-500"
                            )}
                          >
                            {agent.mergeRate.toFixed(0)}%
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div
                          className={cn(
                            "mt-2 h-2 rounded-full overflow-hidden",
                            theme === "dark" ? "bg-gray-700" : "bg-gray-200"
                          )}
                        >
                          <div
                            className={cn(
                              "h-full transition-all",
                              agent.mergeRate >= 75
                                ? "bg-green-500"
                                : agent.mergeRate >= 50
                                ? "bg-yellow-500"
                                : "bg-orange-500"
                            )}
                            style={{ width: `${agent.mergeRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className={cn(
                    "col-span-full rounded-lg border p-8 text-center",
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-200"
                  )}
                >
                  <Bot className={cn("w-12 h-12 mx-auto mb-3", theme === "dark" ? "text-gray-600" : "text-gray-400")} />
                  <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                    No agent activity detected yet. Agents are identified by branch names or titles containing
                    cursor/, devin/, chatgpt/, codex/, or copilot/.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
