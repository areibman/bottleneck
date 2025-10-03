import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { X, Search, Filter } from "lucide-react";
import { cn } from "../../utils/cn";
import { getLabelColors } from "../../utils/labelColors";
import { PullRequest } from "../../services/github";

interface LabelFilterSectionProps {
  theme: "light" | "dark";
  selectedLabels: string[];
  labelFilterMode: "OR" | "AND" | "NOT" | "ONLY";
  onLabelsChange: (labels: string[]) => void;
  onModeChange: (mode: "OR" | "AND" | "NOT" | "ONLY") => void;
  pullRequests: Map<string, PullRequest>;
  selectedRepo: { owner: string; name: string } | null;
}

interface LabelInfo {
  name: string;
  color: string;
  count: number;
}

export function LabelFilterSection({
  theme,
  selectedLabels,
  labelFilterMode,
  onLabelsChange,
  onModeChange,
  pullRequests,
  selectedRepo,
}: LabelFilterSectionProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false);
      }
    };

    if (showDropdown || showModeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showModeDropdown]);

  // Extract available labels from PRs
  const { availableLabels, labelCounts } = useMemo(() => {
    const labelMap = new Map<string, LabelInfo>();
    const counts = new Map<string, number>();

    pullRequests.forEach((pr) => {
      // Only process PRs from the selected repository
      if (selectedRepo && 
          pr.base?.repo?.owner?.login === selectedRepo.owner && 
          pr.base?.repo?.name === selectedRepo.name) {
        pr.labels.forEach((label) => {
          if (!labelMap.has(label.name)) {
            labelMap.set(label.name, {
              name: label.name,
              color: label.color,
              count: 0,
            });
          }
          counts.set(label.name, (counts.get(label.name) || 0) + 1);
        });
      }
    });

    // Update counts
    labelMap.forEach((label) => {
      label.count = counts.get(label.name) || 0;
    });

    // Sort labels by count (descending) then by name
    const sortedLabels = Array.from(labelMap.values()).sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      availableLabels: sortedLabels,
      labelCounts: counts,
    };
  }, [pullRequests, selectedRepo]);

  // Filter labels based on search query
  const filteredLabels = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableLabels;
    }

    const query = searchQuery.toLowerCase();
    return availableLabels.filter((label) =>
      label.name.toLowerCase().includes(query)
    );
  }, [availableLabels, searchQuery]);

  // Quick filter labels (common labels)
  const quickFilterLabels = useMemo(() => {
    const commonLabels = ["bug", "feature", "documentation", "critical", "needs-review", "enhancement", "help-wanted", "good-first-issue"];
    return availableLabels.filter((label) =>
      commonLabels.some((common) => label.name.toLowerCase().includes(common))
    ).slice(0, 5);
  }, [availableLabels]);

  const toggleLabel = useCallback(
    (labelName: string) => {
      if (selectedLabels.includes(labelName)) {
        onLabelsChange(selectedLabels.filter((label) => label !== labelName));
      } else {
        onLabelsChange([...selectedLabels, labelName]);
      }
    },
    [selectedLabels, onLabelsChange],
  );

  const clearAllLabels = useCallback(() => {
    onLabelsChange([]);
  }, [onLabelsChange]);

  const modeOptions = [
    { value: "OR" as const, label: "Any selected (OR)", description: "Show PRs with any selected label" },
    { value: "AND" as const, label: "All selected (AND)", description: "Show PRs with all selected labels" },
    { value: "NOT" as const, label: "Exclude selected (NOT)", description: "Hide PRs with selected labels" },
    { value: "ONLY" as const, label: "Only selected (ONLY)", description: "Show PRs with exactly these labels" },
  ];

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "OR": return "∪";
      case "AND": return "∩";
      case "NOT": return "⊖";
      case "ONLY": return "=";
      default: return "∪";
    }
  };

  const getModeDescription = (mode: string) => {
    const option = modeOptions.find(opt => opt.value === mode);
    return option?.description || "";
  };

  return (
    <div className="space-y-3">
      {/* Label Filter Mode */}
      <div>
        <label
          className={cn(
            "block text-xs font-medium mb-1",
            theme === "dark" ? "text-gray-300" : "text-gray-700",
          )}
        >
          Filter Mode
        </label>
        <div className="relative" ref={modeDropdownRef}>
          <button
            onClick={() => setShowModeDropdown(!showModeDropdown)}
            className={cn(
              "w-full px-3 py-1.5 rounded border flex items-center justify-between text-xs",
              theme === "dark"
                ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
                : "bg-white border-gray-300 hover:bg-gray-100"
            )}
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm font-mono">{getModeIcon(labelFilterMode)}</span>
              <span>{modeOptions.find(opt => opt.value === labelFilterMode)?.label}</span>
            </div>
            <Filter className="w-3 h-3" />
          </button>

          {showModeDropdown && (
            <div
              className={cn(
                "absolute top-full mt-1 left-0 right-0 z-50 rounded-md shadow-lg border",
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              )}
            >
              {modeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onModeChange(option.value);
                    setShowModeDropdown(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md",
                    theme === "dark" ? "text-gray-300" : "text-gray-700",
                    labelFilterMode === option.value && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono">{getModeIcon(option.value)}</span>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs opacity-75">{option.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Label Selection */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            className={cn(
              "text-xs font-medium",
              theme === "dark" ? "text-gray-300" : "text-gray-700",
            )}
          >
            Labels
          </label>
          {selectedLabels.length > 0 && (
            <button
              onClick={clearAllLabels}
              className={cn(
                "text-xs px-2 py-0.5 rounded",
                theme === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-gray-800"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
              )}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Selected Labels Display */}
        {selectedLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedLabels.map((labelName) => {
              const label = availableLabels.find((l) => l.name === labelName);
              if (!label) return null;

              const labelColors = getLabelColors(label.color, theme);
              return (
                <span
                  key={labelName}
                  className="inline-flex items-center px-2 py-1 text-xs rounded"
                  style={{
                    backgroundColor: labelColors.backgroundColor,
                    color: labelColors.color,
                  }}
                >
                  {labelName}
                  <button
                    onClick={() => toggleLabel(labelName)}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Label Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={cn(
              "w-full px-3 py-1.5 rounded border flex items-center justify-between text-xs",
              theme === "dark"
                ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
                : "bg-white border-gray-300 hover:bg-gray-100"
            )}
          >
            <span>
              {selectedLabels.length === 0
                ? "Select labels"
                : `${selectedLabels.length} selected`}
            </span>
            <Filter className="w-3 h-3" />
          </button>

          {showDropdown && (
            <div
              className={cn(
                "absolute top-full mt-1 left-0 right-0 z-50 rounded-md shadow-lg border max-h-64 overflow-hidden",
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              )}
            >
              {/* Search */}
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search labels..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "w-full pl-7 pr-3 py-1 text-xs rounded border",
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-gray-300 placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-700 placeholder-gray-500"
                    )}
                  />
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto">
                {/* Quick Filters */}
                {quickFilterLabels.length > 0 && searchQuery === "" && (
                  <div className="p-2">
                    <div className={cn(
                      "text-xs font-medium mb-1",
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    )}>
                      Quick Filters
                    </div>
                    <div className="space-y-1">
                      {quickFilterLabels.map((label) => {
                        const labelColors = getLabelColors(label.color, theme);
                        return (
                          <button
                            key={label.name}
                            onClick={() => toggleLabel(label.name)}
                            className={cn(
                              "w-full flex items-center justify-between p-2 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700",
                              theme === "dark" ? "text-gray-300" : "text-gray-700"
                            )}
                          >
                            <div className="flex items-center space-x-2">
                              <span
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: `#${label.color}` }}
                              />
                              <span>{label.name}</span>
                            </div>
                            <span className="text-xs opacity-75">({label.count})</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className={cn(
                      "my-2 border-t",
                      theme === "dark" ? "border-gray-700" : "border-gray-200"
                    )} />
                  </div>
                )}

                {/* All Labels */}
                <div className="p-2">
                  <div className={cn(
                    "text-xs font-medium mb-1",
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  )}>
                    {searchQuery ? "Search Results" : `All Labels (${availableLabels.length})`}
                  </div>
                  <div className="space-y-1">
                    {filteredLabels.length === 0 ? (
                      <div className={cn(
                        "p-2 text-xs text-center",
                        theme === "dark" ? "text-gray-500" : "text-gray-500"
                      )}>
                        {searchQuery ? "No labels found" : "No labels available"}
                      </div>
                    ) : (
                      filteredLabels.map((label) => {
                        const labelColors = getLabelColors(label.color, theme);
                        const isSelected = selectedLabels.includes(label.name);
                        return (
                          <button
                            key={label.name}
                            onClick={() => toggleLabel(label.name)}
                            className={cn(
                              "w-full flex items-center justify-between p-2 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700",
                              theme === "dark" ? "text-gray-300" : "text-gray-700",
                              isSelected && "bg-blue-50 dark:bg-blue-900/20"
                            )}
                          >
                            <div className="flex items-center space-x-2">
                              <span
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: `#${label.color}` }}
                              />
                              <span>{label.name}</span>
                            </div>
                            <span className="text-xs opacity-75">({label.count})</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* No Label Option */}
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => toggleLabel("__no_label__")}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700",
                      theme === "dark" ? "text-gray-300" : "text-gray-700",
                      selectedLabels.includes("__no_label__") && "bg-blue-50 dark:bg-blue-900/20"
                    )}
                  >
                    <span>No Label</span>
                    <span className="text-xs opacity-75">
                      ({Array.from(pullRequests.values()).filter(pr => 
                        selectedRepo && 
                        pr.base?.repo?.owner?.login === selectedRepo.owner && 
                        pr.base?.repo?.name === selectedRepo.name &&
                        pr.labels.length === 0
                      ).length})
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}