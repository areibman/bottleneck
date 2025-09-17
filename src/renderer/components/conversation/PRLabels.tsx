import { Tag } from "lucide-react";
import { cn } from "../../utils/cn";
import { PullRequest } from "../../services/github";

interface PRLabelsProps {
  labels: PullRequest["labels"];
  theme: "light" | "dark";
}

export function PRLabels({ labels, theme }: PRLabelsProps) {
  if (labels.length === 0) return null;

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center space-x-3">
        <Tag
          className={cn(
            "w-5 h-5",
            theme === "dark" ? "text-gray-400" : "text-gray-600",
          )}
        />
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <span
              key={label.name}
              className="px-3 py-1 rounded text-sm font-medium"
              style={{
                backgroundColor: `#${label.color}30`,
                color: `#${label.color}`,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
