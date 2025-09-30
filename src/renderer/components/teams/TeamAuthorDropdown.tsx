import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Users, User, Plus, Settings, Check } from "lucide-react";
import { useTeamsStore } from "../../stores/teamsStore";
import { useUIStore } from "../../stores/uiStore";
import { TeamManagementModal } from "./TeamManagementModal";
import { cn } from "../../utils/cn";
import type { TeamFilterOption } from "../../types/teams";

interface TeamAuthorDropdownProps {
  availableAuthors: Array<{ login: string; avatar_url?: string }>;
  selectedAuthors: Set<string>;
  onAuthorToggle: (authorLogin: string) => void;
  onTeamSelect?: (teamId: string) => void;
  className?: string;
}

export function TeamAuthorDropdown({
  availableAuthors,
  selectedAuthors,
  onAuthorToggle,
  onTeamSelect,
  className,
}: TeamAuthorDropdownProps) {
  const { theme } = useUIStore();
  const { teams, selectedTeamIds, toggleTeam, getSelectedAuthors } = useTeamsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
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
  
  // Get authors from selected teams
  const teamAuthors = useMemo(() => {
    return new Set(getSelectedAuthors());
  }, [getSelectedAuthors]);
  
  // Build filter options
  const filterOptions = useMemo((): TeamFilterOption[] => {
    const options: TeamFilterOption[] = [];
    
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    
    // Add teams section
    const filteredTeams = teams.filter(team =>
      team.name.toLowerCase().includes(searchLower) ||
      team.members.some(m => m.login.toLowerCase().includes(searchLower))
    );
    
    if (filteredTeams.length > 0) {
      options.push({
        type: "separator",
        value: "teams-separator",
        label: "Teams",
      });
      
      filteredTeams.forEach(team => {
        options.push({
          type: "team",
          value: team.id,
          label: team.name,
          icon: <span className="text-sm">{team.icon || "👥"}</span>,
          memberCount: team.members.length,
          members: team.members,
          color: team.color,
        });
      });
    }
    
    // Add create team action
    if (!searchQuery) {
      options.push({
        type: "action",
        value: "create-team",
        label: "Create New Team",
        icon: <Plus className="w-4 h-4" />,
      });
      
      options.push({
        type: "action",
        value: "manage-teams",
        label: "Manage Teams",
        icon: <Settings className="w-4 h-4" />,
      });
    }
    
    // Add individual authors section
    const filteredAuthors = availableAuthors.filter(author =>
      author.login.toLowerCase().includes(searchLower)
    );
    
    if (filteredAuthors.length > 0) {
      options.push({
        type: "separator",
        value: "authors-separator",
        label: "Individual Authors",
      });
      
      // Add "All Authors" option
      if (!searchQuery) {
        options.push({
          type: "author",
          value: "all",
          label: "All Authors",
          icon: <Users className="w-4 h-4" />,
        });
      }
      
      filteredAuthors.forEach(author => {
        options.push({
          type: "author",
          value: author.login,
          label: `@${author.login}`,
          icon: author.avatar_url ? (
            <img
              src={author.avatar_url}
              alt={author.login}
              className="w-4 h-4 rounded-full"
            />
          ) : (
            <User className="w-4 h-4" />
          ),
        });
      });
    }
    
    return options;
  }, [teams, availableAuthors, searchQuery]);
  
  const handleOptionClick = (option: TeamFilterOption) => {
    if (option.type === "separator") return;
    
    if (option.type === "action") {
      if (option.value === "create-team" || option.value === "manage-teams") {
        setShowTeamModal(true);
        setIsOpen(false);
      }
      return;
    }
    
    if (option.type === "team") {
      toggleTeam(option.value);
      if (onTeamSelect) {
        onTeamSelect(option.value);
      }
    } else if (option.type === "author") {
      onAuthorToggle(option.value);
    }
  };
  
  const isOptionSelected = (option: TeamFilterOption): boolean => {
    if (option.type === "team") {
      return selectedTeamIds.has(option.value);
    } else if (option.type === "author") {
      if (option.value === "all") {
        return selectedAuthors.has("all");
      }
      return selectedAuthors.has(option.value) || teamAuthors.has(option.value);
    }
    return false;
  };
  
  // Calculate selection summary
  const selectionSummary = useMemo(() => {
    const teamCount = selectedTeamIds.size;
    const individualCount = Array.from(selectedAuthors).filter(a => a !== "all").length;
    
    if (selectedAuthors.has("all")) {
      return "All Authors";
    }
    
    const parts = [];
    if (teamCount > 0) {
      parts.push(`${teamCount} team${teamCount !== 1 ? "s" : ""}`);
    }
    if (individualCount > 0) {
      parts.push(`${individualCount} author${individualCount !== 1 ? "s" : ""}`);
    }
    
    return parts.length > 0 ? parts.join(", ") : "Select authors";
  }, [selectedTeamIds, selectedAuthors]);
  
  return (
    <>
      <div className={cn("relative", className)} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm rounded border transition-colors",
            theme === "dark"
              ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
          )}
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="truncate">{selectionSummary}</span>
          </span>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </button>
        
        {isOpen && (
          <div className={cn(
            "absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg border z-50",
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          )}>
            {/* Search input */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="Search teams or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full px-3 py-1.5 text-sm rounded border",
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                )}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            {/* Options list */}
            <div className="max-h-80 overflow-y-auto py-1">
              {filterOptions.map((option, index) => {
                if (option.type === "separator") {
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                        index > 0 && "mt-2 pt-2 border-t",
                        theme === "dark"
                          ? "text-gray-400 border-gray-700"
                          : "text-gray-600 border-gray-200"
                      )}
                    >
                      {option.label}
                    </div>
                  );
                }
                
                const isSelected = isOptionSelected(option);
                const isAction = option.type === "action";
                
                return (
                  <button
                    key={option.value}
                    onClick={() => handleOptionClick(option)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                      isAction
                        ? theme === "dark"
                          ? "hover:bg-blue-900 text-blue-400"
                          : "hover:bg-blue-50 text-blue-600"
                        : isSelected
                          ? theme === "dark"
                            ? "bg-blue-900 text-blue-300"
                            : "bg-blue-50 text-blue-700"
                          : theme === "dark"
                            ? "hover:bg-gray-700 text-gray-300"
                            : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    {/* Icon */}
                    <span className="flex-shrink-0">
                      {option.icon}
                    </span>
                    
                    {/* Label */}
                    <span className="flex-1 truncate">
                      {option.label}
                      {option.type === "team" && option.memberCount && (
                        <span className={cn(
                          "ml-2 text-xs",
                          theme === "dark" ? "text-gray-500" : "text-gray-500"
                        )}>
                          ({option.memberCount} members)
                        </span>
                      )}
                    </span>
                    
                    {/* Selection indicator */}
                    {isSelected && !isAction && (
                      <Check className="w-4 h-4 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
              
              {filterOptions.length === 0 && (
                <div className={cn(
                  "px-3 py-4 text-sm text-center",
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                )}>
                  No results found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Team Management Modal */}
      <TeamManagementModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        availableAuthors={availableAuthors}
        onSelectTeam={(teamId) => {
          toggleTeam(teamId);
          if (onTeamSelect) {
            onTeamSelect(teamId);
          }
          setShowTeamModal(false);
        }}
      />
    </>
  );
}