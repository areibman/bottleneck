import { Plus } from "lucide-react";
import { cn } from "../../utils/cn";

interface SidebarFooterProps {
  theme: "light" | "dark";
}

export function SidebarFooter({ theme }: SidebarFooterProps) {
  return (
    <div
      className={cn(
        "p-4 border-t mt-auto",
        theme === "dark" ? "border-gray-700" : "border-gray-200",
      )}
    >
      <button className="btn btn-secondary w-full text-sm">
        <Plus className="w-4 h-4 mr-2" />
        New Filter
      </button>
    </div>
  );
}
