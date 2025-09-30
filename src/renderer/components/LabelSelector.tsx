import React, { useState, useRef, useEffect } from "react";
import { Check, X, Tag, Plus } from "lucide-react";
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
  onCreateLabel?: (name: string, color: string, description?: string) => Promise<void>;
  onApply?: () => void;
  className?: string;
  showApplyButton?: boolean;
}

export default function LabelSelector({
  availableLabels,
  selectedLabels,
  onAddLabel,
  onRemoveLabel,
  onCreateLabel,
  onApply,
  className,
  showApplyButton = false,
}: LabelSelectorProps) {
  const { theme } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("0366d6");
  const [newLabelDescription, setNewLabelDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
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

  const handleCreateLabel = async () => {
    if (!newLabelName.trim() || !onCreateLabel) return;

    setIsCreating(true);
    try {
      await onCreateLabel(
        newLabelName.trim(),
        newLabelColor.replace("#", ""),
        newLabelDescription.trim() || undefined
      );
      // Reset form
      setNewLabelName("");
      setNewLabelColor("0366d6");
      setNewLabelDescription("");
      setShowCreateForm(false);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to create label:", error);
      alert("Failed to create label: " + (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-xs transition-colors cursor-pointer",
          theme === "dark"
            ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
        )}
      >
        <Tag className="w-3 h-3" />
        <span>Labels</span>
        {selectedLabels.length > 0 && (
          <span
            className={cn(
              "ml-1 px-1.5 py-0.5 text-[10px] rounded-full",
              theme === "dark" ? "bg-gray-600" : "bg-gray-300"
            )}
          >
            {selectedLabels.length}
          </span>
        )}
      </div>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-1 w-72 rounded-md shadow-lg border z-50",
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          )}
        >
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              placeholder="Search labels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full px-2.5 py-1.5 text-xs rounded border",
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              )}
              autoFocus
            />
          </div>

          {/* Create new label button */}
          {onCreateLabel && !showCreateForm && (
            <div className={cn("p-2 border-b", theme === "dark" ? "border-gray-700" : "border-gray-200")}>
              <div
                onClick={() => setShowCreateForm(true)}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer flex items-center justify-center space-x-1.5",
                  theme === "dark"
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                )}
              >
                <Plus className="w-3 h-3" />
                <span>Create new label</span>
              </div>
            </div>
          )}

          {/* Create label form */}
          {showCreateForm && (
            <div className={cn("p-2 border-b", theme === "dark" ? "border-gray-700" : "border-gray-200")}>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Label name"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className={cn(
                    "w-full px-2.5 py-1.5 text-xs rounded border",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  )}
                  autoFocus
                />
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <input
                      type="color"
                      value={`#${newLabelColor}`}
                      onChange={(e) => setNewLabelColor(e.target.value.replace("#", ""))}
                      className="absolute opacity-0 w-8 h-6 cursor-pointer"
                      id="label-color-picker"
                    />
                    <label
                      htmlFor="label-color-picker"
                      className={cn(
                        "block w-8 h-6 rounded cursor-pointer border",
                        theme === "dark" ? "border-gray-600" : "border-gray-300"
                      )}
                      style={{ backgroundColor: `#${newLabelColor}` }}
                    />
                  </div>
                  <div className="flex items-center flex-1">
                    <span className={cn(
                      "text-xs mr-1",
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    )}>#</span>
                    <input
                      type="text"
                      placeholder="0366d6"
                      value={newLabelColor}
                      onChange={(e) => {
                        const value = e.target.value.replace("#", "").replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                        setNewLabelColor(value);
                      }}
                      className={cn(
                        "flex-1 px-2.5 py-1 text-xs rounded border",
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                      )}
                      maxLength={6}
                    />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newLabelDescription}
                  onChange={(e) => setNewLabelDescription(e.target.value)}
                  className={cn(
                    "w-full px-2.5 py-1.5 text-xs rounded border",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  )}
                />
                <div className="flex items-center space-x-2">
                  <div
                    onClick={handleCreateLabel}
                    className={cn(
                      "flex-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer text-center",
                      isCreating
                        ? "bg-blue-600 text-white opacity-50 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    )}
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </div>
                  <div
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewLabelName("");
                      setNewLabelColor("0366d6");
                      setNewLabelDescription("");
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer",
                      theme === "dark"
                        ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                        : "text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    Cancel
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto">
            {filteredLabels.length === 0 ? (
              <div
                className={cn(
                  "px-2.5 py-3 text-xs text-center",
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
                  <div
                    key={label.name}
                    onClick={() => {
                      if (isSelected) {
                        onRemoveLabel(label.name);
                      } else {
                        onAddLabel(label.name);
                      }
                    }}
                    className={cn(
                      "w-full px-2.5 py-1.5 flex items-center justify-between text-left transition-colors cursor-pointer",
                      theme === "dark"
                        ? "hover:bg-gray-700"
                        : "hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: `#${label.color}` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className="text-xs font-medium px-1.5 py-0.5 rounded"
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
                              "text-[10px] mt-0.5 truncate",
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            )}
                          >
                            {label.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {showApplyButton && selectedLabels.length > 0 && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              <div
                onClick={() => {
                  onApply?.();
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer text-center",
                  "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                Apply Labels
              </div>
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
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveLabel(labelName);
                  }}
                  className="ml-1 hover:opacity-70 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </div>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}