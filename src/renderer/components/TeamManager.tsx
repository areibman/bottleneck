import React, { useState, useMemo } from "react";
import { X, Plus, Edit2, Trash2, Users, Check } from "lucide-react";
import { useTeamsStore, AuthorTeam } from "../stores/teamsStore";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";

interface TeamManagerProps {
  availableAuthors: Array<{ login: string; avatar_url: string }>;
  onClose: () => void;
}

const TEAM_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

const TEAM_ICONS = ["🏢", "👥", "⚡", "🚀", "💼", "🎯", "⭐", "🔥"];

export default function TeamManager({
  availableAuthors,
  onClose,
}: TeamManagerProps) {
  const { theme } = useUIStore();
  const { teams, addTeam, updateTeam, deleteTeam } = useTeamsStore();
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    members: [] as string[],
    color: TEAM_COLORS[0],
    icon: TEAM_ICONS[0],
    description: "",
  });

  const handleCreateTeam = () => {
    if (!formData.name.trim() || formData.members.length === 0) return;

    addTeam({
      name: formData.name.trim(),
      members: formData.members,
      color: formData.color,
      icon: formData.icon,
      description: formData.description.trim(),
    });

    setCreatingNew(false);
    setFormData({
      name: "",
      members: [],
      color: TEAM_COLORS[0],
      icon: TEAM_ICONS[0],
      description: "",
    });
  };

  const handleUpdateTeam = () => {
    if (!editingTeam || !formData.name.trim() || formData.members.length === 0)
      return;

    updateTeam(editingTeam, {
      name: formData.name.trim(),
      members: formData.members,
      color: formData.color,
      icon: formData.icon,
      description: formData.description.trim(),
    });

    setEditingTeam(null);
    setFormData({
      name: "",
      members: [],
      color: TEAM_COLORS[0],
      icon: TEAM_ICONS[0],
      description: "",
    });
  };

  const handleEdit = (team: AuthorTeam) => {
    setEditingTeam(team.id);
    setFormData({
      name: team.name,
      members: team.members,
      color: team.color || TEAM_COLORS[0],
      icon: team.icon || TEAM_ICONS[0],
      description: team.description || "",
    });
    setCreatingNew(false);
  };

  const handleCancel = () => {
    setEditingTeam(null);
    setCreatingNew(false);
    setFormData({
      name: "",
      members: [],
      color: TEAM_COLORS[0],
      icon: TEAM_ICONS[0],
      description: "",
    });
  };

  const toggleMember = (login: string) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.includes(login)
        ? prev.members.filter((m) => m !== login)
        : [...prev.members, login],
    }));
  };

  const isFormMode = creatingNew || editingTeam !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={cn(
          "w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl flex flex-col",
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
            Manage Author Teams
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded hover:bg-gray-700",
              theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isFormMode ? (
            // Form for creating/editing
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Frontend Team, Backend Team"
                  className={cn(
                    "w-full px-3 py-2 rounded border text-sm",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600"
                      : "bg-white border-gray-300"
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="e.g., Frontend developers working on React"
                  className={cn(
                    "w-full px-3 py-2 rounded border text-sm",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600"
                      : "bg-white border-gray-300"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Icon</label>
                  <div className="flex gap-2 flex-wrap">
                    {TEAM_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, icon }))
                        }
                        className={cn(
                          "w-10 h-10 rounded text-xl flex items-center justify-center border-2",
                          formData.icon === icon
                            ? "border-blue-500"
                            : theme === "dark"
                            ? "border-gray-600"
                            : "border-gray-300"
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {TEAM_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, color }))
                        }
                        className={cn(
                          "w-10 h-10 rounded border-2",
                          formData.color === color
                            ? "border-white"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Team Members ({formData.members.length})
                </label>
                <div
                  className={cn(
                    "max-h-48 overflow-y-auto rounded border p-2",
                    theme === "dark"
                      ? "border-gray-600 bg-gray-700"
                      : "border-gray-300 bg-gray-50"
                  )}
                >
                  {availableAuthors.map((author) => (
                    <label
                      key={author.login}
                      className={cn(
                        "flex items-center space-x-3 p-2 rounded cursor-pointer",
                        theme === "dark" ? "hover:bg-gray-600" : "hover:bg-gray-100"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={formData.members.includes(author.login)}
                        onChange={() => toggleMember(author.login)}
                        className="rounded"
                      />
                      <img
                        src={author.avatar_url}
                        alt={author.login}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm">{author.login}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={handleCancel}
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
                  onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                  disabled={!formData.name.trim() || formData.members.length === 0}
                  className={cn(
                    "px-4 py-2 rounded text-sm text-white",
                    formData.name.trim() && formData.members.length > 0
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-500 cursor-not-allowed"
                  )}
                >
                  {editingTeam ? "Update Team" : "Create Team"}
                </button>
              </div>
            </div>
          ) : (
            // List of teams
            <div className="space-y-3">
              <button
                onClick={() => setCreatingNew(true)}
                className={cn(
                  "w-full flex items-center justify-center space-x-2 p-3 rounded border-2 border-dashed text-sm font-medium",
                  theme === "dark"
                    ? "border-gray-600 hover:border-gray-500 hover:bg-gray-700"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                )}
              >
                <Plus className="w-4 h-4" />
                <span>Create New Team</span>
              </button>

              {teams.length === 0 ? (
                <div
                  className={cn(
                    "text-center py-8",
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No teams yet. Create your first team to get started!</p>
                </div>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className={cn(
                      "p-3 rounded border",
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600"
                        : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div
                          className="text-2xl flex-shrink-0"
                          style={{ color: team.color }}
                        >
                          {team.icon || "🏢"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium">{team.name}</h3>
                          {team.description && (
                            <p
                              className={cn(
                                "text-xs mt-1",
                                theme === "dark"
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              )}
                            >
                              {team.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <span
                              className={cn(
                                "text-xs",
                                theme === "dark"
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              )}
                            >
                              {team.members.length} member
                              {team.members.length !== 1 ? "s" : ""}
                            </span>
                            <div className="flex -space-x-2">
                              {team.members.slice(0, 5).map((memberLogin) => {
                                const author = availableAuthors.find(
                                  (a) => a.login === memberLogin
                                );
                                return author ? (
                                  <img
                                    key={memberLogin}
                                    src={author.avatar_url}
                                    alt={author.login}
                                    className={cn(
                                      "w-6 h-6 rounded-full border-2",
                                      theme === "dark"
                                        ? "border-gray-700"
                                        : "border-gray-50"
                                    )}
                                    title={author.login}
                                  />
                                ) : null;
                              })}
                              {team.members.length > 5 && (
                                <div
                                  className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs border-2",
                                    theme === "dark"
                                      ? "bg-gray-600 border-gray-700"
                                      : "bg-gray-200 border-gray-50"
                                  )}
                                >
                                  +{team.members.length - 5}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => handleEdit(team)}
                          className={cn(
                            "p-1.5 rounded",
                            theme === "dark"
                              ? "hover:bg-gray-600"
                              : "hover:bg-gray-200"
                          )}
                          title="Edit team"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Are you sure you want to delete "${team.name}"?`
                              )
                            ) {
                              deleteTeam(team.id);
                            }
                          }}
                          className={cn(
                            "p-1.5 rounded",
                            theme === "dark"
                              ? "hover:bg-red-900/30 text-red-400"
                              : "hover:bg-red-50 text-red-600"
                          )}
                          title="Delete team"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isFormMode && (
          <div
            className={cn(
              "p-4 border-t",
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            )}
          >
            <button
              onClick={onClose}
              className={cn(
                "w-full px-4 py-2 rounded text-sm font-medium",
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-gray-200 hover:bg-gray-300"
              )}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
