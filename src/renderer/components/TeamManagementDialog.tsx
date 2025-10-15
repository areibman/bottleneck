import { useState, useEffect } from 'react';
import { X, Plus, Users, Edit2, Trash2, Save } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { useUIStore } from '../stores/uiStore';
import type { Team, CreateTeamData, TeamMember } from '../types/teams';
import { cn } from '../utils/cn';

interface TeamManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableAuthors: TeamMember[];
}

const TEAM_COLORS = [
  { name: 'Blue', value: '#3B82F6', bg: 'bg-blue-100', text: 'text-blue-800' },
  { name: 'Green', value: '#10B981', bg: 'bg-green-100', text: 'text-green-800' },
  { name: 'Purple', value: '#8B5CF6', bg: 'bg-purple-100', text: 'text-purple-800' },
  { name: 'Pink', value: '#EC4899', bg: 'bg-pink-100', text: 'text-pink-800' },
  { name: 'Orange', value: '#F59E0B', bg: 'bg-orange-100', text: 'text-orange-800' },
  { name: 'Red', value: '#EF4444', bg: 'bg-red-100', text: 'text-red-800' },
  { name: 'Indigo', value: '#6366F1', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  { name: 'Teal', value: '#14B8A6', bg: 'bg-teal-100', text: 'text-teal-800' },
];

const TEAM_ICONS = [
  { name: 'Users', value: '👥' },
  { name: 'Rocket', value: '🚀' },
  { name: 'Shield', value: '🛡️' },
  { name: 'Star', value: '⭐' },
  { name: 'Heart', value: '❤️' },
  { name: 'Lightning', value: '⚡' },
  { name: 'Gear', value: '⚙️' },
  { name: 'Crown', value: '👑' },
];

export default function TeamManagementDialog({ isOpen, onClose, availableAuthors }: TeamManagementDialogProps) {
  const { theme } = useUIStore();
  const { teams, createTeam, updateTeam, deleteTeam } = useSettingsStore();
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreateTeamData>({
    name: '',
    description: '',
    color: TEAM_COLORS[0].value,
    icon: TEAM_ICONS[0].value,
    authorLogins: [],
  });

  useEffect(() => {
    if (showCreateForm || editingTeam) {
      setFormData({
        name: editingTeam?.name || '',
        description: editingTeam?.description || '',
        color: editingTeam?.color || TEAM_COLORS[0].value,
        icon: editingTeam?.icon || TEAM_ICONS[0].value,
        authorLogins: editingTeam?.authorLogins || [],
      });
    }
  }, [editingTeam, showCreateForm]);

  const handleClose = () => {
    setEditingTeam(null);
    setShowCreateForm(false);
    setFormData({
      name: '',
      description: '',
      color: TEAM_COLORS[0].value,
      icon: TEAM_ICONS[0].value,
      authorLogins: [],
    });
    onClose();
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    if (editingTeam) {
      updateTeam({
        id: editingTeam.id,
        ...formData,
      });
    } else {
      createTeam(formData);
    }

    handleClose();
  };

  const handleDelete = (teamId: string) => {
    if (confirm('Are you sure you want to delete this team?')) {
      deleteTeam(teamId);
    }
  };

  const toggleAuthor = (authorLogin: string) => {
    setFormData(prev => ({
      ...prev,
      authorLogins: prev.authorLogins.includes(authorLogin)
        ? prev.authorLogins.filter(login => login !== authorLogin)
        : [...prev.authorLogins, authorLogin]
    }));
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={cn(
        "bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden",
        theme === "dark" && "bg-gray-800"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between p-6 border-b",
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        )}>
          <h2 className="text-xl font-semibold flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Manage Teams
          </h2>
          <button
            onClick={handleClose}
            className={cn(
              "p-2 rounded-lg hover:bg-gray-100",
              theme === "dark" && "hover:bg-gray-700"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Teams List */}
          <div className={cn(
            "w-1/2 border-r overflow-y-auto",
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          )}>
            <div className="p-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className={cn(
                  "w-full flex items-center justify-center p-3 rounded-lg border-2 border-dashed mb-4",
                  theme === "dark"
                    ? "border-gray-600 hover:border-gray-500 hover:bg-gray-700"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                )}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Team
              </button>

              <div className="space-y-2">
                {teams.map(team => (
                  <div
                    key={team.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer group",
                      theme === "dark"
                        ? "border-gray-700 hover:border-gray-600 hover:bg-gray-700"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                    onClick={() => {
                      setEditingTeam(team);
                      setShowCreateForm(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                          style={{ backgroundColor: team.color }}
                        >
                          {team.icon}
                        </div>
                        <div>
                          <h3 className="font-medium">{team.name}</h3>
                          <p className="text-sm text-gray-500">
                            {team.authorLogins.length} member{team.authorLogins.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTeam(team);
                            setShowCreateForm(false);
                          }}
                          className="p-1 rounded hover:bg-gray-200"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(team.id);
                          }}
                          className="p-1 rounded hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team Form */}
          <div className="w-1/2 overflow-y-auto">
            {(showCreateForm || editingTeam) && (
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">
                  {editingTeam ? 'Edit Team' : 'Create New Team'}
                </h3>

                <div className="space-y-4">
                  {/* Team Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Team Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300"
                      )}
                      placeholder="e.g., Frontend Team"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none",
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300"
                      )}
                      rows={2}
                      placeholder="Brief description of the team..."
                    />
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Team Color</label>
                    <div className="grid grid-cols-4 gap-2">
                      {TEAM_COLORS.map(color => (
                        <button
                          key={color.value}
                          onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                          className={cn(
                            "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                            formData.color === color.value
                              ? "border-gray-900 ring-2 ring-offset-2 ring-blue-500 scale-110"
                              : "border-gray-300 hover:border-gray-400 hover:scale-105",
                            theme === "dark" && formData.color === color.value && "border-white ring-offset-gray-800",
                            theme === "dark" && formData.color !== color.value && "border-gray-600 hover:border-gray-500"
                          )}
                          style={{ backgroundColor: color.value }}
                        >
                          {formData.color === color.value && (
                            <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Icon Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Team Icon</label>
                    <div className="grid grid-cols-4 gap-2">
                      {TEAM_ICONS.map(icon => (
                        <button
                          key={icon.value}
                          onClick={() => setFormData(prev => ({ ...prev, icon: icon.value }))}
                          className={cn(
                            "w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg transition-all",
                            formData.icon === icon.value
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-2 scale-110"
                              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50 hover:scale-105",
                            theme === "dark" && formData.icon === icon.value && "bg-blue-900/30 ring-offset-gray-800",
                            theme === "dark" && formData.icon !== icon.value && "border-gray-600 hover:border-gray-500 hover:bg-gray-700"
                          )}
                        >
                          {icon.value}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Team Members */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Team Members</label>
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                      {availableAuthors.map(author => (
                        <label
                          key={author.login}
                          className={cn(
                            "flex items-center space-x-3 p-2 rounded cursor-pointer hover:bg-gray-50",
                            theme === "dark" && "hover:bg-gray-700"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={formData.authorLogins.includes(author.login)}
                            onChange={() => toggleAuthor(author.login)}
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

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={handleClose}
                      className={cn(
                        "px-4 py-2 rounded-lg border",
                        theme === "dark"
                          ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!formData.name.trim()}
                      className={cn(
                        "px-4 py-2 rounded-lg flex items-center space-x-2",
                        formData.name.trim()
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      )}
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingTeam ? 'Update' : 'Create'} Team</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}