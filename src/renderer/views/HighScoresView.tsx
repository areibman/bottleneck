import { useMemo } from "react";
import { Trophy, GitMerge, Clock, FileDiff, Users } from "lucide-react";
import { usePRStore } from "../stores/prStore";
import { AgentIcon } from "../components/AgentIcon";
import { detectAgentName } from "../utils/agentIcons";
import type { PullRequest } from "../services/github";

type AuthorType = "agent" | "human";

interface PartitionedPRs {
  byType: Record<AuthorType, PullRequest[]>;
  byAgent: Map<string, PullRequest[]>; // agentKey -> PRs
}

function getAuthorType(pr: PullRequest): { type: AuthorType; agentKey?: string } {
  const agentKey = detectAgentName(
    pr.user?.login,
    pr.head?.ref,
    pr.title,
    ...(pr.labels || []).map((l) => l.name),
  );
  if (agentKey) return { type: "agent", agentKey };
  return { type: "human" };
}

function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) return "-";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export default function HighScoresView() {
  const { pullRequests, selectedRepo } = usePRStore();

  const repoPRs = useMemo(() => {
    if (!selectedRepo) return [] as PullRequest[];
    return Array.from(pullRequests.values()).filter((pr) => {
      const owner = pr.base?.repo?.owner?.login;
      const name = pr.base?.repo?.name;
      return owner === selectedRepo.owner && name === selectedRepo.name;
    });
  }, [pullRequests, selectedRepo]);

  const partitions: PartitionedPRs = useMemo(() => {
    const byType: Record<AuthorType, PullRequest[]> = { agent: [], human: [] };
    const byAgent = new Map<string, PullRequest[]>();
    repoPRs.forEach((pr) => {
      const { type, agentKey } = getAuthorType(pr);
      byType[type].push(pr);
      if (type === "agent" && agentKey) {
        const list = byAgent.get(agentKey) ?? [];
        list.push(pr);
        byAgent.set(agentKey, list);
      }
    });
    return { byType, byAgent };
  }, [repoPRs]);

  const stats = useMemo(() => {
    const compute = (prs: PullRequest[]) => {
      const total = prs.length;
      const merged = prs.filter((p) => p.merged || p.state === "closed").length;
      const mergeRate = total > 0 ? Math.round((merged / total) * 100) : 0;

      const mergedDurations = prs
        .filter((p) => p.merged_at && p.created_at)
        .map((p) => new Date(p.merged_at!).getTime() - new Date(p.created_at).getTime())
        .filter((ms) => isFinite(ms) && ms >= 0);
      const medianToMergeMs = median(mergedDurations);

      const sizes = prs
        .map((p) => (p.additions ?? 0) + (p.deletions ?? 0))
        .filter((n) => n > 0);
      const avgSize = sizes.length > 0
        ? Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length)
        : 0;

      return { total, merged, mergeRate, medianToMergeMs, avgSize };
    };

    const human = compute(partitions.byType.human);
    const agent = compute(partitions.byType.agent);

    // Largest PR overall
    let largest: { pr?: PullRequest; size: number; authorType: AuthorType } = {
      pr: undefined,
      size: 0,
      authorType: "human",
    };
    for (const pr of repoPRs) {
      const size = (pr.additions ?? 0) + (pr.deletions ?? 0);
      if (size > largest.size) {
        largest = { pr, size, authorType: getAuthorType(pr).type };
      }
    }

    // Most active contributor (human) and agent by PR count
    const humanCounts = new Map<string, number>();
    partitions.byType.human.forEach((p) => {
      humanCounts.set(p.user.login, (humanCounts.get(p.user.login) ?? 0) + 1);
    });
    const topHuman = Array.from(humanCounts.entries()).sort((a, b) => b[1] - a[1])[0];

    const topAgent = Array.from(partitions.byAgent.entries())
      .map(([agentKey, list]) => [agentKey, list.length] as const)
      .sort((a, b) => b[1] - a[1])[0];

    return { human, agent, largest, topHuman, topAgent };
  }, [partitions, repoPRs]);

  const agentTable = useMemo(() => {
    const rows = Array.from(partitions.byAgent.entries()).map(([agentKey, list]) => {
      const merged = list.filter((p) => p.merged || p.state === "closed").length;
      return { agentKey, raised: list.length, merged };
    });
    // Stable order: by raised desc
    rows.sort((a, b) => b.raised - a.raised);
    return rows;
  }, [partitions]);

  return (
    <div className="flex h-full w-full flex-col overflow-auto">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h1 className="text-lg font-semibold">High Scores</h1>
        </div>
        <p className="mt-1 text-sm opacity-70">
          {selectedRepo
            ? `Insights for ${selectedRepo.full_name}`
            : "Select a repository to see stats."}
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* Overview cards: Humans vs Agents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-blue-500" /> Humans PRs
            </div>
            <div className="mt-2 text-2xl font-bold">{stats.human.total}</div>
            <div className="mt-1 text-xs opacity-70">Merge rate: {stats.human.mergeRate}%</div>
          </div>

          <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-purple-500" /> Agents PRs
            </div>
            <div className="mt-2 text-2xl font-bold">{stats.agent.total}</div>
            <div className="mt-1 text-xs opacity-70">Merge rate: {stats.agent.mergeRate}%</div>
          </div>

          <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4 text-emerald-500" /> Median time to merge
            </div>
            <div className="mt-2 text-lg font-semibold">
              Humans: {stats.human.medianToMergeMs != null ? formatDuration(stats.human.medianToMergeMs) : "-"}
            </div>
            <div className="text-sm opacity-70">Agents: {stats.agent.medianToMergeMs != null ? formatDuration(stats.agent.medianToMergeMs) : "-"}</div>
          </div>

          <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileDiff className="w-4 h-4 text-orange-500" /> Avg changes per PR
            </div>
            <div className="mt-2 text-lg font-semibold">Humans: {stats.human.avgSize.toLocaleString()} LOC</div>
            <div className="text-sm opacity-70">Agents: {stats.agent.avgSize.toLocaleString()} LOC</div>
          </div>
        </div>

        {/* High score callouts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <GitMerge className="w-4 h-4 text-green-500" /> Largest PR by changes
            </div>
            {stats.largest.pr ? (
              <div className="mt-2 text-sm">
                <div className="text-base font-semibold">
                  #{stats.largest.pr.number} · {(stats.largest.pr.additions ?? 0) + (stats.largest.pr.deletions ?? 0)} LOC
                </div>
                <div className="opacity-70">
                  Author: {stats.largest.pr.user.login} ({stats.largest.authorType})
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm opacity-70">No PR data available.</div>
            )}
          </div>

          <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Trophy className="w-4 h-4 text-yellow-500" /> Most active contributors
            </div>
            <div className="mt-2 text-sm space-y-2">
              <div>
                <div className="text-xs opacity-70">Human</div>
                <div className="font-semibold">
                  {stats.topHuman ? `${stats.topHuman[0]} · ${stats.topHuman[1]} PRs` : "-"}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-70">Agent</div>
                <div className="flex items-center gap-2 font-semibold">
                  {stats.topAgent ? (
                    <>
                      <AgentIcon agentName={stats.topAgent[0]} />
                      <span className="capitalize">{stats.topAgent[0]}</span>
                      <span>· {stats.topAgent[1]} PRs</span>
                    </>
                  ) : (
                    <span>-</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agents section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold">Agents · PRs Raised : Merged</h2>
          </div>
          <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide opacity-70">
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-3 py-2">Agent</th>
                  <th className="px-3 py-2">Raised : Merged</th>
                  <th className="px-3 py-2">Merged %</th>
                </tr>
              </thead>
              <tbody>
                {agentTable.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-center opacity-70" colSpan={3}>
                      No agent PRs found.
                    </td>
                  </tr>
                )}
                {agentTable.map((row) => {
                  const pct = row.raised > 0 ? Math.round((row.merged / row.raised) * 100) : 0;
                  return (
                    <tr key={row.agentKey} className="border-t border-gray-200 dark:border-gray-800">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <AgentIcon agentName={row.agentKey} />
                          <span className="capitalize">{row.agentKey}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono">{row.raised} : {row.merged}</td>
                      <td className="px-3 py-2">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
