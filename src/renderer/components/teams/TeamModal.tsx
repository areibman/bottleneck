import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import type { TeamDefinition } from "../../stores/teamStore";

interface AuthorOption {
  login: string;
  avatar_url: string;
}

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: {
    id?: string;
    name: string;
    members: string[];
    color?: string;
    icon?: string;
    description?: string;
  }) => Promise<void> | void;
  initialTeam?: TeamDefinition | null;
  availableAuthors: AuthorOption[];
  theme: "light" | "dark";
}

export default function TeamModal({
  isOpen,
  onClose,
  onSave,
  initialTeam,
  availableAuthors,
  theme,
}: TeamModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>("");
  const [icon, setIcon] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set<string>());

  useEffect(() => {
    if (isOpen) {
      setName(initialTeam?.name || "");
      setDescription(initialTeam?.description || "");
      setColor(initialTeam?.color || "");
      setIcon(initialTeam?.icon || "");
      setSelected(new Set(initialTeam?.members || []));
      setSearch("");
    }
  }, [isOpen, initialTeam]);

  const filteredAuthors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableAuthors;
    return availableAuthors.filter((a) => a.login.toLowerCase().includes(q));
  }, [availableAuthors, search]);

  const toggleMember = (login: string) => {
    setSelected((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(login)) next.delete(login);
      else next.add(login);
      return next;
    });
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const members: string[] = Array.from(selected.values());
    if (!trimmedName || members.length === 0) {
      alert("Please enter a team name and select at least one member.");
      return;
    }
    await onSave({
      id: initialTeam?.id,
      name: trimmedName,
      members,
      color: color || undefined,
      icon: icon || undefined,
      description: description || undefined,
    });
    onClose();
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
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className={cn(
          "w-full max-w-lg rounded-md shadow-lg border",
          theme === "dark"
            ? "bg-gray-800 border-gray-700 text-gray-100"
            : "bg-white border-gray-200 text-gray-900",
        )}
      >
        <div className={cn(
          "flex items-center justify-between px-4 py-3 border-b",
          theme === "dark" ? "border-gray-700" : "border-gray-200",
        )}>
          <h2 className="text-sm font-semibold truncate">
            {initialTeam ? "Edit Team" : "Create New Team"}
          </h2>
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

        <div className="px-4 py-3 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Team name</label>
            <input
              type="text"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              className={cn(
                "w-full px-2 py-1 text-sm rounded border",
                theme === "dark"
                  ? "bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500",
              )}
              placeholder="e.g. Frontend Team"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Color</label>
              <input
                type="color"
                value={color || "#999999"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                className="w-full h-8 p-0 border-0 bg-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Icon</label>
              <input
                type="text"
                value={icon}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIcon(e.target.value)}
                className={cn(
                  "w-full px-2 py-1 text-sm rounded border",
                  theme === "dark"
                    ? "bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500",
                )}
                placeholder="Optional emoji or short label"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={2}
              className={cn(
                "w-full px-2 py-1 text-sm rounded border resize-y",
                theme === "dark"
                  ? "bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500",
              )}
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Members</label>
            <input
              type="text"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className={cn(
                "w-full px-2 py-1 text-sm rounded border mb-2",
                theme === "dark"
                  ? "bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500",
              )}
              placeholder="Search authors..."
            />
            <div
              className={cn(
                "max-h-56 overflow-y-auto rounded border",
                theme === "dark" ? "border-gray-700" : "border-gray-200",
              )}
            >
              {filteredAuthors.map((author: AuthorOption) => (
                <label
                  key={author.login}
                  className={cn(
                    "flex items-center space-x-2 p-2 cursor-pointer text-sm",
                    theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(author.login)}
                    onChange={() => toggleMember(author.login)}
                  />
                  <img
                    src={author.avatar_url}
                    alt={author.login}
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="truncate">{author.login}</span>
                </label>
              ))}
              {filteredAuthors.length === 0 && (
                <div className={cn(
                  "p-2 text-xs",
                  theme === "dark" ? "text-gray-400" : "text-gray-600",
                )}>
                  No authors match your search.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={cn(
          "flex items-center justify-end gap-2 px-4 py-3 border-t",
          theme === "dark" ? "border-gray-700" : "border-gray-200",
        )}>
          <button
            onClick={onClose}
            className={cn(
              "px-3 py-1.5 text-xs rounded border",
              theme === "dark"
                ? "border-gray-600 text-gray-300 hover:bg-gray-800"
                : "border-gray-300 text-gray-700 hover:bg-gray-100",
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={cn(
              "px-3 py-1.5 text-xs rounded border font-medium",
              theme === "dark"
                ? "border-blue-500 text-blue-300 hover:bg-blue-900/20"
                : "border-blue-500 text-blue-600 hover:bg-blue-50",
            )}
          >
            Save Team
          </button>
        </div>
      </div>
    </div>
  );
}

