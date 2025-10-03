import { useState, useCallback } from "react";
import { X, Plus, Edit2, Trash2, Users } from "lucide-react";
import { useTeamStore, Team } from "../stores/teamStore";
import { cn } from "../utils/cn";

interface TeamManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "light" | "dark";
  availableAuthors: { login: string; avatar_url: string }[];
}

const TEAM_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#84CC16", // Lime
  "#EC4899", // Pink
  "#6B7280", // Gray
];

const TEAM_ICONS = [
  "🏢", "👥", "🚀", "💻", "🔧", "🎨", "📱", "🌐", "⚡", "🛠️",
  "🎯", "📊", "🔍", "💡", "🌟", "🎪", "🏆", "🎨", "🔬", "🎭"
];

export function TeamManagementDialog({
  isOpen,
  onClose,
  theme,
  availableAuthors,
}: TeamManagementDialogProps) {
  const { teams, createTeam, updateTeam, deleteTeam } = useTeamStore();
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    authors: [] as string[],
    color: TEAM_COLORS[0],
    icon: TEAM_ICONS[0],
  });

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      description: "",
      authors: [],
      color: TEAM_COLORS[0],
      icon: TEAM_ICONS[0],
    });
    setEditingTeam(null);
    setShowCreateForm(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleCreateTeam = useCallback(() => {
    if (!formData.name.trim() || formData.authors.length === 0) {
      return;
    }

    createTeam(formData);
    resetForm();
  }, [formData, createTeam, resetForm]);

  const handleEditTeam = useCallback((team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || "",
      authors: team.authors,
      color: team.color || TEAM_COLORS[0],
      icon: team.icon || TEAM_ICONS[0],
    });
    setShowCreateForm(true);
  }, []);

  const handleUpdateTeam = useCallback(() => {
    if (!editingTeam || !formData.name.trim() || formData.authors.length === 0) {
      return;
    }

    updateTeam(editingTeam.id, formData);
    resetForm();
  }, [editingTeam, formData, updateTeam, resetForm]);

  const handleDeleteTeam = useCallback((teamId: string) => {
    if (confirm("Are you sure you want to delete this team?")) {
      deleteTeam(teamId);
    }
  }, [deleteTeam]);

  const toggleAuthor = useCallback((authorLogin: string) => {
    setFormData(prev => ({
      ...prev,
      authors: prev.authors.includes(authorLogin)
        ? prev.authors.filter(a => a !== authorLogin)
        : [...prev.authors, authorLogin]
    }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={cn(
          "w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200",
          "border"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between p-4 border-b",
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          )}
        >
          <h2
            className={cn(
              "text-lg font-semibold",
              theme === "dark" ? "text-white" : "text-gray-900"
            )}
          >
            Manage Teams
          </h2>
          <button
            onClick={handleClose}
            className={cn(
              "p-1 rounded hover:bg-opacity-20",
              theme === "dark"
                ? "text-gray-400 hover:text-white hover:bg-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {showCreateForm ? (
            /* Create/Edit Form */
            <div className="space-y-4">
              <div>
                <label
                  className={cn(
                    "block text-sm font-medium mb-2",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}
                >
                  Team Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={cn(
                    "w-full px-3 py-2 rounded border",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder="e.g., Frontend Team"
                />
              </div>

              <div>
                <label
                  className={cn(
                    "block text-sm font-medium mb-2",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}
                >
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className={cn(
                    "w-full px-3 py-2 rounded border",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label
                  className={cn(
                    "block text-sm font-medium mb-2",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}
                >
                  Team Members *
                </label>
                <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                  {availableAuthors.map((author) => (
                    <label
                      key={author.login}
                      className={cn(
                        "flex items-center space-x-2 p-2 rounded cursor-pointer",
                        theme === "dark"
                          ? "hover:bg-gray-700"
                          : "hover:bg-gray-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={formData.authors.includes(author.login)}
                        onChange={() => toggleAuthor(author.login)}
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
                {formData.authors.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.authors.map((authorLogin) => {
                      const author = availableAuthors.find(a => a.login === authorLogin);
                      return (
                        <span
                          key={authorLogin}
                          className="inline-flex items-center px-2 py-1 text-xs rounded bg-blue-100 text-blue-800"
                        >
                          {author && (
                            <img
                              src={author.avatar_url}
                              alt={author.login}
                              className="w-3 h-3 rounded-full mr-1"
                            />
                          )}
                          {authorLogin}
                          <button
                            onClick={() => toggleAuthor(authorLogin)}
                            className="ml-1 hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-2",
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    Color
                  </label>
                  <div className="flex space-x-2">
                    {TEAM_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={cn(
                          "w-8 h-8 rounded border-2",
                          formData.color === color ? "border-gray-400" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-2",
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    Icon
                  </label>
                  <div className="flex space-x-1 flex-wrap">
                    {TEAM_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setFormData(prev => ({ ...prev, icon }))}
                        className={cn(
                          "w-8 h-8 rounded text-lg",
                          formData.icon === icon
                            ? "bg-blue-100"
                            : "hover:bg-gray-100"
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={resetForm}
                  className={cn(
                    "px-4 py-2 rounded text-sm font-medium",
                    theme === "dark"
                      ? "text-gray-300 hover:text-white hover:bg-gray-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                  disabled={!formData.name.trim() || formData.authors.length === 0}
                  className={cn(
                    "px-4 py-2 rounded text-sm font-medium",
                    !formData.name.trim() || formData.authors.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  {editingTeam ? "Update Team" : "Create Team"}
                </button>
              </div>
            </div>
          ) : (
            /* Teams List */
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3
                  className={cn(
                    "text-md font-medium",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}
                >
                  Your Teams ({teams.length})
                </h3>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium",
                    theme === "dark"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  <Plus className="w-4 h-4" />
                  <span>New Team</span>
                </button>
              </div>

              {teams.length === 0 ? (
                <div
                  className={cn(
                    "text-center py-8",
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  )}
                >
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No teams created yet</p>
                  <p className="text-sm">Create your first team to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded border",
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600"
                          : "bg-gray-50 border-gray-200"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: team.color || TEAM_COLORS[0] }}
                        >
                          {team.icon || "👥"}
                        </div>
                        <div>
                          <div
                            className={cn(
                              "font-medium",
                              theme === "dark" ? "text-white" : "text-gray-900"
                            )}
                          >
                            {team.name}
                          </div>
                          <div
                            className={cn(
                              "text-sm",
                              theme === "dark" ? "text-gray-400" : "text-gray-600"
                            )}
                          >
                            {team.authors.length} member{team.authors.length !== 1 ? "s" : ""}
                            {team.description && ` • ${team.description}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditTeam(team)}
                          className={cn(
                            "p-1 rounded hover:bg-opacity-20",
                            theme === "dark"
                              ? "text-gray-400 hover:text-white hover:bg-white"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className={cn(
                            "p-1 rounded hover:bg-opacity-20",
                            theme === "dark"
                              ? "text-red-400 hover:text-red-300 hover:bg-red-900"
                              : "text-red-600 hover:text-red-700 hover:bg-red-50"
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}