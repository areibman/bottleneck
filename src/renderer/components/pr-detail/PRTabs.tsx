import { MessageSquare, FileDiff } from "lucide-react";
import { cn } from "../../utils/cn";

interface PRTabsProps {
  activeTab: "conversation" | "files";
  onTabChange: (tab: "conversation" | "files") => void;
  commentsCount: number;
  filesCount: number;
  theme: "dark" | "light";
}

export function PRTabs({
  activeTab,
  onTabChange,
  commentsCount,
  filesCount,
  theme,
}: PRTabsProps) {
  return (
    <div
      className={cn(
        "flex border-b",
        theme === "dark" ? "border-gray-700" : "border-gray-200",
      )}
    >
      <div
        onClick={() => onTabChange("conversation")}
        className={cn(
          "tab flex items-center",
          activeTab === "conversation" && "active",
        )}
      >
        <MessageSquare className="w-3 h-3 mr-1" />
        <span className="text-xs">Conversation</span>
        <span
          className={cn(
            "ml-2 px-1 py-0.5 rounded text-xs",
            theme === "dark" ? "bg-gray-700" : "bg-gray-200",
          )}
        >
          {commentsCount}
        </span>
      </div>
      <div
        onClick={() => onTabChange("files")}
        className={cn(
          "tab flex items-center",
          activeTab === "files" && "active",
        )}
      >
        <FileDiff className="w-3 h-3 mr-1" />
        <span className="text-xs">Files changed</span>
        <span
          className={cn(
            "ml-2 px-1 py-0.5 rounded text-xs",
            theme === "dark" ? "bg-gray-700" : "bg-gray-200",
          )}
        >
          {filesCount}
        </span>
      </div>
    </div>
  );
}
