import { Bot, User } from "lucide-react";
import { cn } from "../utils/cn";
import { CursorIcon } from "./icons/CursorIcon";
import { ChatGPTIcon } from "./icons/ChatGPTIcon";
import { DevinIcon } from "./icons/DevinIcon";
import { ClaudeIcon } from "./icons/ClaudeIcon";
import { resolveAgentKey } from "../utils/agentIcons";

interface AgentIconProps {
  agentName?: string | null;
  className?: string;
  fallback?: "bot" | "user";
}

export function AgentIcon({ agentName, className, fallback }: AgentIconProps) {
  const agentKey = agentName ? resolveAgentKey(agentName) : undefined;
  const resolvedFallback = fallback ?? "bot";

  // Use the appropriate icon component based on the agent key
  if (agentKey) {
    const iconClassName = cn("w-4 h-4 flex-shrink-0", className);

    switch (agentKey) {
      case "cursor":
        return <CursorIcon className={iconClassName} />;
      case "claude":
        return <ClaudeIcon className={iconClassName} />;
      case "openai":
      case "codex":
        return <ChatGPTIcon className={iconClassName} />;
      case "devin":
        return <DevinIcon className={iconClassName} />;
    }
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
