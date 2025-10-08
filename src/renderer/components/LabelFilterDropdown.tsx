import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Check, ChevronDown, Filter, Tag } from "lucide-react";
import { cn } from "../utils/cn";
import { getLabelColors } from "../utils/labelColors";

interface Label {
  name: string;
  color: string;
}

export type LabelFilterMode = "or" | "and" | "not" | "only";

interface LabelFilterDropdownProps {
  labels: Label[];
  selectedLabels: string[];
  labelFilterMode: LabelFilterMode;
  includeNoLabels: boolean;
  onLabelsChange: (labels: string[]) => void;
  onModeChange: (mode: LabelFilterMode) => void;
  onIncludeNoLabelsChange: (include: boolean) => void;
  theme: "light" | "dark";
  prCounts?: Map<string, number>;
  className?: string;
}

const quickFilterLabels = [
  { name: "bug", icon: "🐛" },
  { name: "feature", icon: "✨" },
  { name: "documentation", icon: "📝" },
  { name: "critical", icon: "🚨" },
  { name: "needs-review", icon: "👀" },
];

const filterModeOptions: { value: LabelFilterMode; label: string; description: string }[] = [
  { value: "or", label: "Any (OR)", description: "PRs with any selected label" },
  { value: "and", label: "All (AND)", description: "PRs with all selected labels" },
  { value: "not", label: "Exclude (NOT)", description: "PRs without selected labels" },
  { value: "only", label: "Exactly (ONLY)", description: "PRs with only these labels" },
];

export function LabelFilterDropdown({
  labels,
  selectedLabels,
  labelFilterMode,
  includeNoLabels,
  onLabelsChange,
  onModeChange,
  onIncludeNoLabelsChange,
  theme,
  prCounts,
  className,
}: LabelFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModeSelector, setShowModeSelector] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowModeSelector(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Group labels by frequency/importance
  const { quickFilters, frequentLabels, allLabels } = useMemo(() => {
    const labelMap = new Map(labels.map(l => [l.name.toLowerCase(), l]));
    
    // Quick filters that exist in the repo
    const quick = quickFilterLabels
      .filter(qf => labelMap.has(qf.name))
      .map(qf => ({ ...labelMap.get(qf.name)!, icon: qf.icon }));

    // Sort labels by PR count if available, otherwise alphabetically
    const sortedLabels = [...labels].sort((a, b) => {
      if (prCounts) {
        const countA = prCounts.get(a.name) || 0;
        const countB = prCounts.get(b.name) || 0;
        if (countA !== countB) return countB - countA;
      }
      return a.name.localeCompare(b.name);
    });

    // Get top 5 most frequent labels (excluding quick filters)
    const quickNames = new Set(quick.map(q => q.name.toLowerCase()));
    const frequent = sortedLabels
      .filter(l => !quickNames.has(l.name.toLowerCase()))
      .slice(0, 5);

    return {
      quickFilters: quick,
      frequentLabels: frequent,
      allLabels: sortedLabels,
    };
  }, [labels, prCounts]);

  // Filter labels based on search term
  const filteredLabels = useMemo(() => {
    if (!searchTerm) return allLabels;
    
    const term = searchTerm.toLowerCase();
    return allLabels.filter(label => 
      label.name.toLowerCase().includes(term)
    );
  }, [allLabels, searchTerm]);

  const toggleLabel = useCallback((labelName: string) => {
    const newLabels = selectedLabels.includes(labelName)
      ? selectedLabels.filter(l => l !== labelName)
      : [...selectedLabels, labelName];
    onLabelsChange(newLabels);
  }, [selectedLabels, onLabelsChange]);

  const clearAll = useCallback(() => {
    onLabelsChange([]);
    onIncludeNoLabelsChange(false);
  }, [onLabelsChange, onIncludeNoLabelsChange]);

  const selectAll = useCallback(() => {
    onLabelsChange(labels.map(l => l.name));
  }, [labels, onLabelsChange]);

  const hasSelection = selectedLabels.length > 0 || includeNoLabels;

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-3 py-1.5 rounded border flex items-center space-x-2 text-xs min-w-[140px] max-w-[250px]",
          theme === "dark"
            ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
            : "bg-white border-gray-300 hover:bg-gray-100",
          hasSelection && (theme === "dark" ? "border-blue-500" : "border-blue-400")
        )}
      >
        <Tag className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">
          {!hasSelection ? (
            "Labels"
          ) : includeNoLabels && selectedLabels.length === 0 ? (
            "No labels"
          ) : (
            <>
              {selectedLabels.length} label{selectedLabels.length !== 1 ? "s" : ""}
              {includeNoLabels && " + no labels"}
            </>
          )}
        </span>
        <ChevronDown className={cn(
          "w-3 h-3 flex-shrink-0 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-1 right-0 z-50 w-80 rounded-md shadow-lg border",
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          )}
        >
          {/* Search and Controls */}
          <div className="p-3 border-b" style={{ borderColor: theme === "dark" ? "#374151" : "#e5e7eb" }}>
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search labels..."
                  className={cn(
                    "w-full pl-7 pr-2 py-1 text-xs rounded border",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  )}
                />
              </div>
              
              {/* Filter Mode Button */}
              <button
                onClick={() => setShowModeSelector(!showModeSelector)}
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium flex items-center space-x-1",
                  theme === "dark"
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                )}
                title="Filter mode"
              >
                <Filter className="w-3 h-3" />
                <span>{filterModeOptions.find(o => o.value === labelFilterMode)?.label}</span>
              </button>
            </div>

            {/* Mode Selector */}
            {showModeSelector && (
              <div className={cn(
                "mt-2 p-2 rounded border",
                theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
              )}>
                <div className="space-y-1">
                  {filterModeOptions.map(option => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-start space-x-2 p-1 rounded cursor-pointer",
                        theme === "dark" ? "hover:bg-gray-600" : "hover:bg-gray-100"
                      )}
                    >
                      <input
                        type="radio"
                        name="labelFilterMode"
                        value={option.value}
                        checked={labelFilterMode === option.value}
                        onChange={() => {
                          onModeChange(option.value);
                          setShowModeSelector(false);
                        }}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-medium">{option.label}</div>
                        <div className={cn(
                          "text-xs",
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        )}>
                          {option.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={selectAll}
                  className={cn(
                    "text-xs",
                    theme === "dark"
                      ? "text-blue-400 hover:text-blue-300"
                      : "text-blue-600 hover:text-blue-700"
                  )}
                >
                  Select all
                </button>
                {hasSelection && (
                  <button
                    onClick={clearAll}
                    className={cn(
                      "text-xs",
                      theme === "dark"
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-600 hover:text-gray-700"
                    )}
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              {/* Selected count */}
              {selectedLabels.length > 0 && (
                <span className={cn(
                  "text-xs",
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                )}>
                  {selectedLabels.length} selected
                </span>
              )}
            </div>
          </div>

          {/* Label List */}
          <div className="max-h-96 overflow-y-auto">
            {/* Quick Filters */}
            {!searchTerm && quickFilters.length > 0 && (
              <div className="p-2 border-b" style={{ borderColor: theme === "dark" ? "#374151" : "#e5e7eb" }}>
                <div className={cn(
                  "text-xs font-semibold mb-1 px-2",
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                )}>
                  Quick Filters
                </div>
                {quickFilters.map(label => (
                  <LabelItem
                    key={label.name}
                    label={label}
                    isSelected={selectedLabels.includes(label.name)}
                    onToggle={toggleLabel}
                    theme={theme}
                    prCount={prCounts?.get(label.name)}
                    icon={label.icon}
                  />
                ))}
              </div>
            )}

            {/* Frequent Labels */}
            {!searchTerm && frequentLabels.length > 0 && (
              <div className="p-2 border-b" style={{ borderColor: theme === "dark" ? "#374151" : "#e5e7eb" }}>
                <div className={cn(
                  "text-xs font-semibold mb-1 px-2",
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                )}>
                  Frequently Used
                </div>
                {frequentLabels.map(label => (
                  <LabelItem
                    key={label.name}
                    label={label}
                    isSelected={selectedLabels.includes(label.name)}
                    onToggle={toggleLabel}
                    theme={theme}
                    prCount={prCounts?.get(label.name)}
                  />
                ))}
              </div>
            )}

            {/* All Labels */}
            <div className="p-2">
              {!searchTerm && (
                <div className={cn(
                  "text-xs font-semibold mb-1 px-2",
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                )}>
                  All Labels ({filteredLabels.length})
                </div>
              )}
              
              {filteredLabels.length === 0 ? (
                <div className={cn(
                  "text-xs text-center py-4",
                  theme === "dark" ? "text-gray-500" : "text-gray-400"
                )}>
                  No labels found
                </div>
              ) : (
                filteredLabels.map(label => (
                  <LabelItem
                    key={label.name}
                    label={label}
                    isSelected={selectedLabels.includes(label.name)}
                    onToggle={toggleLabel}
                    theme={theme}
                    prCount={prCounts?.get(label.name)}
                  />
                ))
              )}
            </div>

            {/* No Labels Option */}
            <div className="p-2 border-t" style={{ borderColor: theme === "dark" ? "#374151" : "#e5e7eb" }}>
              <label
                className={cn(
                  "flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer",
                  theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={includeNoLabels}
                  onChange={(e) => onIncludeNoLabelsChange(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">PRs without any labels</span>
                {prCounts?.has("__no_labels__") && (
                  <span className={cn(
                    "text-xs ml-auto",
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  )}>
                    ({prCounts.get("__no_labels__")})
                  </span>
                )}
              </label>
            </div>
          </div>

          {/* Selected Labels Display */}
          {selectedLabels.length > 0 && (
            <div className="p-2 border-t" style={{ borderColor: theme === "dark" ? "#374151" : "#e5e7eb" }}>
              <div className={cn(
                "text-xs font-semibold mb-1",
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              )}>
                Selected Labels
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedLabels.map(labelName => {
                  const label = labels.find(l => l.name === labelName);
                  if (!label) return null;
                  
                  const colors = getLabelColors(label.color, theme);
                  return (
                    <span
                      key={labelName}
                      className="inline-flex items-center px-2 py-0.5 text-xs rounded"
                      style={{
                        backgroundColor: colors.backgroundColor,
                        color: colors.color,
                      }}
                    >
                      {labelName}
                      <button
                        onClick={() => toggleLabel(labelName)}
                        className="ml-1 hover:opacity-70"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface LabelItemProps {
  label: Label;
  isSelected: boolean;
  onToggle: (labelName: string) => void;
  theme: "light" | "dark";
  prCount?: number;
  icon?: string;
}

function LabelItem({ label, isSelected, onToggle, theme, prCount, icon }: LabelItemProps) {
  const colors = getLabelColors(label.color, theme);
  
  return (
    <label
      className={cn(
        "flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer",
        theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50",
        isSelected && (theme === "dark" ? "bg-gray-700" : "bg-gray-50")
      )}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggle(label.name)}
        className="rounded"
      />
      
      {icon && <span className="text-sm">{icon}</span>}
      
      <span
        className="inline-flex items-center px-2 py-0.5 text-xs rounded flex-1"
        style={{
          backgroundColor: colors.backgroundColor,
          color: colors.color,
        }}
      >
        {label.name}
      </span>
      
      {prCount !== undefined && (
        <span className={cn(
          "text-xs",
          theme === "dark" ? "text-gray-500" : "text-gray-400"
        )}>
          ({prCount})
        </span>
      )}
      
      {isSelected && (
        <Check className="w-3 h-3 text-blue-500" />
      )}
    </label>
  );
}