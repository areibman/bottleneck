import { useState, useEffect } from "react";
import { X, Plus, Trash2, Users, Download, Upload } from "lucide-react";
import { useTeamsStore, AuthorTeam } from "../stores/teamsStore";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";

interface TeamManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableAuthors: { login: string; avatar_url: string }[];
  initialTeam?: AuthorTeam;
}

export default function TeamManagementDialog({
  isOpen,
  onClose,
  availableAuthors,
  initialTeam,
}: TeamManagementDialogProps) {
  const { theme } = useUIStore();
  const { createTeam, updateTeam, deleteTeam, teams, exportTeams, importTeams } = useTeamsStore();

  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [teamColor, setTeamColor] = useState("#3b82f6");
  const [searchQuery, setSearchQuery] = useState("");
  const [showImportExport, setShowImportExport] = useState(false);
  const [importData, setImportData] = useState("");

  useEffect(() => {
    if (initialTeam) {
      setTeamName(initialTeam.name);
      setTeamDescription(initialTeam.description || "");
      setSelectedMembers(new Set(initialTeam.members));
      setTeamColor(initialTeam.color || "#3b82f6");
    } else {
      setTeamName("");
      setTeamDescription("");
      setSelectedMembers(new Set());
      setTeamColor("#3b82f6");
    }
  }, [initialTeam, isOpen]);

  const handleToggleMember = (login: string) => {
    setSelectedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(login)) {
        newSet.delete(login);
      } else {
        newSet.add(login);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    if (!teamName.trim() || selectedMembers.size === 0) {
      alert("Please provide a team name and select at least one member.");
      return;
    }

    const teamData = {
      name: teamName.trim(),
      description: teamDescription.trim(),
      members: Array.from(selectedMembers),
      color: teamColor,
      icon: "🏢",
    };

    if (initialTeam) {
      updateTeam(initialTeam.id, teamData);
    } else {
      createTeam(teamData);
    }

    onClose();
  };

  const handleDelete = () => {
    if (initialTeam && confirm(`Are you sure you want to delete "${initialTeam.name}"?`)) {
      deleteTeam(initialTeam.id);
      onClose();
    }
  };

  const handleExport = () => {
    const data = exportTeams();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "author-teams.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (importTeams(importData)) {
      alert("Teams imported successfully!");
      setImportData("");
      setShowImportExport(false);
    } else {
      alert("Failed to import teams. Please check the format.");
    }
  };

  const filteredAuthors = availableAuthors.filter((author) =>
    author.login.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={cn(
          "w-full max-w-2xl max-h-[90vh] rounded-lg shadow-xl flex flex-col",
          theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-900"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between p-4 border-b",
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          )}
        >
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <h2 className="text-lg font-semibold">
              {initialTeam ? "Edit Team" : "Create New Team"}
            </h2>
          </div>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Team Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Team Name *</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Frontend Team, Backend Team"
              className={cn(
                "w-full px-3 py-2 rounded border",
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 focus:border-blue-500"
                  : "bg-white border-gray-300 focus:border-blue-500"
              )}
            />
          </div>

          {/* Team Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
            <textarea
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              placeholder="Brief description of this team"
              rows={2}
              className={cn(
                "w-full px-3 py-2 rounded border resize-none",
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 focus:border-blue-500"
                  : "bg-white border-gray-300 focus:border-blue-500"
              )}
            />
          </div>

          {/* Team Color */}
          <div>
            <label className="block text-sm font-medium mb-1">Team Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={teamColor}
                onChange={(e) => setTeamColor(e.target.value)}
                className="h-10 w-20 rounded cursor-pointer"
              />
              <span className="text-sm text-gray-500">{teamColor}</span>
            </div>
          </div>

          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Team Members * ({selectedMembers.size} selected)
            </label>
            
            {/* Search */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search authors..."
              className={cn(
                "w-full px-3 py-2 rounded border mb-2",
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 focus:border-blue-500"
                  : "bg-white border-gray-300 focus:border-blue-500"
              )}
            />

            {/* Author List */}
            <div
              className={cn(
                "max-h-64 overflow-y-auto rounded border",
                theme === "dark" ? "border-gray-700" : "border-gray-200"
              )}
            >
              {filteredAuthors.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No authors found
                </div>
              ) : (
                filteredAuthors.map((author) => (
                  <label
                    key={author.login}
                    className={cn(
                      "flex items-center space-x-3 p-3 cursor-pointer border-b last:border-b-0",
                      theme === "dark"
                        ? "hover:bg-gray-700 border-gray-700"
                        : "hover:bg-gray-50 border-gray-200"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.has(author.login)}
                      onChange={() => handleToggleMember(author.login)}
                      className="rounded"
                    />
                    <img
                      src={author.avatar_url}
                      alt={author.login}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm">{author.login}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Import/Export Section */}
          <div
            className={cn(
              "pt-4 border-t",
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            )}
          >
            <button
              onClick={() => setShowImportExport(!showImportExport)}
              className={cn(
                "text-sm flex items-center space-x-2",
                theme === "dark" ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-700"
              )}
            >
              <span>Import/Export Teams</span>
            </button>

            {showImportExport && (
              <div className="mt-3 space-y-3">
                <div className="flex space-x-2">
                  <button
                    onClick={handleExport}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded text-sm",
                      theme === "dark"
                        ? "bg-gray-700 hover:bg-gray-600"
                        : "bg-gray-100 hover:bg-gray-200"
                    )}
                  >
                    <Download className="w-4 h-4" />
                    <span>Export All Teams</span>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Import Teams (JSON)</label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste exported team JSON here..."
                    rows={4}
                    className={cn(
                      "w-full px-3 py-2 rounded border resize-none text-xs font-mono",
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 focus:border-blue-500"
                        : "bg-white border-gray-300 focus:border-blue-500"
                    )}
                  />
                  <button
                    onClick={handleImport}
                    disabled={!importData.trim()}
                    className={cn(
                      "mt-2 flex items-center space-x-2 px-3 py-2 rounded text-sm",
                      theme === "dark"
                        ? "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700"
                        : "bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={cn(
            "flex items-center justify-between p-4 border-t",
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          )}
        >
          <div>
            {initialTeam && (
              <button
                onClick={handleDelete}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded text-sm",
                  "text-red-500 hover:bg-red-500/10"
                )}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Team</span>
              </button>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
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
              onClick={handleSave}
              disabled={!teamName.trim() || selectedMembers.size === 0}
              className={cn(
                "px-4 py-2 rounded text-sm text-white",
                theme === "dark"
                  ? "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700"
                  : "bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {initialTeam ? "Update Team" : "Create Team"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}