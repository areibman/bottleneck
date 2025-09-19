import { useMemo, useCallback } from "react";
import { X } from "lucide-react";
import Dropdown, { DropdownOption } from "../Dropdown";
import { cn } from "../../utils/cn";
import type { IssueFilters } from "../../stores/issueStore";
import type { Issue } from "../../services/github";

interface IssueFiltersSectionProps {
  theme: "light" | "dark";
  filters: IssueFilters;
  setFilter: (key: keyof IssueFilters, value: IssueFilters[keyof IssueFilters]) => void;
  resetFilters: () => void;
  issues: Map<string, Issue>;
}

export function IssueFiltersSection({
  theme,
  filters,
  setFilter,
  resetFilters,
  issues,
}: IssueFiltersSectionProps) {
  const { availableLabels, availableAssignees } = useMemo(() => {
    const labelMap = new Map<string, { name: string; color: string }>();
    const assigneeMap = new Map<string, { login: string; avatar_url: string }>();

    issues.forEach((issue) => {
      issue.labels.forEach((label) => {
        if (!labelMap.has(label.name)) {
          labelMap.set(label.name, label);
        }
      });

      issue.assignees.forEach((assignee) => {
        if (!assigneeMap.has(assignee.login)) {
          assigneeMap.set(assignee.login, assignee);
        }
      });
    });

    const sortedLabels = Array.from(labelMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const sortedAssignees = Array.from(assigneeMap.values()).sort((a, b) =>
      a.login.localeCompare(b.login),
    );

    return {
      availableLabels: sortedLabels,
      availableAssignees: sortedAssignees,
    };
  }, [issues]);

  const toggleLabel = useCallback(
    (labelName: string) => {
      setFilter(
        "labels",
        filters.labels.includes(labelName)
          ? filters.labels.filter((label) => label !== labelName)
          : [...filters.labels, labelName],
      );
    },
    [filters.labels, setFilter],
  );

  const labelDropdownOptions = useMemo((): DropdownOption[] => {
    if (availableLabels.length === 0) {
      return [{ value: "none", label: "No labels available" }];
    }

    return [
      { value: "manage", label: "Manage labels..." },
      ...availableLabels.map((label) => ({
        value: label.name,
        label: label.name,
        icon: (
          <span
            className="w-3 h-3 rounded inline-block"
            style={{ backgroundColor: `#${label.color}` }}
          />
        ),
      })),
    ];
  }, [availableLabels]);

  const handleLabelDropdownChange = useCallback(
    (value: string) => {
      if (value === "manage" || value === "none") {
        return;
      }

      toggleLabel(value);
    },
    [toggleLabel],
  );

  const assigneeDropdownOptions = useMemo((): DropdownOption[] => {
    const baseOptions: DropdownOption[] = [
      { value: "all", label: "All Issues" },
      { value: "assigned", label: "Assigned" },
      { value: "unassigned", label: "Unassigned" },
    ];

    if (availableAssignees.length === 0) {
      return baseOptions;
    }

    return [
      ...baseOptions,
      ...availableAssignees.map((assignee) => ({
        value: assignee.login,
        label: assignee.login,
        icon: (
          <img
            src={assignee.avatar_url}
            alt={assignee.login}
            className="w-4 h-4 rounded-full"
          />
        ),
      })),
    ];
  }, [availableAssignees]);

  const showResetButton =
    filters.status !== "all" || filters.labels.length > 0 || filters.assignee !== "all";

  return (
    <div
      className={cn(
        "px-4 py-2 border-t",
        theme === "dark" ? "border-gray-700" : "border-gray-200",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h3
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            theme === "dark" ? "text-gray-400" : "text-gray-600",
          )}
        >
          Filters
        </h3>
        {showResetButton && (
          <button
            onClick={resetFilters}
            className={cn(
              "text-xs px-2 py-1 rounded",
              theme === "dark"
                ? "text-gray-400 hover:text-white hover:bg-gray-800"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
            )}
          >
            Reset
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label
            className={cn(
              "block text-xs font-medium mb-1",
              theme === "dark" ? "text-gray-300" : "text-gray-700",
            )}
          >
            Status
          </label>
          <div className="space-y-1">
            {["all", "open", "closed"].map((status) => (
              <label key={status} className="flex items-center">
                <input
                  type="radio"
                  name="issue-status"
                  value={status}
                  checked={filters.status === status}
                  onChange={(event) =>
                    setFilter("status", event.target.value as IssueFilters["status"])
                  }
                  className="mr-2"
                />
                <span
                  className={cn(
                    "text-sm capitalize",
                    theme === "dark" ? "text-gray-300" : "text-gray-700",
                  )}
                >
                  {status === "all" ? "All Issues" : status}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label
            className={cn(
              "block text-xs font-medium mb-1",
              theme === "dark" ? "text-gray-300" : "text-gray-700",
            )}
          >
            Labels
          </label>
          <Dropdown
            options={labelDropdownOptions}
            value={filters.labels.length > 0 ? "manage" : "manage"}
            onChange={handleLabelDropdownChange}
            buttonClassName="text-xs"
            menuClassName="max-h-48 overflow-y-auto"
            labelPrefix={
              filters.labels.length > 0
                ? `${filters.labels.length} selected`
                : "Select labels"
            }
            useLabelPrefixAsDisplay
          />

          {filters.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {filters.labels.map((labelName) => {
                const label = availableLabels.find((item) => item.name === labelName);
                if (!label) {
                  return null;
                }

                return (
                  <span
                    key={labelName}
                    className="inline-flex items-center px-1 py-0.5 text-xs rounded"
                    style={{
                      backgroundColor: `#${label.color}30`,
                      color: `#${label.color}`,
                    }}
                  >
                    {labelName}
                    <button
                      onClick={() => toggleLabel(labelName)}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label
            className={cn(
              "block text-xs font-medium mb-1",
              theme === "dark" ? "text-gray-300" : "text-gray-700",
            )}
          >
            Assignee
          </label>
          <Dropdown
            options={assigneeDropdownOptions}
            value={filters.assignee}
            onChange={(value) => setFilter("assignee", value as IssueFilters["assignee"])}
            buttonClassName="text-xs"
            menuClassName="max-h-48 overflow-y-auto"
          />
        </div>
      </div>
    </div>
  );
}
