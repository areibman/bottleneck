import cursorIconUrl from "../assets/agents/cursor.svg";
import claudeIconUrl from "../assets/agents/claude.svg";
import openaiIconUrl from "../assets/agents/openai.svg";
import devinIconUrl from "../assets/agents/devin.svg";

export interface AgentIconInfo {
  src: string;
  alt: string;
}

const BASE_ICON_MAP: Record<string, AgentIconInfo> = {
  cursor: { src: cursorIconUrl, alt: "Cursor" },
  claude: { src: claudeIconUrl, alt: "Claude" },
  openai: { src: openaiIconUrl, alt: "OpenAI" },
  devin: { src: devinIconUrl, alt: "Devin" },
};

const ALIASES: Record<string, string> = {
  "cursor-ai": "cursor",
  cursorai: "cursor",
  cursorbot: "cursor",
  "claude-2": "claude",
  "claude-3": "claude",
  "claude-instant": "claude",
  anthropic: "claude",
  "openai-codex": "openai",
  codex: "openai",
  gpt: "openai",
  "gpt-4": "openai",
  "gpt4": "openai",
  "gpt-4o": "openai",
  gpt4o: "openai",
  chatgpt: "openai",
  "open-ai": "openai",
  "devin-ai": "devin",
  "devinbot": "devin",
  cognition: "devin",
};

function normalizeAgentName(agentName?: string | null): string | undefined {
  if (!agentName) {
    return undefined;
  }

  const normalized = agentName
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || undefined;
}

export function resolveAgentKey(agentName?: string | null): string | undefined {
  const normalized = normalizeAgentName(agentName);
  if (!normalized) {
    return undefined;
  }

  return ALIASES[normalized] ?? normalized;
}

export function getAgentIcon(agentName?: string | null): AgentIconInfo | undefined {
  const key = resolveAgentKey(agentName);
  if (!key) {
    return undefined;
  }

  return BASE_ICON_MAP[key];
}

export function detectAgentName(
  ...sources: Array<string | null | undefined>
): string | undefined {
  for (const source of sources) {
    if (!source) continue;

    const tokens = source
      .toString()
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    for (const token of tokens) {
      const resolved = resolveAgentKey(token);
      if (resolved && BASE_ICON_MAP[resolved]) {
        return resolved;
      }
    }
  }

  return undefined;
}
