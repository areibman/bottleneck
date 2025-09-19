import { Bot, User } from "lucide-react";
import { cn } from "../utils/cn";
import { getAgentIcon } from "../utils/agentIcons";
import { useUIStore } from "../stores/uiStore";

interface AgentIconProps {
  agentName?: string | null;
  className?: string;
  fallback?: "bot" | "user";
}

export function AgentIcon({ agentName, className, fallback }: AgentIconProps) {
  const { theme } = useUIStore();
  const iconInfo = agentName ? getAgentIcon(agentName) : undefined;
  const resolvedFallback = fallback ?? "bot";

  if (iconInfo) {
    const themeFilter = iconInfo.themeFilter?.[theme];
    return (
      <img
        src={iconInfo.src}
        alt={iconInfo.alt}
        className={cn("w-4 h-4 flex-shrink-0", className)}
        style={themeFilter ? { filter: themeFilter } : undefined}
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
