import React, { useMemo, useState } from "react";
import { Trash2, Pencil, Download, Upload, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { TeamDefinition, useTeamStore } from "../../stores/teamStore";
import TeamModal from "./TeamModal";

interface AuthorOption {
  login: string;
  avatar_url: string;
}

interface TeamsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "light" | "dark";
  availableAuthors: AuthorOption[];
}

export default function TeamsManagerModal({
  isOpen,
  onClose,
  theme,
  availableAuthors,
}: TeamsManagerModalProps) {
  const { teams, addTeam, updateTeam, deleteTeam, importTeams, exportTeams } = useTeamStore();
  const [editingTeam, setEditingTeam] = useState<TeamDefinition | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      const aDate = a.lastUsedAt || a.createdAt;
      const bDate = b.lastUsedAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [teams]);

  const handleCreateNew = () => {
    setEditingTeam(null);
    setShowEditModal(true);
  };

  const handleEdit = (team: TeamDefinition) => {
    setEditingTeam(team);
    setShowEditModal(true);
  };

  const handleSave = async (input: {
    id?: string;
    name: string;
    members: string[];
    color?: string;
    icon?: string;
    description?: string;
  }) => {
    if (input.id) {
      await updateTeam(input.id, input);
    } else {
      await addTeam(input);
    }
  };

  const handleDelete = async (team: TeamDefinition) => {
    if (confirm(`Delete team "${team.name}"?`)) {
      await deleteTeam(team.id);
    }
  };

  const handleExport = () => {
    const json = exportTeams();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teams.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as TeamDefinition[];
      await importTeams(parsed);
      alert("Teams imported.");
    } catch (error) {
      alert("Failed to import teams. Ensure the file is valid JSON.");
    } finally {
      event.target.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        theme === "dark" ? "bg-black/50" : "bg-black/40",
      )}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "w-full max-w-2xl rounded-md shadow-lg border",
          theme === "dark"
            ? "bg-gray-800 border-gray-700 text-gray-100"
            : "bg-white border-gray-200 text-gray-900",
        )}
      >
        <div className={cn(
          "flex items-center justify-between px-4 py-3 border-b",
          theme === "dark" ? "border-gray-700" : "border-gray-200",
        )}>
          <h2 className="text-sm font-semibold">Manage Teams</h2>
          <div className="flex items-center gap-2">
            <label className={cn(
              "px-2 py-1 text-xs rounded border cursor-pointer",
              theme === "dark" ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100",
            )}>
              <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
              <span className="inline-flex items-center gap-1"><Upload className="w-3 h-3" /> Import</span>
            </label>
            <button
              onClick={handleExport}
              className={cn(
                "px-2 py-1 text-xs rounded border",
                theme === "dark" ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100",
              )}
            >
              <span className="inline-flex items-center gap-1"><Download className="w-3 h-3" /> Export</span>
            </button>
            <button
              onClick={onClose}
              className={cn(
                "p-1 rounded",
                theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100",
              )}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-gray-500">
              {sortedTeams.length} {sortedTeams.length === 1 ? "team" : "teams"}
            </div>
            <button
              onClick={handleCreateNew}
              className={cn(
                "px-2 py-1 text-xs rounded border",
                theme === "dark" ? "border-blue-500 text-blue-300 hover:bg-blue-900/20" : "border-blue-500 text-blue-600 hover:bg-blue-50",
              )}
            >
              + Create Team
            </button>
          </div>

          <div className={cn(
            "border rounded divide-y",
            theme === "dark" ? "border-gray-700 divide-gray-700" : "border-gray-200 divide-gray-200",
          )}>
            {sortedTeams.map((team) => (
              <div key={team.id} className="flex items-center justify-between p-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {team.color && (
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: team.color }} />
                    )}
                    <span className="text-sm font-medium truncate">{team.icon ? `${team.icon} ` : ""}{team.name}</span>
                    <span className={cn(
                      "text-xs",
                      theme === "dark" ? "text-gray-400" : "text-gray-600",
                    )}>
                      ({team.members.length} members)
                    </span>
                  </div>
                  {team.description && (
                    <div className={cn(
                      "text-xs truncate",
                      theme === "dark" ? "text-gray-400" : "text-gray-600",
                    )}>
                      {team.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(team)}
                    className={cn(
                      "px-2 py-1 text-xs rounded border inline-flex items-center gap-1",
                      theme === "dark" ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100",
                    )}
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(team)}
                    className={cn(
                      "px-2 py-1 text-xs rounded border inline-flex items-center gap-1",
                      theme === "dark" ? "border-red-500/60 text-red-300 hover:bg-red-900/30" : "border-red-400 text-red-600 hover:bg-red-50",
                    )}
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
            {sortedTeams.length === 0 && (
              <div className={cn(
                "p-3 text-xs",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}>
                No teams yet. Create your first team.
              </div>
            )}
          </div>
        </div>
      </div>

      <TeamModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSave}
        initialTeam={editingTeam}
        availableAuthors={availableAuthors}
        theme={theme}
      />
    </div>
  );
}

