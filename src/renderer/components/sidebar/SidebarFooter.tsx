import { cn } from "../../utils/cn";
import packageJson from "../../../../package.json";

interface SidebarFooterProps {
  theme: "light" | "dark";
}

export function SidebarFooter({ theme }: SidebarFooterProps) {
  return (
    <div
      className={cn(
        "p-4 border-t mt-auto flex flex-col",
        theme === "dark" ? "border-gray-700" : "border-gray-200",
      )}
    >
      <div className="text-left">
        <div className={cn(
          "font-semibold text-lg",
          theme === "dark" ? "text-gray-200" : "text-gray-800"
        )}>
          Bottleneck ⧖
        </div>
        <div className={cn(
          "text-xs mt-1",
          theme === "dark" ? "text-gray-400" : "text-gray-500"
        )}>
          v{packageJson.version}
        </div>
      </div>
    </div>
  );
}
