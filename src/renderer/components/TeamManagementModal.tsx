import { useState, useCallback, useMemo, useEffect } from "react";
import { X, Users, Edit2, Trash2, Plus, Save, UserPlus } from "lucide-react";
import { useTeamsStore, defaultTeamSuggestions } from "../stores/teamsStore";
import { useUIStore } from "../stores/uiStore";
import { usePRStore } from "../stores/prStore";
import { cn } from "../utils/cn";
import type { Team, TeamFormData } from "../types/teams";

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "list" | "create" | "edit";
  initialTeamId?: string;
}

export default function TeamManagementModal({
  isOpen,
  onClose,
  initialMode = "list",
  initialTeamId,
}: TeamManagementModalProps) {
  const { theme } = useUIStore();
  const { teams, addTeam, updateTeam, deleteTeam, getTeam } = useTeamsStore();
  const { pullRequests } = usePRStore();
  
  const [mode, setMode] = useState<"list" | "create" | "edit">(initialMode);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(initialTeamId || null);
  const [formData, setFormData] = useState<TeamFormData>({
    name: "",
    members: [],
    icon: "🏢",
    description: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuthorPicker, setShowAuthorPicker] = useState(false);

  // Get unique authors from PRs
  const availableAuthors = useMemo(() => {
    const authorMap = new Map<string, { login: string; avatar_url: string }>();
    pullRequests.forEach((pr) => {
      if (pr.user && pr.user.login) {
        authorMap.set(pr.user.login, pr.user);
      }
    });
    return Array.from(authorMap.values());
  }, [pullRequests]);

  // Filter authors based on search
  const filteredAuthors = useMemo(() => {
    if (!searchQuery) return availableAuthors;
    return availableAuthors.filter((author) =>
      author.login.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableAuthors, searchQuery]);

  // Load team data when editing
  useEffect(() => {
    if (mode === "edit" && editingTeamId) {
      const team = getTeam(editingTeamId);
      if (team) {
        setFormData({
          name: team.name,
          members: team.members,
          icon: team.icon,
          description: team.description,
        });
      }
    }
  }, [mode, editingTeamId, getTeam]);

  const handleSaveTeam = useCallback(() => {
    if (!formData.name.trim()) {
      alert("Please enter a team name");
      return;
    }

    if (formData.members.length === 0) {
      alert("Please select at least one team member");
      return;
    }

    if (mode === "create") {
      addTeam(formData);
    } else if (mode === "edit" && editingTeamId) {
      updateTeam(editingTeamId, formData);
    }

    // Reset form and go back to list
    setFormData({
      name: "",
      members: [],
      icon: "🏢",
      description: "",
    });
    setMode("list");
    setEditingTeamId(null);
  }, [formData, mode, editingTeamId, addTeam, updateTeam]);

  const handleDeleteTeam = useCallback((teamId: string) => {
    if (confirm("Are you sure you want to delete this team?")) {
      deleteTeam(teamId);
    }
  }, [deleteTeam]);

  const handleToggleMember = useCallback((authorLogin: string) => {
    setFormData((prev) => {
      const newMembers = prev.members.includes(authorLogin)
        ? prev.members.filter((m) => m !== authorLogin)
        : [...prev.members, authorLogin];
      return { ...prev, members: newMembers };
    });
  }, []);

  const handleSelectSuggestion = useCallback((suggestion: typeof defaultTeamSuggestions[0]) => {
    setFormData((prev) => ({
      ...prev,
      name: suggestion.name,
      icon: suggestion.icon,
      description: suggestion.description || "",
    }));
  }, []);

  const iconOptions = ["🏢", "👥", "🚀", "🎨", "⚙️", "🧪", "👁️", "💡", "🔧", "📱"];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative z-10 w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl overflow-hidden flex flex-col",
          theme === "dark" ? "bg-gray-800" : "bg-white"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between p-4 border-b",
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          )}
        >
          <h2 className="text-lg font-semibold flex items-center">
            <Users className="w-5 h-5 mr-2" />
            {mode === "list" ? "Manage Teams" : mode === "create" ? "Create Team" : "Edit Team"}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded hover:bg-gray-200",
              theme === "dark" && "hover:bg-gray-700"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === "list" ? (
            <>
              {/* Create new team button */}
              <button
                onClick={() => setMode("create")}
                className={cn(
                  "w-full p-3 rounded-lg border-2 border-dashed flex items-center justify-center mb-4 transition-colors",
                  theme === "dark"
                    ? "border-gray-600 hover:border-gray-500 hover:bg-gray-700/50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                )}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Team
              </button>

              {/* Teams list */}
              {teams.length === 0 ? (
                <div
                  className={cn(
                    "text-center py-8",
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No teams created yet</p>
                  <p className="text-sm mt-2">Create your first team to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className={cn(
                        "p-3 rounded-lg border flex items-center justify-between",
                        theme === "dark"
                          ? "border-gray-700 bg-gray-700/50"
                          : "border-gray-200 bg-gray-50"
                      )}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <span className="text-2xl mr-3">{team.icon || "🏢"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{team.name}</div>
                          <div
                            className={cn(
                              "text-sm",
                              theme === "dark" ? "text-gray-400" : "text-gray-600"
                            )}
                          >
                            {team.members.length} member{team.members.length !== 1 && "s"}
                            {team.description && ` • ${team.description}`}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {team.members.slice(0, 5).map((member) => {
                              const author = availableAuthors.find((a) => a.login === member);
                              return author ? (
                                <div
                                  key={member}
                                  className={cn(
                                    "flex items-center px-2 py-0.5 rounded text-xs",
                                    theme === "dark" ? "bg-gray-800" : "bg-white border border-gray-200"
                                  )}
                                >
                                  <img
                                    src={author.avatar_url}
                                    alt={author.login}
                                    className="w-3 h-3 rounded-full mr-1"
                                  />
                                  {author.login}
                                </div>
                              ) : (
                                <div
                                  key={member}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-xs",
                                    theme === "dark" ? "bg-gray-800" : "bg-white border border-gray-200"
                                  )}
                                >
                                  {member}
                                </div>
                              );
                            })}
                            {team.members.length > 5 && (
                              <div
                                className={cn(
                                  "px-2 py-0.5 rounded text-xs",
                                  theme === "dark" ? "bg-gray-800 text-gray-400" : "bg-white border border-gray-200 text-gray-600"
                                )}
                              >
                                +{team.members.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setEditingTeamId(team.id);
                            setMode("edit");
                          }}
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            theme === "dark"
                              ? "hover:bg-gray-600 text-gray-400 hover:text-gray-300"
                              : "hover:bg-gray-200 text-gray-600 hover:text-gray-800"
                          )}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            theme === "dark"
                              ? "hover:bg-red-900/20 text-red-400 hover:text-red-300"
                              : "hover:bg-red-50 text-red-600 hover:text-red-700"
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Create/Edit Form */
            <div className="space-y-4">
              {/* Suggestions for new teams */}
              {mode === "create" && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quick Start Templates
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {defaultTeamSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.name}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm flex items-center border",
                          theme === "dark"
                            ? "border-gray-700 hover:bg-gray-700"
                            : "border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        <span className="mr-1.5">{suggestion.icon}</span>
                        {suggestion.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Team Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Frontend Team"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600"
                      : "bg-white border-gray-300"
                  )}
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Team Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setFormData({ ...formData, icon })}
                      className={cn(
                        "p-2 rounded-lg text-2xl border-2 transition-colors",
                        formData.icon === icon
                          ? theme === "dark"
                            ? "border-blue-500 bg-blue-900/20"
                            : "border-blue-500 bg-blue-50"
                          : theme === "dark"
                            ? "border-gray-700 hover:border-gray-600"
                            : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional team description"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600"
                      : "bg-white border-gray-300"
                  )}
                />
              </div>

              {/* Team Members */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Team Members <span className="text-red-500">*</span>
                </label>
                
                {/* Selected members */}
                {formData.members.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.members.map((member) => {
                      const author = availableAuthors.find((a) => a.login === member);
                      return (
                        <div
                          key={member}
                          className={cn(
                            "flex items-center px-2 py-1 rounded-lg",
                            theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                          )}
                        >
                          {author && (
                            <img
                              src={author.avatar_url}
                              alt={author.login}
                              className="w-4 h-4 rounded-full mr-1.5"
                            />
                          )}
                          <span className="text-sm">{member}</span>
                          <button
                            onClick={() => handleToggleMember(member)}
                            className="ml-1.5 text-red-500 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Search and author list */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowAuthorPicker(true)}
                    placeholder="Search and select authors..."
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border",
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600"
                        : "bg-white border-gray-300"
                    )}
                  />
                  
                  {showAuthorPicker && (
                    <div
                      className={cn(
                        "absolute top-full mt-1 w-full max-h-48 overflow-y-auto rounded-lg border shadow-lg z-10",
                        theme === "dark"
                          ? "bg-gray-800 border-gray-700"
                          : "bg-white border-gray-200"
                      )}
                    >
                      {filteredAuthors.length === 0 ? (
                        <div
                          className={cn(
                            "p-3 text-center text-sm",
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          )}
                        >
                          No authors found
                        </div>
                      ) : (
                        filteredAuthors.map((author) => (
                          <button
                            key={author.login}
                            onClick={() => {
                              handleToggleMember(author.login);
                              setSearchQuery("");
                              setShowAuthorPicker(false);
                            }}
                            className={cn(
                              "w-full flex items-center p-2 transition-colors text-left",
                              formData.members.includes(author.login)
                                ? theme === "dark"
                                  ? "bg-blue-900/20"
                                  : "bg-blue-50"
                                : theme === "dark"
                                  ? "hover:bg-gray-700"
                                  : "hover:bg-gray-50"
                            )}
                          >
                            <img
                              src={author.avatar_url}
                              alt={author.login}
                              className="w-5 h-5 rounded-full mr-2"
                            />
                            <span className="text-sm">{author.login}</span>
                            {formData.members.includes(author.login) && (
                              <span className="ml-auto text-blue-500">✓</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {mode !== "list" && (
          <div
            className={cn(
              "flex items-center justify-end space-x-2 p-4 border-t",
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            )}
          >
            <button
              onClick={() => {
                setMode("list");
                setFormData({
                  name: "",
                  members: [],
                  icon: "🏢",
                  description: "",
                });
                setEditingTeamId(null);
              }}
              className={cn(
                "px-4 py-2 rounded-lg transition-colors",
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-gray-100 hover:bg-gray-200"
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTeam}
              className={cn(
                "px-4 py-2 rounded-lg transition-colors flex items-center",
                theme === "dark"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              )}
            >
              <Save className="w-4 h-4 mr-2" />
              {mode === "create" ? "Create Team" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}