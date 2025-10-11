import { useState, useCallback, useMemo } from "react";
import { X, Plus, Edit2, Trash2, Users, Check } from "lucide-react";
import { useTeamStore, AuthorTeam } from "../stores/teamStore";
import { cn } from "../utils/cn";

interface TeamManagementProps {
  theme: "light" | "dark";
  availableAuthors: { login: string; avatar_url: string }[];
  onClose: () => void;
}

interface TeamFormData {
  name: string;
  description: string;
  members: string[];
  color: string;
  icon: string;
}

const defaultColors = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#F97316", // Orange
  "#06B6D4", // Cyan
  "#84CC16", // Lime
];

const defaultIcons = ["🏢", "👥", "🚀", "⚡", "🎯", "🔧", "📊", "💡"];

export function TeamManagement({ theme, availableAuthors, onClose }: TeamManagementProps) {
  const { teams, createTeam, updateTeam, deleteTeam } = useTeamStore();
  const [editingTeam, setEditingTeam] = useState<AuthorTeam | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<TeamFormData>({
    name: "",
    description: "",
    members: [],
    color: defaultColors[0],
    icon: defaultIcons[0],
  });

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      description: "",
      members: [],
      color: defaultColors[0],
      icon: defaultIcons[0],
    });
    setEditingTeam(null);
    setShowCreateForm(false);
  }, []);

  const handleCreateTeam = useCallback(() => {
    if (!formData.name.trim()) return;

    createTeam({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      members: formData.members,
      color: formData.color,
      icon: formData.icon,
    });

    resetForm();
  }, [formData, createTeam, resetForm]);

  const handleUpdateTeam = useCallback(() => {
    if (!editingTeam || !formData.name.trim()) return;

    updateTeam(editingTeam.id, {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      members: formData.members,
      color: formData.color,
      icon: formData.icon,
    });

    resetForm();
  }, [editingTeam, formData, updateTeam, resetForm]);

  const handleEditTeam = useCallback((team: AuthorTeam) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || "",
      members: [...team.members],
      color: team.color || defaultColors[0],
      icon: team.icon || defaultIcons[0],
    });
    setShowCreateForm(true);
  }, []);

  const handleDeleteTeam = useCallback((teamId: string) => {
    if (confirm("Are you sure you want to delete this team?")) {
      deleteTeam(teamId);
    }
  }, [deleteTeam]);

  const handleMemberToggle = useCallback((authorLogin: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.includes(authorLogin)
        ? prev.members.filter(m => m !== authorLogin)
        : [...prev.members, authorLogin]
    }));
  }, []);

  const isFormValid = useMemo(() => {
    return formData.name.trim().length > 0 && formData.members.length > 0;
  }, [formData]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={cn(
          "w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden",
          theme === "dark" ? "bg-gray-800" : "bg-white"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "px-6 py-4 border-b flex items-center justify-between",
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          )}
        >
          <h2 className="text-lg font-semibold flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Team Management
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded hover:bg-opacity-80",
              theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Teams List */}
          <div
            className={cn(
              "w-1/2 border-r overflow-y-auto",
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            )}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Saved Teams ({teams.length})</h3>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className={cn(
                    "px-3 py-1.5 rounded text-sm font-medium flex items-center space-x-1",
                    theme === "dark"
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  )}
                >
                  <Plus className="w-4 h-4" />
                  <span>New Team</span>
                </button>
              </div>

              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className={cn(
                      "p-3 rounded border",
                      theme === "dark"
                        ? "border-gray-700 hover:bg-gray-750"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2 flex-1">
                        <span className="text-lg">{team.icon || "👥"}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{team.name}</h4>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              theme === "dark" ? "text-gray-400" : "text-gray-600"
                            )}
                          >
                            {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                          </p>
                          {team.description && (
                            <p
                              className={cn(
                                "text-xs mt-1 truncate",
                                theme === "dark" ? "text-gray-500" : "text-gray-500"
                              )}
                            >
                              {team.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => handleEditTeam(team)}
                          className={cn(
                            "p-1 rounded",
                            theme === "dark"
                              ? "hover:bg-gray-700 text-gray-400 hover:text-gray-300"
                              : "hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                          )}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className={cn(
                            "p-1 rounded",
                            theme === "dark"
                              ? "hover:bg-gray-700 text-gray-400 hover:text-red-400"
                              : "hover:bg-gray-200 text-gray-500 hover:text-red-600"
                          )}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Team members preview */}
                    <div className="flex items-center mt-2 space-x-1">
                      {team.members.slice(0, 5).map((memberLogin) => {
                        const author = availableAuthors.find(a => a.login === memberLogin);
                        return author ? (
                          <img
                            key={memberLogin}
                            src={author.avatar_url}
                            alt={memberLogin}
                            className="w-5 h-5 rounded-full"
                            title={memberLogin}
                          />
                        ) : (
                          <div
                            key={memberLogin}
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
                              theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                            )}
                            title={memberLogin}
                          >
                            {memberLogin[0].toUpperCase()}
                          </div>
                        );
                      })}
                      {team.members.length > 5 && (
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
                            theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                          )}
                        >
                          +{team.members.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Create/Edit Form */}
          <div className="w-1/2 overflow-y-auto">
            {showCreateForm ? (
              <div className="p-4">
                <h3 className="font-medium mb-4">
                  {editingTeam ? "Edit Team" : "Create New Team"}
                </h3>

                <div className="space-y-4">
                  {/* Team Name */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Frontend Team"
                      className={cn(
                        "w-full px-3 py-2 rounded border text-sm",
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                      )}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                      className={cn(
                        "w-full px-3 py-2 rounded border text-sm",
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                      )}
                    />
                  </div>

                  {/* Icon Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Icon
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {defaultIcons.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => setFormData(prev => ({ ...prev, icon }))}
                          className={cn(
                            "w-8 h-8 rounded border flex items-center justify-center text-lg",
                            formData.icon === icon
                              ? theme === "dark"
                                ? "border-blue-500 bg-blue-900/20"
                                : "border-blue-500 bg-blue-50"
                              : theme === "dark"
                                ? "border-gray-600 hover:border-gray-500"
                                : "border-gray-300 hover:border-gray-400"
                          )}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {defaultColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setFormData(prev => ({ ...prev, color }))}
                          className={cn(
                            "w-8 h-8 rounded border-2 flex items-center justify-center",
                            formData.color === color
                              ? "border-gray-800 dark:border-white"
                              : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                        >
                          {formData.color === color && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Members Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Members * ({formData.members.length} selected)
                    </label>
                    <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1">
                      {availableAuthors.map((author) => (
                        <label
                          key={author.login}
                          className={cn(
                            "flex items-center space-x-2 p-2 rounded cursor-pointer",
                            theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={formData.members.includes(author.login)}
                            onChange={() => handleMemberToggle(author.login)}
                            className="rounded"
                          />
                          <img
                            src={author.avatar_url}
                            alt={author.login}
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-sm">{author.login}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-4">
                    <button
                      onClick={resetForm}
                      className={cn(
                        "px-4 py-2 rounded text-sm font-medium",
                        theme === "dark"
                          ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                          : "text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                      disabled={!isFormValid}
                      className={cn(
                        "px-4 py-2 rounded text-sm font-medium",
                        isFormValid
                          ? theme === "dark"
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      )}
                    >
                      {editingTeam ? "Update Team" : "Create Team"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 flex items-center justify-center h-full">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p
                    className={cn(
                      "text-lg font-medium",
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    Select a team to edit
                  </p>
                  <p
                    className={cn(
                      "text-sm mt-1",
                      theme === "dark" ? "text-gray-500" : "text-gray-500"
                    )}
                  >
                    or create a new team to get started
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}