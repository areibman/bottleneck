import React, { useMemo, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useUIStore } from "../stores/uiStore";
import { AuthorTeam, useSettingsStore } from "../stores/settingsStore";
import { cn } from "../utils/cn";

interface TeamManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAuthors: { login: string; avatar_url: string }[];
  initialEditingTeamId?: string | null;
}

export default function TeamManagerModal({
  isOpen,
  onClose,
  availableAuthors,
  initialEditingTeamId = null,
}: TeamManagerModalProps) {
  const { theme } = useUIStore();
  const { settings, addAuthorTeam, updateAuthorTeam, deleteAuthorTeam } = useSettingsStore();
  const [editingId, setEditingId] = useState<string | null>(initialEditingTeamId);

  const editingTeam = useMemo<AuthorTeam | null>(() => {
    return (settings.authorTeams || []).find((t) => t.id === editingId) || null;
  }, [settings.authorTeams, editingId]);

  const [name, setName] = useState<string>(editingTeam?.name || "");
  const [description, setDescription] = useState<string>(editingTeam?.description || "");
  const [color, setColor] = useState<string>(editingTeam?.color || "");
  const [icon, setIcon] = useState<string>(editingTeam?.icon || "");
  const [members, setMembers] = useState<string[]>(editingTeam?.members || []);

  React.useEffect(() => {
    if (editingTeam) {
      setName(editingTeam.name || "");
      setDescription(editingTeam.description || "");
      setColor(editingTeam.color || "");
      setIcon(editingTeam.icon || "");
      setMembers(editingTeam.members || []);
    } else {
      setName("");
      setDescription("");
      setColor("");
      setIcon("");
      setMembers([]);
    }
  }, [editingTeam]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && editingTeam) {
      updateAuthorTeam({
        id: editingTeam.id,
        name: name.trim() || editingTeam.name,
        members,
        color: color || undefined,
        icon: icon || undefined,
        description: description || undefined,
      });
    } else {
      addAuthorTeam({
        name: name.trim() || "Untitled Team",
        members,
        color: color || undefined,
        icon: icon || undefined,
        description: description || undefined,
      });
    }
    onClose();
  };

  const toggleMember = (login: string) => {
    setMembers((prev) => {
      const next = new Set(prev);
      if (next.has(login)) next.delete(login);
      else next.add(login);
      return Array.from(next);
    });
  };

  const handleDelete = () => {
    if (editingId) {
      deleteAuthorTeam(editingId);
      setEditingId(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={cn(
          "absolute inset-0 bg-black/50",
          theme === "dark" ? "backdrop-blur-sm" : "backdrop-blur-sm",
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-md shadow-lg border",
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
          <h2 className="text-lg font-semibold">
            {editingId ? "Edit Team" : "Create New Team"}
          </h2>
          <button onClick={onClose} className="p-1 hover:opacity-80">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Frontend Team"
              className={cn(
                "w-full text-sm px-3 py-2 rounded border",
                theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300",
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Icon (emoji)</label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🏢"
                className={cn(
                  "w-full text-sm px-3 py-2 rounded border",
                  theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300",
                )}
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Color</label>
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#2563eb"
                className={cn(
                  "w-full text-sm px-3 py-2 rounded border",
                  theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300",
                )}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Developers focusing on the frontend surfaces"
              rows={3}
              className={cn(
                "w-full text-sm px-3 py-2 rounded border resize-none",
                theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300",
              )}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs mb-1">Members</label>
              <span className="text-xs opacity-70">{members.length} selected</span>
            </div>
            <div className="max-h-48 overflow-y-auto border rounded p-2 mt-1"
              style={{ borderColor: theme === "dark" ? "#374151" : "#e5e7eb" }}
            >
              {availableAuthors.map((author) => {
                const checked = members.includes(author.login);
                return (
                  <label
                    key={author.login}
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded cursor-pointer",
                      theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(author.login)}
                      className="rounded"
                    />
                    <img src={author.avatar_url} alt={author.login} className="w-5 h-5 rounded-full" />
                    <span className="text-sm">{author.login}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {editingId ? (
              <button
                type="button"
                onClick={handleDelete}
                className={cn(
                  "inline-flex items-center text-xs px-2 py-1 rounded border",
                  theme === "dark" ? "border-red-800 text-red-300 hover:bg-red-900/20" : "border-red-300 text-red-700 hover:bg-red-50",
                )}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Team
              </button>
            ) : (
              <span />
            )}

            <div className="space-x-2">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "text-xs px-3 py-1 rounded border",
                  theme === "dark" ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100",
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={cn(
                  "text-xs px-3 py-1 rounded border",
                  theme === "dark" ? "border-blue-700 bg-blue-600 text-white hover:bg-blue-500" : "border-blue-300 bg-blue-600 text-white hover:bg-blue-500",
                )}
              >
                {editingId ? "Save" : (
                  <span className="inline-flex items-center"><Plus className="w-3.5 h-3.5 mr-1" /> Create</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
