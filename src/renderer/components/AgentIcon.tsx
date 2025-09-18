import { Bot, User } from "lucide-react";
import { cn } from "../utils/cn";
import { getAgentIcon, resolveAgentKey } from "../utils/agentIcons";
import { useUIStore } from "../stores/uiStore";

interface AgentIconProps {
  agentName?: string | null;
  className?: string;
  fallback?: "bot" | "user";
}

export function AgentIcon({ agentName, className, fallback }: AgentIconProps) {
  const { theme } = useUIStore();
  const agentKey = resolveAgentKey(agentName);
  const iconInfo = agentName ? getAgentIcon(agentName) : undefined;
  const resolvedFallback = fallback ?? (agentName === "manual" ? "user" : "bot");
  const usesOpenAIIcon = agentKey === "openai" || agentKey === "codex";
  const shouldInvertColors =
    (usesOpenAIIcon && theme === "dark") ||
    (agentKey === "cursor" && theme !== "dark");

  if (iconInfo) {
    return (
      <img
        src={iconInfo.src}
        alt={iconInfo.alt}
        className={cn("w-4 h-4 flex-shrink-0", className)}
        style={shouldInvertColors ? { filter: "invert(1)" } : undefined}
      />
    );
  }

  if (resolvedFallback === "user") {
    return (
      <User className={cn("w-4 h-4 flex-shrink-0 text-blue-400", className)} />
    );
  }

  return (
    <Bot className={cn("w-4 h-4 flex-shrink-0 text-purple-400", className)} />
  );
}
