import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    GitBranch,
    GitPullRequest,
    GitMerge,
    ExternalLink,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { cn } from "../../../utils/cn";
import { AgentIcon } from "../../../components/AgentIcon";
import type { Issue, PullRequest } from "../../../services/github";
import { getPRMetadata } from "../../../utils/prGrouping";

interface AgentGroup {
    agent: string;
    branches: NonNullable<Issue["linkedBranches"]>;
    prs: NonNullable<Issue["linkedPRs"]>;
}

// Detect agent from branch name
function detectAgentFromBranch(branchName: string): string {
    const lowerName = branchName.toLowerCase();
    if (lowerName.startsWith("cursor/")) return "cursor";
    if (lowerName.startsWith("devin/")) return "devin";
    if (lowerName.startsWith("copilot/")) return "copilot";
    if (lowerName.startsWith("chatgpt/")) return "chatgpt";
    if (lowerName.startsWith("human/")) return "human";
    return "unknown";
}

// Group branches and PRs by agent
function groupByAgent(
    branches: NonNullable<Issue["linkedBranches"]>,
    prs: NonNullable<Issue["linkedPRs"]>,
    repoOwner: string,
    repoName: string,
): AgentGroup[] {
    const agentMap = new Map<string, AgentGroup>();

    // Process branches
    branches.forEach((branch) => {
        const agent = detectAgentFromBranch(branch.refName);
        const existing = agentMap.get(agent) || { agent, branches: [], prs: [] };
        existing.branches.push(branch);
        agentMap.set(agent, existing);
    });

    // Process PRs using existing metadata detection
    prs.forEach((pr) => {
        const fakePR: PullRequest = {
            ...pr,
            user: { login: "", avatar_url: "" },
            body: null,
            labels: [],
            head: pr.head
                ? {
                    ref: pr.head.ref,
                    sha: "",
                    repo: null,
                }
                : {
                    ref: "",
                    sha: "",
                    repo: null,
                },
            base: {
                ref: "",
                sha: "",
                repo: {
                    name: repoName,
                    owner: { login: repoOwner },
                },
            },
            assignees: [],
            requested_reviewers: [],
            comments: 0,
            created_at: "",
            updated_at: "",
            closed_at: null,
            merged_at: null,
            mergeable: null,
            merge_commit_sha: null,
        };
        const metadata = getPRMetadata(fakePR);
        const agent = metadata.agent;
        const existing = agentMap.get(agent) || { agent, branches: [], prs: [] };
        existing.prs.push(pr);
        agentMap.set(agent, existing);
    });

    return Array.from(agentMap.values());
}

interface IssueDevelopmentTreeViewProps {
    issue: Issue;
    theme: "light" | "dark";
    repoOwner: string;
    repoName: string;
}

export function IssueDevelopmentTreeView({
    issue,
    theme,
    repoOwner,
    repoName,
}: IssueDevelopmentTreeViewProps) {
    const navigate = useNavigate();
    const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

    const branches = issue.linkedBranches ?? [];
    const prs = issue.linkedPRs ?? [];

    const agentGroups = useMemo(
        () => groupByAgent(branches, prs, repoOwner, repoName),
        [branches, prs, repoOwner, repoName]
    );

    const toggleAgent = (agent: string) => {
        setExpandedAgents((prev) => {
            const next = new Set(prev);
            if (next.has(agent)) {
                next.delete(agent);
            } else {
                next.add(agent);
            }
            return next;
        });
    };

    const handlePRClick = (pr: NonNullable<Issue["linkedPRs"]>[number]) => {
        const prOwner = pr.repository?.owner || repoOwner;
        const prRepo = pr.repository?.name || repoName;
        navigate(`/pulls/${prOwner}/${prRepo}/${pr.number}`);
    };

    const handleBranchClick = (branch: NonNullable<Issue["linkedBranches"]>[number]) => {
        const branchOwner = branch.repository.owner || repoOwner;
        const branchRepo = branch.repository.name || repoName;
        const repoSlug = `${branchOwner}/${branchRepo}`;
        const baseUrl = branch.repository.url
            ? branch.repository.url.replace(/\/$/, "")
            : `https://github.com/${repoSlug}`;
        const branchUrl = `${baseUrl}/tree/${encodeURIComponent(branch.refName)}`;
        window.open(branchUrl, "_blank");
    };

    return (
        <div className="space-y-1">
            {agentGroups.map((group) => {
                const isExpanded = expandedAgents.has(group.agent);
                const totalCount = group.branches.length + group.prs.length;

                return (
                    <div key={group.agent}>
                        {/* Agent header */}
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleAgent(group.agent);
                            }}
                            className={cn(
                                "flex items-center space-x-1.5 p-1.5 rounded transition-colors cursor-pointer",
                                theme === "dark"
                                    ? "bg-gray-700 hover:bg-gray-600"
                                    : "bg-gray-100 hover:bg-gray-200",
                            )}
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-2.5 h-2.5 flex-shrink-0" />
                            ) : (
                                <ChevronRight className="w-2.5 h-2.5 flex-shrink-0" />
                            )}
                            {group.agent !== "unknown" && (
                                <AgentIcon agentName={group.agent} className="h-3 w-3 flex-shrink-0" />
                            )}
                            <span className="font-medium capitalize text-[0.625rem]">{group.agent}</span>
                            <span
                                className={cn(
                                    "px-1 py-0.5 rounded text-[0.5rem]",
                                    theme === "dark" ? "bg-gray-600 text-gray-300" : "bg-gray-200 text-gray-600"
                                )}
                            >
                                {totalCount}
                            </span>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                            <div className="ml-4 mt-0.5 space-y-0.5">
                                {/* PRs */}
                                {group.prs.map((pr) => (
                                    <div
                                        key={`pr-${pr.number}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePRClick(pr);
                                        }}
                                        className={cn(
                                            "flex items-center space-x-1.5 py-0.5 px-1.5 rounded cursor-pointer transition-colors",
                                            theme === "dark"
                                                ? "bg-gray-800 hover:bg-gray-750"
                                                : "bg-white hover:bg-gray-50 border border-gray-200",
                                        )}
                                    >
                                        {pr.merged ? (
                                            <GitMerge className="w-2.5 h-2.5 flex-shrink-0 text-purple-400" />
                                        ) : pr.draft ? (
                                            <GitPullRequest className="w-2.5 h-2.5 flex-shrink-0 text-gray-400" />
                                        ) : (
                                            <GitPullRequest className="w-2.5 h-2.5 flex-shrink-0 text-green-400" />
                                        )}
                                        <span className="font-mono text-[0.625rem]">#{pr.number}</span>
                                        <span className="truncate text-[0.625rem]">{pr.title}</span>
                                    </div>
                                ))}

                                {/* Branches */}
                                {group.branches.map((branch) => {
                                    const branchOwner = branch.repository.owner || repoOwner;
                                    const branchRepo = branch.repository.name || repoName;
                                    const repoSlug = `${branchOwner}/${branchRepo}`;

                                    return (
                                        <div
                                            key={branch.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBranchClick(branch);
                                            }}
                                            className={cn(
                                                "flex items-center space-x-1.5 py-0.5 px-1.5 rounded cursor-pointer transition-colors",
                                                theme === "dark"
                                                    ? "bg-gray-800 hover:bg-gray-750"
                                                    : "bg-white hover:bg-gray-50 border border-gray-200",
                                            )}
                                        >
                                            <GitBranch className="w-2.5 h-2.5 flex-shrink-0 text-gray-400" />
                                            <span className="truncate text-[0.625rem]" title={`${repoSlug}:${branch.refName}`}>
                                                {branch.refName}
                                            </span>
                                            <ExternalLink className="w-2 h-2 flex-shrink-0 text-gray-400 ml-auto" />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

