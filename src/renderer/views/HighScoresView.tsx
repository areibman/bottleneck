import { useMemo } from "react";
import { Trophy, GitMerge, BarChart3, Clock, Users } from "lucide-react";
import { useUIStore } from "../stores/uiStore";
import { usePRStore } from "../stores/prStore";
import { cn } from "../utils/cn";
import WelcomeView from "./WelcomeView";
import { AgentIcon } from "../components/AgentIcon";
import { detectAgentName, resolveAgentKey } from "../utils/agentIcons";
import type { PullRequest } from "../services/github";

type AgentKey = "cursor" | "devin" | "codex" | "openai" | "claude" | "ai" | "unknown";

function isWithinDays(dateIso: string | null | undefined, days: number): boolean {
  if (!dateIso) return false;
  const date = new Date(dateIso).getTime();
  if (Number.isNaN(date)) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return date >= cutoff;
}

function diffInHours(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return NaN;
  return (end - start) / (1000 * 60 * 60);
}

function median(values: number[]): number | null {
  const arr = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (arr.length === 0) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
}

function formatHoursAsFriendly(hours: number | null): string {
  if (hours == null || !Number.isFinite(hours)) return "—";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 7) return `${days.toFixed(days < 2 ? 1 : 0)}d`;
  const weeks = days / 7;
  return `${weeks.toFixed(weeks < 2 ? 1 : 0)}w`;
}

function toAgentKey(pr: PullRequest): AgentKey {
  const labelNames = (pr.labels ?? []).map((l: any) => l?.name).filter(Boolean) as string[];
  const detected = detectAgentName(
    pr.head?.ref,
    pr.title,
    pr.body,
    pr.user?.login,
    ...labelNames,
  );
  const key = detected ? (resolveAgentKey(detected) as AgentKey | undefined) : undefined;
  if (key) return key;
  const hasAILabel = labelNames.some((n) => n.toLowerCase().includes("ai"));
  return hasAILabel ? "ai" : "unknown";
}

function isAgentPR(pr: PullRequest): boolean {
  const key = toAgentKey(pr);
  return key !== "unknown"; // treat anything recognized or generic AI as agent
}

export default function HighScoresView() {
  const { theme } = useUIStore();
  const { pullRequests, selectedRepo } = usePRStore();

  const repoPRs = useMemo(() => {
    if (!selectedRepo) return [] as PullRequest[];
    return Array.from(pullRequests.values()).filter((pr) => {
      const baseOwner = pr.base?.repo?.owner?.login;
      const baseName = pr.base?.repo?.name;
      return baseOwner === selectedRepo.owner && baseName === selectedRepo.name;
    });
  }, [pullRequests, selectedRepo]);

  const nowIso = new Date().toISOString();

  const stats = useMemo(() => {
    const last7Merged = repoPRs.filter((pr) => pr.merged && isWithinDays(pr.merged_at, 7));
    const last30Merged = repoPRs.filter((pr) => pr.merged && isWithinDays(pr.merged_at, 30));
    const last30Created = repoPRs.filter((pr) => isWithinDays(pr.created_at, 30));
    const openPRs = repoPRs.filter((pr) => pr.state === "open");

    const ttmHours = last30Merged
      .map((pr) => (pr.merged_at ? diffInHours(pr.created_at, pr.merged_at) : NaN))
      .filter((h) => Number.isFinite(h)) as number[];
    const medianTTMHours = median(ttmHours);

    const openAgesHours = openPRs
      .map((pr) => diffInHours(pr.created_at, nowIso))
      .filter((h) => Number.isFinite(h)) as number[];
    const medianOpenAgeHours = median(openAgesHours);

    const sizeChanges = last30Merged
      .map((pr) => (pr.additions ?? 0) + (pr.deletions ?? 0))
      .filter((n) => n > 0);
    const medianSize = median(sizeChanges);

    // Human vs Agent merge rate in last 30 days
    const created30Human = last30Created.filter((pr) => !isAgentPR(pr)).length;
    const created30Agent = last30Created.filter((pr) => isAgentPR(pr)).length;
    const merged30Human = last30Merged.filter((pr) => !isAgentPR(pr)).length;
    const merged30Agent = last30Merged.filter((pr) => isAgentPR(pr)).length;
    const humanMergeRate = created30Human > 0 ? Math.round((merged30Human / created30Human) * 100) : null;
    const agentMergeRate = created30Agent > 0 ? Math.round((merged30Agent / created30Agent) * 100) : null;

    // Top humans by merged PRs in last 30 days
    const humanMergedByAuthor = new Map<string, { login: string; avatar_url: string; count: number }>();
    last30Merged.forEach((pr) => {
      if (isAgentPR(pr)) return;
      const login = pr.user?.login || "unknown";
      const avatar_url = pr.user?.avatar_url || "";
      const cur = humanMergedByAuthor.get(login) || { login, avatar_url, count: 0 };
      cur.count += 1;
      humanMergedByAuthor.set(login, cur);
    });
    const topHumans = Array.from(humanMergedByAuthor.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Agents overall stats
    const agentCandidates: AgentKey[] = ["cursor", "devin", "codex", "openai", "claude", "ai"];
    const agentRows = agentCandidates.map((key) => {
      const raised = repoPRs.filter((pr) => toAgentKey(pr) === key).length;
      const merged = repoPRs.filter((pr) => toAgentKey(pr) === key && pr.merged).length;
      const mergeRate = raised > 0 ? Math.round((merged / raised) * 100) : null;
      return { agentKey: key, raised, merged, mergeRate };
    }).filter((row) => row.raised > 0);

    return {
      counts: {
        merged7: last7Merged.length,
        merged30: last30Merged.length,
        open: openPRs.length,
        created30: last30Created.length,
      },
      medianTTMHours,
      medianOpenAgeHours,
      medianSize,
      humanMergeRate,
      agentMergeRate,
      topHumans,
      agentRows,
    };
  }, [repoPRs, nowIso]);

  if (!selectedRepo) {
    return <WelcomeView />;
  }

  const hasData = repoPRs.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "p-4 border-b",
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200",
        )}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
            High Scores
          </h1>
          <div className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}> 
            {selectedRepo.full_name}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hasData ? (
          <div className={cn("flex flex-col items-center justify-center h-64", theme === "dark" ? "text-gray-400" : "text-gray-600")}> 
            <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
            <div className="text-lg font-medium">No data yet</div>
            <div className="text-sm">Fetch pull requests for {selectedRepo.full_name} to see stats</div>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Key metrics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className={cn("p-4 rounded border", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}> 
                <div className="text-sm opacity-70 flex items-center"><GitMerge className="w-4 h-4 mr-2" />Merged PRs</div>
                <div className="mt-1 text-2xl font-bold">{stats.counts.merged7} <span className="text-sm font-medium opacity-70">(7d)</span></div>
                <div className={cn("text-sm opacity-70 mt-1", theme === "dark" ? "text-gray-400" : "text-gray-600")}>30d: {stats.counts.merged30}</div>
              </div>

              <div className={cn("p-4 rounded border", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}> 
                <div className="text-sm opacity-70 flex items-center"><Clock className="w-4 h-4 mr-2" />Median Time to Merge (30d)</div>
                <div className="mt-1 text-2xl font-bold">{formatHoursAsFriendly(stats.medianTTMHours)}</div>
              </div>

              <div className={cn("p-4 rounded border", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}> 
                <div className="text-sm opacity-70 flex items-center"><Clock className="w-4 h-4 mr-2" />Median Open PR Age</div>
                <div className="mt-1 text-2xl font-bold">{formatHoursAsFriendly(stats.medianOpenAgeHours)}</div>
                <div className={cn("text-sm opacity-70 mt-1", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Open PRs: {stats.counts.open}</div>
              </div>

              <div className={cn("p-4 rounded border", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}> 
                <div className="text-sm opacity-70 flex items-center"><BarChart3 className="w-4 h-4 mr-2" />Median PR Size (30d)</div>
                <div className="mt-1 text-2xl font-bold">{stats.medianSize == null ? "—" : Math.round(stats.medianSize)}</div>
                <div className={cn("text-sm opacity-70 mt-1", theme === "dark" ? "text-gray-400" : "text-gray-600")}>additions+deletions</div>
              </div>
            </div>

            {/* Human vs Agent merge rate */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className={cn("p-4 rounded border lg:col-span-2", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}> 
                <div className="text-sm font-medium mb-2 flex items-center"><Users className="w-4 h-4 mr-2" />Human vs Agent (30d)</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className={cn("text-xs opacity-70", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Human merge rate</div>
                    <div className="text-2xl font-bold">{stats.humanMergeRate == null ? "—" : `${stats.humanMergeRate}%`}</div>
                  </div>
                  <div>
                    <div className={cn("text-xs opacity-70", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Agent merge rate</div>
                    <div className="text-2xl font-bold">{stats.agentMergeRate == null ? "—" : `${stats.agentMergeRate}%`}</div>
                  </div>
                </div>
              </div>

              {/* Top humans */}
              <div className={cn("p-4 rounded border", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}> 
                <div className="text-sm font-medium mb-2">Top Humans by Merged PRs (30d)</div>
                {stats.topHumans.length === 0 ? (
                  <div className={cn("text-sm opacity-70", theme === "dark" ? "text-gray-400" : "text-gray-600")}>No human merges in the last 30 days</div>
                ) : (
                  <div className="space-y-2">
                    {stats.topHumans.map((h) => (
                      <div key={h.login} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {h.avatar_url ? (
                            <img src={h.avatar_url} alt={h.login} className="w-5 h-5 rounded-full" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-400" />
                          )}
                          <span className="text-sm">{h.login}</span>
                        </div>
                        <span className={cn("text-sm font-medium", theme === "dark" ? "text-gray-200" : "text-gray-800")}>{h.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Agents section */}
            <div className={cn("p-4 rounded border", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}> 
              <div className="text-sm font-medium mb-3">Agents</div>
              {stats.agentRows.length === 0 ? (
                <div className={cn("text-sm opacity-70", theme === "dark" ? "text-gray-400" : "text-gray-600")}>No agent PRs detected</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={cn(theme === "dark" ? "text-gray-300" : "text-gray-700")}> 
                        <th className="text-left font-medium py-2">Agent</th>
                        <th className="text-left font-medium py-2">PRs Raised : Merged</th>
                        <th className="text-left font-medium py-2">Merge Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.agentRows.map((row) => (
                        <tr key={row.agentKey} className={cn(theme === "dark" ? "border-t border-gray-700" : "border-t border-gray-200")}> 
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <AgentIcon agentName={row.agentKey} />
                              <span className="capitalize">{row.agentKey}</span>
                            </div>
                          </td>
                          <td className="py-2">
                            <span className="font-medium">{row.raised}</span>
                            <span className={cn("mx-1 opacity-70", theme === "dark" ? "text-gray-400" : "text-gray-600")}>:</span>
                            <span className="font-medium">{row.merged}</span>
                          </td>
                          <td className="py-2">{row.mergeRate == null ? "—" : `${row.mergeRate}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
