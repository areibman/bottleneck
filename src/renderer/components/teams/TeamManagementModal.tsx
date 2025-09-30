import React, { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, Edit2, Download, Upload, Users, Search } from "lucide-react";
import { useTeamsStore } from "../../stores/teamsStore";
import { useUIStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";
import type { Team, TeamFormData } from "../../types/teams";

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAuthors: Array<{ login: string; avatar_url?: string }>;
  onSelectTeam?: (teamId: string) => void;
}

export function TeamManagementModal({
  isOpen,
  onClose,
  availableAuthors,
  onSelectTeam,
}: TeamManagementModalProps) {
  const { theme } = useUIStore();
  const { 
    teams, 
    createTeam, 
    updateTeam, 
    deleteTeam,
    exportTeams,
    importTeams,
  } = useTeamsStore();
  
  const [activeTab, setActiveTab] = useState<"list" | "create" | "edit">("list");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form state
  const [formData, setFormData] = useState<TeamFormData>({
    name: "",
    description: "",
    members: [],
    color: "#3B82F6",
    icon: "👥",
  });
  
  const [authorSearch, setAuthorSearch] = useState("");
  
  const filteredTeams = useMemo(() => {
    return teams.filter(team => 
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teams, searchQuery]);
  
  const filteredAuthors = useMemo(() => {
    return availableAuthors.filter(author =>
      author.login.toLowerCase().includes(authorSearch.toLowerCase()) &&
      !formData.members.includes(author.login)
    );
  }, [availableAuthors, authorSearch, formData.members]);
  
  const handleCreateTeam = () => {
    if (!formData.name || formData.members.length === 0) {
      alert("Please provide a team name and select at least one member.");
      return;
    }
    
    createTeam(formData);
    setFormData({
      name: "",
      description: "",
      members: [],
      color: "#3B82F6",
      icon: "👥",
    });
    setActiveTab("list");
  };
  
  const handleUpdateTeam = () => {
    if (!editingTeam || !formData.name || formData.members.length === 0) {
      alert("Please provide a team name and select at least one member.");
      return;
    }
    
    updateTeam(editingTeam.id, formData);
    setEditingTeam(null);
    setFormData({
      name: "",
      description: "",
      members: [],
      color: "#3B82F6",
      icon: "👥",
    });
    setActiveTab("list");
  };
  
  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || "",
      members: team.members.map(m => m.login),
      color: team.color || "#3B82F6",
      icon: team.icon || "👥",
    });
    setActiveTab("edit");
  };
  
  const handleDeleteTeam = (teamId: string) => {
    if (confirm("Are you sure you want to delete this team?")) {
      deleteTeam(teamId);
    }
  };
  
  const handleAddMember = (login: string) => {
    setFormData(prev => ({
      ...prev,
      members: [...prev.members, login],
    }));
    setAuthorSearch("");
  };
  
  const handleRemoveMember = (login: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m !== login),
    }));
  };
  
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const teams = JSON.parse(text) as Team[];
          importTeams(teams);
          alert(`Successfully imported ${teams.length} teams`);
        } catch (error) {
          alert("Failed to import teams. Please check the file format.");
        }
      }
    };
    input.click();
  };
  
  const handleExport = () => {
    const data = exportTeams();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teams-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const iconOptions = ["👥", "🏢", "🚀", "💻", "🎨", "📱", "🔧", "📊", "🔒", "⚡"];
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-4xl max-h-[80vh] rounded-lg shadow-xl flex flex-col",
        theme === "dark" ? "bg-gray-800" : "bg-white"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-6 py-4 border-b",
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        )}>
          <h2 className={cn(
            "text-lg font-semibold",
            theme === "dark" ? "text-white" : "text-gray-900"
          )}>
            Team Management
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded hover:bg-opacity-10",
              theme === "dark" ? "hover:bg-white" : "hover:bg-black"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className={cn(
          "flex items-center px-6 py-2 border-b",
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        )}>
          <button
            onClick={() => setActiveTab("list")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t",
              activeTab === "list"
                ? theme === "dark"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-100 text-gray-900"
                : theme === "dark"
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 hover:text-gray-900"
            )}
          >
            Teams
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t ml-2",
              activeTab === "create"
                ? theme === "dark"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-100 text-gray-900"
                : theme === "dark"
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 hover:text-gray-900"
            )}
          >
            Create Team
          </button>
          {activeTab === "edit" && (
            <button
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t ml-2",
                theme === "dark"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-100 text-gray-900"
              )}
            >
              Edit Team
            </button>
          )}
          
          {/* Import/Export buttons */}
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleImport}
              className={cn(
                "px-3 py-1 text-sm rounded flex items-center gap-1",
                theme === "dark"
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={handleExport}
              className={cn(
                "px-3 py-1 text-sm rounded flex items-center gap-1",
                theme === "dark"
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "list" && (
            <div>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-3 py-2 text-sm rounded border",
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    )}
                  />
                </div>
              </div>
              
              {/* Teams list */}
              <div className="space-y-2">
                {filteredTeams.map(team => (
                  <div
                    key={team.id}
                    className={cn(
                      "p-4 rounded border",
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600"
                        : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{team.icon || "👥"}</span>
                          <h3 className={cn(
                            "font-medium",
                            theme === "dark" ? "text-white" : "text-gray-900"
                          )}>
                            {team.name}
                          </h3>
                          <span className={cn(
                            "px-2 py-1 text-xs rounded",
                            theme === "dark"
                              ? "bg-gray-600 text-gray-300"
                              : "bg-gray-200 text-gray-600"
                          )}>
                            {team.members.length} members
                          </span>
                        </div>
                        {team.description && (
                          <p className={cn(
                            "text-sm mt-1",
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          )}>
                            {team.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {team.members.slice(0, 5).map(member => (
                            <span
                              key={member.login}
                              className={cn(
                                "px-2 py-1 text-xs rounded",
                                theme === "dark"
                                  ? "bg-gray-600 text-gray-300"
                                  : "bg-gray-200 text-gray-700"
                              )}
                            >
                              @{member.login}
                            </span>
                          ))}
                          {team.members.length > 5 && (
                            <span className={cn(
                              "px-2 py-1 text-xs",
                              theme === "dark" ? "text-gray-400" : "text-gray-600"
                            )}>
                              +{team.members.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {onSelectTeam && (
                          <button
                            onClick={() => onSelectTeam(team.id)}
                            className={cn(
                              "px-3 py-1 text-sm rounded",
                              theme === "dark"
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-blue-500 text-white hover:bg-blue-600"
                            )}
                          >
                            Select
                          </button>
                        )}
                        {!team.isDefault && (
                          <>
                            <button
                              onClick={() => handleEditTeam(team)}
                              className={cn(
                                "p-1 rounded",
                                theme === "dark"
                                  ? "hover:bg-gray-600"
                                  : "hover:bg-gray-200"
                              )}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeam(team.id)}
                              className={cn(
                                "p-1 rounded text-red-500",
                                theme === "dark"
                                  ? "hover:bg-gray-600"
                                  : "hover:bg-gray-200"
                              )}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredTeams.length === 0 && (
                  <div className={cn(
                    "text-center py-8",
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  )}>
                    No teams found
                  </div>
                )}
              </div>
            </div>
          )}
          
          {(activeTab === "create" || activeTab === "edit") && (
            <div className="space-y-4">
              {/* Team name */}
              <div>
                <label className={cn(
                  "block text-sm font-medium mb-1",
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                )}>
                  Team Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Frontend Team"
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded border",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  )}
                />
              </div>
              
              {/* Description */}
              <div>
                <label className={cn(
                  "block text-sm font-medium mb-1",
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                )}>
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the team..."
                  rows={3}
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded border",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  )}
                />
              </div>
              
              {/* Icon and Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn(
                    "block text-sm font-medium mb-1",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    Icon
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {iconOptions.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setFormData(prev => ({ ...prev, icon }))}
                        className={cn(
                          "p-2 text-xl rounded border",
                          formData.icon === icon
                            ? theme === "dark"
                              ? "bg-blue-600 border-blue-600"
                              : "bg-blue-100 border-blue-500"
                            : theme === "dark"
                              ? "bg-gray-700 border-gray-600"
                              : "bg-white border-gray-300"
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className={cn(
                    "block text-sm font-medium mb-1",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full h-10"
                  />
                </div>
              </div>
              
              {/* Members */}
              <div>
                <label className={cn(
                  "block text-sm font-medium mb-1",
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                )}>
                  Team Members
                </label>
                
                {/* Search authors */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search authors to add..."
                    value={authorSearch}
                    onChange={(e) => setAuthorSearch(e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-3 py-2 text-sm rounded border",
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    )}
                  />
                </div>
                
                {/* Available authors */}
                {authorSearch && (
                  <div className={cn(
                    "max-h-32 overflow-y-auto mb-2 p-2 rounded border",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600"
                      : "bg-gray-50 border-gray-200"
                  )}>
                    {filteredAuthors.map(author => (
                      <button
                        key={author.login}
                        onClick={() => handleAddMember(author.login)}
                        className={cn(
                          "w-full text-left px-2 py-1 text-sm rounded flex items-center gap-2",
                          theme === "dark"
                            ? "hover:bg-gray-600"
                            : "hover:bg-gray-200"
                        )}
                      >
                        {author.avatar_url && (
                          <img
                            src={author.avatar_url}
                            alt={author.login}
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <span>@{author.login}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Selected members */}
                <div className="flex flex-wrap gap-2">
                  {formData.members.map(login => {
                    const author = availableAuthors.find(a => a.login === login);
                    return (
                      <div
                        key={login}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 text-sm rounded",
                          theme === "dark"
                            ? "bg-gray-600 text-white"
                            : "bg-gray-200 text-gray-900"
                        )}
                      >
                        {author?.avatar_url && (
                          <img
                            src={author.avatar_url}
                            alt={login}
                            className="w-4 h-4 rounded-full"
                          />
                        )}
                        <span>@{login}</span>
                        <button
                          onClick={() => handleRemoveMember(login)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  
                  {formData.members.length === 0 && (
                    <div className={cn(
                      "text-sm",
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    )}>
                      No members selected
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    setActiveTab("list");
                    setEditingTeam(null);
                    setFormData({
                      name: "",
                      description: "",
                      members: [],
                      color: "#3B82F6",
                      icon: "👥",
                    });
                  }}
                  className={cn(
                    "px-4 py-2 text-sm rounded",
                    theme === "dark"
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={activeTab === "create" ? handleCreateTeam : handleUpdateTeam}
                  className={cn(
                    "px-4 py-2 text-sm rounded",
                    theme === "dark"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  )}
                >
                  {activeTab === "create" ? "Create Team" : "Update Team"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}