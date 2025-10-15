import React, { useState, useMemo, useRef } from "react";
import { X, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { PullRequest } from "../services/github";
import { cn } from "../utils/cn";
import { getPRMetadata, groupPRsByPrefix } from "../utils/prGrouping";
import { PRTreeView } from "./PRTreeView";
import {
    UncontrolledMarkdownEditor,
    UncontrolledMarkdownEditorRef,
} from "./UncontrolledMarkdownEditor";
import LabelSelector from "./LabelSelector";

interface IssueCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (
        title: string,
        body: string,
        labels: string[],
        prNumbers: number[]
    ) => Promise<void>;
    availablePRs: PullRequest[];
    availableLabels: Array<{ name: string; color: string; description: string | null }>;
    theme: "light" | "dark";
    repoOwner: string;
    repoName: string;
}

export function IssueCreatorModal({
    isOpen,
    onClose,
    onCreate,
    availablePRs,
    availableLabels,
    theme,
    repoOwner,
    repoName,
}: IssueCreatorModalProps) {
    const [title, setTitle] = useState("");
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [selectedPRs, setSelectedPRs] = useState<Set<string>>(new Set());
    const [showPRSection, setShowPRSection] = useState(false);
    const [showAssigned, setShowAssigned] = useState(false);
    const [showClosed, setShowClosed] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const descriptionEditorRef = useRef<UncontrolledMarkdownEditorRef>(null);

    // Debounce search query
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const prsWithMetadata = useMemo(() => {
        return availablePRs.map((pr) => getPRMetadata(pr));
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
                const hasMatch = groupPRs.some((prMeta) => {
                    const title = prMeta.pr.title.toLowerCase();
                    const number = `${prMeta.pr.number}`;
                    const branchName = prMeta.pr.head?.ref?.toLowerCase() || "";

                    // Match against title, PR number, or branch name
                    return (
                        title.includes(query) ||
                        number.includes(query) ||
                        branchName.includes(query)
                    );
                });

                if (hasMatch) {
                    matchingPrefixes.add(prefix);
                }
            }

            // Include all PRs from matching groups
            filtered = filtered.filter((prMeta) =>
                matchingPrefixes.has(prMeta.titlePrefix)
            );
        }

        // Then apply checkbox filters
        filtered = filtered.filter((prMeta) => {
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
            prIds.forEach((id) => newSelected.add(id));
        } else {
            prIds.forEach((id) => newSelected.delete(id));
        }
        setSelectedPRs(newSelected);
    };

    const handlePRClick = (pr: PullRequest) => {
        const prId = `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;
        handleTogglePRSelection(prId, !selectedPRs.has(prId));
    };

    const handleSelectAllInGroup = (prIds: string[]) => {
        const allSelected = prIds.every((id) => selectedPRs.has(id));
        handleToggleGroupSelection(prIds, !allSelected);
    };

    const handleCreate = async () => {
        if (!title.trim()) {
            alert("Please enter a title for the issue");
            return;
        }

        setIsCreating(true);
        try {
            const body = descriptionEditorRef.current?.getValue() || "";
            const prNumbers = Array.from(selectedPRs).map((prId) => {
                return parseInt(prId.split("#").pop() || "0");
            });

            await onCreate(title.trim(), body, selectedLabels, prNumbers);

            // Reset form
            setTitle("");
            descriptionEditorRef.current?.clear();
            setSelectedLabels([]);
            setSelectedPRs(new Set());
            setSearchQuery("");
            setDebouncedSearchQuery("");
            setShowPRSection(false);
        } catch (error) {
            console.error("Failed to create issue:", error);
            alert(`Failed to create issue: ${(error as Error).message}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleAddLabel = (label: string) => {
        if (!selectedLabels.includes(label)) {
            setSelectedLabels([...selectedLabels, label]);
        }
    };

    const handleRemoveLabel = (label: string) => {
        setSelectedLabels(selectedLabels.filter((l) => l !== label));
    };

    // Reset form when modal opens/closes
    React.useEffect(() => {
        if (isOpen) {
            setTitle("");
            descriptionEditorRef.current?.clear();
            setSelectedLabels([]);
            setSelectedPRs(new Set());
            setSearchQuery("");
            setDebouncedSearchQuery("");
            setShowPRSection(false);
            setIsCreating(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            {isCreating && (
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-10">
                    <div
                        className={cn(
                            "px-6 py-4 rounded-lg shadow-xl",
                            theme === "dark"
                                ? "bg-gray-800 text-white"
                                : "bg-white text-gray-900"
                        )}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <span>Creating issue...</span>
                        </div>
                    </div>
                </div>
            )}
            <div
                className={cn(
                    "rounded-lg shadow-xl max-w-4xl w-full mx-4 flex flex-col",
                    theme === "dark" ? "bg-gray-800" : "bg-white",
                    isCreating && "pointer-events-none opacity-75"
                )}
                style={{ height: "85vh" }}
            >
                {/* Header */}
                <div
                    className={cn(
                        "p-4 border-b",
                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-4">
                            <h3 className="text-lg font-semibold">Create New Issue</h3>
                            <p
                                className={cn(
                                    "text-sm mt-0.5",
                                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                                )}
                            >
                                {repoOwner}/{repoName}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isCreating}
                            className={cn(
                                "p-1 rounded hover:bg-opacity-80 flex-shrink-0",
                                theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100",
                                isCreating && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Title Input */}
                    <div>
                        <label
                            className={cn(
                                "block text-sm font-medium mb-1.5",
                                theme === "dark" ? "text-gray-300" : "text-gray-700"
                            )}
                        >
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter issue title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isCreating}
                            className={cn(
                                "w-full px-3 py-2 rounded-md border text-sm",
                                theme === "dark"
                                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500",
                                "focus:outline-none focus:ring-1 focus:ring-blue-500",
                                isCreating && "opacity-50 cursor-not-allowed"
                            )}
                            autoFocus
                        />
                    </div>

                    {/* Description Editor */}
                    <div>
                        <label
                            className={cn(
                                "block text-sm font-medium mb-1.5",
                                theme === "dark" ? "text-gray-300" : "text-gray-700"
                            )}
                        >
                            Description
                        </label>
                        <UncontrolledMarkdownEditor
                            ref={descriptionEditorRef}
                            placeholder="Add a description (Markdown supported)"
                            minHeight="150px"
                        />
                    </div>

                    {/* Labels */}
                    <div>
                        <label
                            className={cn(
                                "block text-sm font-medium mb-1.5",
                                theme === "dark" ? "text-gray-300" : "text-gray-700"
                            )}
                        >
                            Labels
                        </label>
                        <LabelSelector
                            availableLabels={availableLabels}
                            selectedLabels={selectedLabels}
                            onAddLabel={handleAddLabel}
                            onRemoveLabel={handleRemoveLabel}
                        />
                    </div>

                    {/* PR Linking Section */}
                    <div
                        className={cn(
                            "border rounded-lg",
                            theme === "dark" ? "border-gray-700" : "border-gray-200"
                        )}
                    >
                        <button
                            onClick={() => setShowPRSection(!showPRSection)}
                            disabled={isCreating}
                            className={cn(
                                "w-full px-4 py-3 flex items-center justify-between transition-colors",
                                theme === "dark" ? "hover:bg-gray-750" : "hover:bg-gray-50",
                                isCreating && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <div className="flex items-center space-x-2">
                                <span
                                    className={cn(
                                        "text-sm font-medium",
                                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                                    )}
                                >
                                    Link Pull Requests
                                </span>
                                {selectedPRs.size > 0 && (
                                    <span
                                        className={cn(
                                            "px-2 py-0.5 text-xs rounded-full",
                                            theme === "dark"
                                                ? "bg-blue-900 text-blue-200"
                                                : "bg-blue-100 text-blue-700"
                                        )}
                                    >
                                        {selectedPRs.size} selected
                                    </span>
                                )}
                            </div>
                            {showPRSection ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </button>

                        {showPRSection && (
                            <div
                                className={cn(
                                    "border-t",
                                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                                )}
                            >
                                {/* Search Bar */}
                                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                                    <input
                                        type="text"
                                        placeholder="Search PR title, number, or branch..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        disabled={isCreating}
                                        className={cn(
                                            "w-full px-3 py-2 rounded-md border text-sm",
                                            theme === "dark"
                                                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                                                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500",
                                            "focus:outline-none focus:ring-1 focus:ring-blue-500",
                                            isCreating && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>

                                {/* Filter toggles */}
                                <div
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 border-b",
                                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                                    )}
                                >
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showAssigned}
                                                onChange={(e) => setShowAssigned(e.target.checked)}
                                                disabled={isCreating}
                                                className="rounded"
                                            />
                                            <span className="text-sm">Show Already Assigned PRs</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showClosed}
                                                onChange={(e) => setShowClosed(e.target.checked)}
                                                disabled={isCreating}
                                                className="rounded"
                                            />
                                            <span className="text-sm">Show Closed/Merged PRs</span>
                                        </label>
                                    </div>
                                    <span
                                        className={cn(
                                            "text-sm",
                                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                                        )}
                                    >
                                        {searchQuery !== debouncedSearchQuery ? (
                                            <span className="italic">Searching...</span>
                                        ) : (
                                            <>
                                                {filteredPRs.length} PR
                                                {filteredPRs.length !== 1 ? "s" : ""} found
                                            </>
                                        )}
                                    </span>
                                </div>

                                {/* PR Tree */}
                                <div className="overflow-y-auto" style={{ maxHeight: "300px" }}>
                                    {filteredPRs.length === 0 ? (
                                        <div
                                            className={cn(
                                                "flex items-center justify-center py-8",
                                                theme === "dark" ? "text-gray-400" : "text-gray-500"
                                            )}
                                        >
                                            <div className="text-center">
                                                <p>No PRs available to link.</p>
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
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div
                    className={cn(
                        "flex items-center justify-between p-4 border-t",
                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                    )}
                >
                    <div className="text-sm text-gray-500">
                        {selectedPRs.size > 0 && (
                            <span>
                                {selectedPRs.size} PR{selectedPRs.size !== 1 ? "s" : ""} will be
                                linked
                            </span>
                        )}
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={onClose}
                            disabled={isCreating}
                            className={cn(
                                "px-4 py-2 rounded text-sm transition-colors",
                                theme === "dark"
                                    ? "bg-gray-700 hover:bg-gray-600"
                                    : "bg-gray-200 hover:bg-gray-300",
                                isCreating && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isCreating || !title.trim()}
                            className={cn(
                                "px-4 py-2 rounded text-sm text-white flex items-center space-x-2",
                                !title.trim() || isCreating
                                    ? "bg-blue-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700"
                            )}
                        >
                            {isCreating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    <span>Create Issue</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

