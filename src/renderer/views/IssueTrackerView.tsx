import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Plus, Filter, Search } from "lucide-react";
import { useIssueStore } from "../stores/issueStore";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";
import { KanbanBoard, KanbanIssue, KanbanStatus } from "../components/kanban/KanbanBoard";
import WelcomeView from "./WelcomeView";
import { Issue } from "../services/github";

export default function IssueTrackerView() {
  const navigate = useNavigate();
  const {
    getKanbanIssues,
    updateIssueKanbanStatus,
    fetchAssociatedData,
    loading,
    error,
  } = useIssueStore();
  const { selectedRepo } = usePRStore();
  const { theme } = useUIStore();
  
  const [kanbanIssues, setKanbanIssues] = useState<KanbanIssue[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Load issues and associated data when repo changes
  useEffect(() => {
    if (selectedRepo) {
      loadIssuesAndData();
    }
  }, [selectedRepo]);

  const loadIssuesAndData = async () => {
    if (!selectedRepo) return;
    
    try {
      // Fetch associated data (PRs and branches) for better status determination
      await fetchAssociatedData(selectedRepo.owner, selectedRepo.name);
      
      // Get Kanban issues with updated status
      const issues = getKanbanIssues(selectedRepo.owner, selectedRepo.name);
      setKanbanIssues(issues);
    } catch (error) {
      console.error("Failed to load issues:", error);
    }
  };

  const handleIssueClick = useCallback(
    (issue: KanbanIssue) => {
      if (selectedRepo) {
        navigate(
          `/issues/${selectedRepo.owner}/${selectedRepo.name}/${issue.number}`,
        );
      }
    },
    [navigate, selectedRepo],
  );

  const handleIssueEdit = useCallback(
    (issue: KanbanIssue) => {
      // For now, navigate to the issue detail view for editing
      // In the future, we could implement inline editing
      handleIssueClick(issue);
    },
    [handleIssueClick],
  );

  const handleIssueStatusChange = useCallback(
    async (issueId: number, newStatus: KanbanStatus) => {
      if (!selectedRepo) return;

      try {
        await updateIssueKanbanStatus(selectedRepo.owner, selectedRepo.name, issueId, newStatus);
        
        // Refresh the issues to reflect the change
        const updatedIssues = getKanbanIssues(selectedRepo.owner, selectedRepo.name);
        setKanbanIssues(updatedIssues);
      } catch (error) {
        console.error("Failed to update issue status:", error);
        // TODO: Show error notification to user
      }
    },
    [selectedRepo, updateIssueKanbanStatus, getKanbanIssues],
  );

  // Filter issues based on search query
  const filteredIssues = kanbanIssues.filter((issue) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      issue.title.toLowerCase().includes(query) ||
      issue.body?.toLowerCase().includes(query) ||
      issue.user.login.toLowerCase().includes(query) ||
      issue.labels.some(label => label.name.toLowerCase().includes(query)) ||
      issue.assignees.some(assignee => assignee.login.toLowerCase().includes(query))
    );
  });

  if (!selectedRepo) {
    return <WelcomeView />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={cn(
          "p-4 border-b",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-gray-50 border-gray-200",
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Issue Tracker
              <span
                className={cn(
                  "ml-2 text-sm",
                  theme === "dark" ? "text-gray-500" : "text-gray-600",
                )}
              >
                ({filteredIssues.length} issues)
              </span>
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "pl-10 pr-4 py-2 rounded-lg border text-sm",
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                )}
              />
            </div>

            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-200"
                  : "bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
              )}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>

            {/* Create Issue Button */}
            <button
              onClick={() => {
                // TODO: Implement create issue functionality
                console.log("Create issue clicked");
              }}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              <Plus className="w-4 h-4" />
              <span>New Issue</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div
            className={cn(
              "mt-4 p-4 rounded-lg border",
              theme === "dark"
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-200"
            )}
          >
            <p className="text-sm text-gray-500 mb-2">Filters coming soon...</p>
            {/* TODO: Implement filter controls */}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div
              className={cn(
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              Loading issues...
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div
              className={cn(
                "text-red-500",
                theme === "dark" ? "text-red-400" : "text-red-600",
              )}
            >
              Error loading issues: {error}
            </div>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center h-64",
              theme === "dark" ? "text-gray-400" : "text-gray-600",
            )}
          >
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No issues found</p>
            {selectedRepo && (
              <p className="text-sm mt-2">
                {searchQuery 
                  ? "No issues match your search criteria"
                  : `No issues in ${selectedRepo.full_name}`
                }
              </p>
            )}
          </div>
        ) : (
          <KanbanBoard
            issues={filteredIssues}
            onIssueStatusChange={handleIssueStatusChange}
            onIssueClick={handleIssueClick}
            onIssueEdit={handleIssueEdit}
            theme={theme}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}