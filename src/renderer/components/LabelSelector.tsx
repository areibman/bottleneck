import React, { useState, useRef, useEffect } from "react";
import { Check, X, Tag } from "lucide-react";
import { cn } from "../utils/cn";
import { getLabelColors } from "../utils/labelColors";
import { useUIStore } from "../stores/uiStore";

interface Label {
  name: string;
  color: string;
  description?: string | null;
}

interface LabelSelectorProps {
  availableLabels: Label[];
  selectedLabels: string[];
  onAddLabel: (label: string) => void;
  onRemoveLabel: (label: string) => void;
  onApply?: () => void;
  className?: string;
  showApplyButton?: boolean;
}

export default function LabelSelector({
  availableLabels,
  selectedLabels,
  onAddLabel,
  onRemoveLabel,
  onApply,
  className,
  showApplyButton = false,
}: LabelSelectorProps) {
  const { theme } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredLabels = availableLabels.filter((label) =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedSet = new Set(selectedLabels);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-2 px-3 py-1.5 rounded text-sm transition-colors",
          theme === "dark"
            ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
        )}
      >
        <Tag className="w-4 h-4" />
        <span>Labels</span>
        {selectedLabels.length > 0 && (
          <span
            className={cn(
              "ml-1 px-1.5 py-0.5 text-xs rounded-full",
              theme === "dark" ? "bg-gray-600" : "bg-gray-300"
            )}
          >
            {selectedLabels.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-2 w-80 rounded-lg shadow-lg border z-50",
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          )}
        >
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              placeholder="Search labels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full px-3 py-1.5 text-sm rounded border",
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              )}
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredLabels.length === 0 ? (
              <div
                className={cn(
                  "px-3 py-4 text-sm text-center",
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                )}
              >
                No labels found
              </div>
            ) : (
              filteredLabels.map((label) => {
                const isSelected = selectedSet.has(label.name);
                const labelColors = getLabelColors(label.color, theme);

                return (
                  <button
                    key={label.name}
                    onClick={() => {
                      if (isSelected) {
                        onRemoveLabel(label.name);
                      } else {
                        onAddLabel(label.name);
                      }
                    }}
                    className={cn(
                      "w-full px-3 py-2 flex items-center justify-between text-left transition-colors",
                      theme === "dark"
                        ? "hover:bg-gray-700"
                        : "hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: `#${label.color}` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span
                            className="text-sm font-medium px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: labelColors.backgroundColor,
                              color: labelColors.color,
                            }}
                          >
                            {label.name}
                          </span>
                        </div>
                        {label.description && (
                          <p
                            className={cn(
                              "text-xs mt-0.5 truncate",
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            )}
                          >
                            {label.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {showApplyButton && selectedLabels.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  onApply?.();
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-1.5 rounded text-sm font-medium transition-colors",
                  "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                Apply Labels
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected labels display */}
      {selectedLabels.length > 0 && !isOpen && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedLabels.map((labelName) => {
            const label = availableLabels.find((l) => l.name === labelName);
            if (!label) return null;
            const labelColors = getLabelColors(label.color, theme);

            return (
              <span
                key={labelName}
                className="inline-flex items-center px-2 py-0.5 text-xs rounded font-medium"
                style={{
                  backgroundColor: labelColors.backgroundColor,
                  color: labelColors.color,
                }}
              >
                {labelName}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveLabel(labelName);
                  }}
                  className="ml-1 hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}