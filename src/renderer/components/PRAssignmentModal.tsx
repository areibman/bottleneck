import React, { useState, useMemo } from "react";
import { X } from "lucide-react";
import { PullRequest } from "../services/github";
import { cn } from "../utils/cn";
import { getPRMetadata, groupPRsByPrefix } from "../utils/prGrouping";
import { PRTreeView } from "./PRTreeView";
import "react-complex-tree/lib/style-modern.css";
import "./PRTreeView.css";

interface PRAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (prNumbers: number[]) => void;
    availablePRs: PullRequest[];
    issueNumber: number;
    issueTitle: string;
    theme: "light" | "dark";
}

export function PRAssignmentModal({
    isOpen,
    onClose,
    onAssign,
    availablePRs,
    issueNumber,
    issueTitle,
    theme,
}: PRAssignmentModalProps) {
    const [selectedPRs, setSelectedPRs] = useState<Set<string>>(new Set());
    const [showAssigned, setShowAssigned] = useState(false);
    const [showClosed, setShowClosed] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

    // Debounce search query to prevent flickering
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const prsWithMetadata = useMemo(() => {
        const metadata = availablePRs.map(pr => getPRMetadata(pr));
        console.log(`[PR Assignment Modal] 📋 Total PRs available: ${availablePRs.length}`);
        return metadata;
    }, [availablePRs]);

    const filteredPRs = useMemo(() => {
        let filtered = prsWithMetadata;

        // Apply search filter first (most restrictive)
        if (debouncedSearchQuery.trim()) {
            const query = debouncedSearchQuery.toLowerCase().trim();
            const matchingPrefixes = new Set<string>();

            // Find which groups have matching PRs
            const allGrouped = groupPRsByPrefix(prsWithMetadata);
            for (const [prefix, groupPRs] of allGrouped) {
                const hasMatch = groupPRs.some(prMeta => {
                    const title = prMeta.pr.title.toLowerCase();
                    const number = `${prMeta.pr.number}`;
                    const branchName = prMeta.pr.head?.ref?.toLowerCase() || '';

                    // Match against title, PR number, or branch name
                    return title.includes(query) ||
                        number.includes(query) ||
                        branchName.includes(query);
                });

                if (hasMatch) {
                    matchingPrefixes.add(prefix);
                }
            }

            // Include all PRs from matching groups
            filtered = filtered.filter(prMeta =>
                matchingPrefixes.has(prMeta.titlePrefix)
            );
        }

        // Then apply checkbox filters
        filtered = filtered.filter(prMeta => {
            const pr = prMeta.pr;

            // Filter by assigned status
            if (!showAssigned && pr.linkedIssueNumber) {
                return false;
            }

            // Filter by closed status
            if (!showClosed && (pr.state === "closed" || pr.merged)) {
                return false;
            }

            return true;
        });

        return filtered;
    }, [prsWithMetadata, showAssigned, showClosed, debouncedSearchQuery]);

    const handleTogglePRSelection = (prId: string, checked: boolean) => {
        const newSelected = new Set(selectedPRs);
        if (checked) {
            newSelected.add(prId);
        } else {
            newSelected.delete(prId);
        }
        setSelectedPRs(newSelected);
    };

    const handleToggleGroupSelection = (prIds: string[], checked: boolean) => {
        const newSelected = new Set(selectedPRs);
        if (checked) {
            prIds.forEach(id => newSelected.add(id));
        } else {
            prIds.forEach(id => newSelected.delete(id));
        }
        setSelectedPRs(newSelected);
    };

    const handlePRClick = (pr: PullRequest) => {
        // In modal context, just toggle selection instead of navigating
        const prId = `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;
        handleTogglePRSelection(prId, !selectedPRs.has(prId));
    };

    const handleSelectAllInGroup = (prIds: string[]) => {
        // Repurpose the "close group" button to select all PRs in the group
        const allSelected = prIds.every(id => selectedPRs.has(id));
        handleToggleGroupSelection(prIds, !allSelected);
    };

    const handleAssign = () => {
        // Convert PR IDs to PR numbers
        const prNumbers = Array.from(selectedPRs).map(prId => {
            return parseInt(prId.split('#').pop() || '0');
        });
        onAssign(prNumbers);
        setSelectedPRs(new Set());
        setSearchQuery("");
        setDebouncedSearchQuery("");
    };

    // Reset search when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setSearchQuery("");
            setDebouncedSearchQuery("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
                className={cn(
                    "rounded-lg shadow-xl max-w-4xl w-full mx-4 flex flex-col",
                    theme === "dark" ? "bg-gray-800" : "bg-white"
                )}
                style={{ height: "80vh" }}
            >
                {/* Header */}
                <div className={cn(
                    "p-4 border-b",
                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                )}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0 mr-4">
                            <h3 className="text-lg font-semibold">
                                Assign PRs to Issue #{issueNumber}
                            </h3>
                            <p className={cn(
                                "text-sm mt-0.5 truncate",
                                theme === "dark" ? "text-gray-400" : "text-gray-600"
                            )}>
                                {issueTitle}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className={cn(
                                "p-1 rounded hover:bg-opacity-80 flex-shrink-0",
                                theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
                            )}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <input
                        type="text"
                        placeholder="Search PR title, number, or branch..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn(
                            "w-full px-3 py-2 rounded-md border text-sm",
                            theme === "dark"
                                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500",
                            "focus:outline-none focus:ring-1 focus:ring-blue-500"
                        )}
                    />
                </div>

                {/* Filter toggles */}
                <div className={cn(
                    "flex items-center justify-between px-4 py-2 border-b",
                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                )}>
                    <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showAssigned}
                                onChange={(e) => setShowAssigned(e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-sm">Show Already Assigned PRs</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showClosed}
                                onChange={(e) => setShowClosed(e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-sm">Show Closed/Merged PRs</span>
                        </label>
                    </div>
                    <span className={cn(
                        "text-sm",
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                    )}>
                        {searchQuery !== debouncedSearchQuery ? (
                            <span className="italic">Searching...</span>
                        ) : (
                            <>{filteredPRs.length} PR{filteredPRs.length !== 1 ? 's' : ''} found</>
                        )}
                    </span>
                </div>

                {/* PR Tree */}
                <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                    {filteredPRs.length === 0 ? (
                        <div className={cn(
                            "flex items-center justify-center h-full",
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                        )}>
                            <div className="text-center py-8">
                                <p>No PRs available to assign.</p>
                                <p className="text-sm mt-2">
                                    Try toggling the filters above to see more PRs.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <PRTreeView
                            key={`${debouncedSearchQuery}-${showAssigned}-${showClosed}-${filteredPRs.length}`}
                            theme={theme}
                            prsWithMetadata={filteredPRs}
                            selectedPRs={selectedPRs}
                            sortBy="updated"
                            onTogglePRSelection={handleTogglePRSelection}
                            onToggleGroupSelection={handleToggleGroupSelection}
                            onPRClick={handlePRClick}
                            onCloseGroup={handleSelectAllInGroup}
                            groupActionLabel="Select all in group"
                        />
                    )}
                </div>

                {/* Footer */}
                <div className={cn(
                    "flex items-center justify-between p-4 border-t",
                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                )}>
                    <div className="flex items-center space-x-3">
                        <span className="text-sm">
                            {selectedPRs.size} PR{selectedPRs.size !== 1 ? 's' : ''} selected
                        </span>
                        {selectedPRs.size > 0 && (
                            <button
                                onClick={() => setSelectedPRs(new Set())}
                                className={cn(
                                    "text-xs px-2 py-1 rounded transition-colors",
                                    theme === "dark"
                                        ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                                        : "text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={onClose}
                            className={cn(
                                "px-4 py-2 rounded text-sm",
                                theme === "dark"
                                    ? "bg-gray-700 hover:bg-gray-600"
                                    : "bg-gray-200 hover:bg-gray-300"
                            )}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAssign}
                            disabled={selectedPRs.size === 0}
                            className={cn(
                                "px-4 py-2 rounded text-sm text-white",
                                selectedPRs.size === 0
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700"
                            )}
                        >
                            Assign Selected
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
