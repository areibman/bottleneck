import { useState, useMemo, useRef, useEffect } from "react";
import { Tag, X, Search, Filter } from "lucide-react";
import { cn } from "../utils/cn";
import { getLabelColors } from "../utils/labelColors";

interface Label {
  name: string;
  color: string;
  count: number;
}

type LabelFilterMode = "OR" | "AND" | "NOT" | "ONLY";

interface LabelFilterDropdownProps {
  theme: "light" | "dark";
  labels: Label[];
  selectedLabels: string[];
  labelFilterMode: LabelFilterMode;
  showNoLabels: boolean;
  onToggleLabel: (labelName: string) => void;
  onToggleNoLabels: () => void;
  onChangeLabelFilterMode: (mode: LabelFilterMode) => void;
  onClearLabels: () => void;
}

const FILTER_MODE_OPTIONS: Array<{ value: LabelFilterMode; label: string; description: string }> = [
  { value: "OR", label: "Any (OR)", description: "PRs with any of the selected labels" },
  { value: "AND", label: "All (AND)", description: "PRs with all selected labels" },
  { value: "NOT", label: "Exclude (NOT)", description: "PRs without these labels" },
  { value: "ONLY", label: "Exactly (ONLY)", description: "PRs with only these labels" },
];

// Common quick filter labels with emojis
const QUICK_FILTERS = [
  "bug",
  "feature",
  "documentation",
  "enhancement",
  "needs-review",
  "critical",
  "help wanted",
  "good first issue",
];

export function LabelFilterDropdown({
  theme,
  labels,
  selectedLabels,
  labelFilterMode,
  showNoLabels,
  onToggleLabel,
  onToggleNoLabels,
  onChangeLabelFilterMode,
  onClearLabels,
}: LabelFilterDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModeMenu, setShowModeMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowModeMenu(false);
      }
    };

    if (showDropdown || showModeMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown, showModeMenu]);

  // Filter labels by search query
  const filteredLabels = useMemo(() => {
    if (!searchQuery) return labels;
    const query = searchQuery.toLowerCase();
    return labels.filter((label) => label.name.toLowerCase().includes(query));
  }, [labels, searchQuery]);

  // Get quick filter labels that exist in the repo
  const quickFilterLabels = useMemo(() => {
    return QUICK_FILTERS.map((qf) => {
      const label = labels.find((l) => l.name.toLowerCase() === qf.toLowerCase());
      return label ? { ...label, quickFilter: qf } : null;
    }).filter((l): l is Label & { quickFilter: string } => l !== null);
  }, [labels]);

  // Sort labels by usage (most used first), then alphabetically
  const sortedLabels = useMemo(() => {
    return [...filteredLabels].sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
  }, [filteredLabels]);

  const selectedCount = selectedLabels.length + (showNoLabels ? 1 : 0);
  const hasSelection = selectedCount > 0;

  const getEmoji = (labelName: string): string => {
    const name = labelName.toLowerCase();
    if (name.includes("bug")) return "🐛";
    if (name.includes("feature") || name.includes("enhancement")) return "✨";
    if (name.includes("documentation") || name.includes("docs")) return "📝";
    if (name.includes("critical") || name.includes("urgent")) return "🚨";
    if (name.includes("review")) return "👀";
    if (name.includes("security")) return "🔒";
    if (name.includes("performance")) return "⚡";
    if (name.includes("test")) return "🧪";
    if (name.includes("help")) return "❓";
    return "";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          "px-3 py-1.5 rounded border flex items-center space-x-2 text-xs min-w-[140px]",
          theme === "dark"
            ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
            : "bg-white border-gray-300 hover:bg-gray-100",
          hasSelection && (theme === "dark" ? "border-blue-500" : "border-blue-400")
        )}
      >
        <Tag className="w-3.5 h-3.5" />
        <span>Labels:</span>
        <span
          className={cn(
            "truncate",
            theme === "dark" ? "text-gray-300" : "text-gray-700"
          )}
        >
          {hasSelection ? `${selectedCount} selected` : "All"}
        </span>
      </button>

      {showDropdown && (
        <div
          className={cn(
            "absolute top-full mt-1 right-0 z-50 w-[350px] rounded-md shadow-lg border",
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          )}
        >
          {/* Header with mode selector and clear button */}
          <div
            className={cn(
              "p-3 border-b flex items-center justify-between",
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            )}
          >
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold">Filter Mode:</span>
              <div className="relative">
                <button
                  onClick={() => setShowModeMenu(!showModeMenu)}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium flex items-center space-x-1",
                    theme === "dark"
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-gray-100 hover:bg-gray-200"
                  )}
                >
                  <Filter className="w-3 h-3" />
                  <span>{FILTER_MODE_OPTIONS.find((m) => m.value === labelFilterMode)?.label}</span>
                </button>
                
                {showModeMenu && (
                  <div
                    className={cn(
                      "absolute top-full mt-1 left-0 z-50 min-w-[200px] rounded-md shadow-lg border",
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700"
                        : "bg-white border-gray-200"
                    )}
                  >
                    {FILTER_MODE_OPTIONS.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => {
                          onChangeLabelFilterMode(mode.value);
                          setShowModeMenu(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs",
                          theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50",
                          labelFilterMode === mode.value &&
                            (theme === "dark" ? "bg-blue-900/30" : "bg-blue-50")
                        )}
                      >
                        <div className="font-medium">{mode.label}</div>
                        <div
                          className={cn(
                            "text-xs mt-0.5",
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          )}
                        >
                          {mode.description}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {hasSelection && (
              <button
                onClick={onClearLabels}
                className={cn(
                  "text-xs px-2 py-1 rounded",
                  theme === "dark"
                    ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                    : "text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                )}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Search box */}
          <div className="p-2">
            <div className="relative">
              <Search
                className={cn(
                  "absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5",
                  theme === "dark" ? "text-gray-500" : "text-gray-400"
                )}
              />
              <input
                type="text"
                placeholder="Search labels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-8 pr-3 py-1.5 rounded text-xs border",
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                )}
              />
            </div>
          </div>

          {/* Quick filters section */}
          {quickFilterLabels.length > 0 && !searchQuery && (
            <div
              className={cn(
                "px-3 py-2 border-b",
                theme === "dark" ? "border-gray-700" : "border-gray-200"
              )}
            >
              <div
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider mb-2",
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                )}
              >
                Quick Filters
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickFilterLabels.map((label) => {
                  const isSelected = selectedLabels.includes(label.name);
                  const labelColors = getLabelColors(label.color, theme);
                  const emoji = getEmoji(label.name);
                  
                  return (
                    <button
                      key={label.name}
                      onClick={() => onToggleLabel(label.name)}
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 transition-all",
                        isSelected && "ring-2 ring-blue-500 ring-offset-1",
                        theme === "dark" && isSelected && "ring-offset-gray-800",
                        theme === "light" && isSelected && "ring-offset-white"
                      )}
                      style={{
                        backgroundColor: labelColors.backgroundColor,
                        color: labelColors.color,
                      }}
                    >
                      {emoji && <span>{emoji}</span>}
                      <span>{label.name}</span>
                      <span
                        className={cn(
                          "ml-1 text-[10px] opacity-70"
                        )}
                      >
                        ({label.count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All labels section */}
          <div className="p-2 max-h-64 overflow-y-auto">
            <div
              className={cn(
                "text-xs font-semibold uppercase tracking-wider px-2 py-1",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}
            >
              All Labels ({filteredLabels.length})
            </div>

            {sortedLabels.map((label) => {
              const isSelected = selectedLabels.includes(label.name);
              const labelColors = getLabelColors(label.color, theme);
              const emoji = getEmoji(label.name);
              
              return (
                <label
                  key={label.name}
                  className={cn(
                    "flex items-center space-x-2 px-2 py-2 rounded cursor-pointer",
                    theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleLabel(label.name)}
                    className="rounded"
                  />
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium flex items-center space-x-1 flex-1"
                    style={{
                      backgroundColor: labelColors.backgroundColor,
                      color: labelColors.color,
                    }}
                  >
                    {emoji && <span>{emoji}</span>}
                    <span>{label.name}</span>
                  </span>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      theme === "dark" ? "text-gray-500" : "text-gray-500"
                    )}
                  >
                    {label.count}
                  </span>
                </label>
              );
            })}

            {filteredLabels.length === 0 && (
              <div
                className={cn(
                  "text-xs text-center py-4",
                  theme === "dark" ? "text-gray-500" : "text-gray-600"
                )}
              >
                No labels found
              </div>
            )}
          </div>

          {/* No labels option */}
          <div
            className={cn(
              "p-2 border-t",
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            )}
          >
            <label
              className={cn(
                "flex items-center space-x-2 px-2 py-2 rounded cursor-pointer",
                theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"
              )}
            >
              <input
                type="checkbox"
                checked={showNoLabels}
                onChange={onToggleNoLabels}
                className="rounded"
              />
              <span className="text-xs font-medium">
                PRs without any labels
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}