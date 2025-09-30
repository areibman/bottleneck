import { create } from "zustand";
import { nanoid } from "nanoid";

export interface AuthorTeam {
  id: string;
  name: string;
  members: string[]; // GitHub logins
  createdAt: string;
}

interface AuthorTeamState {
  teams: AuthorTeam[];
  addTeam: (name: string, members: string[]) => void;
  updateTeam: (id: string, data: Partial<Omit<AuthorTeam, "id" | "createdAt">>) => void;
  deleteTeam: (id: string) => void;
}

const STORAGE_KEY = "authorTeams";

function loadTeams(): AuthorTeam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as AuthorTeam[];
    }
  } catch (err) {
    console.error("Failed to load author teams:", err);
  }
  return [];
}

function saveTeams(teams: AuthorTeam[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
  } catch (err) {
    console.error("Failed to save author teams:", err);
  }
}

export const useAuthorTeamStore = create<AuthorTeamState>((set, get) => ({
  teams: loadTeams(),
  addTeam: (name, members) => {
    const newTeam: AuthorTeam = {
      id: nanoid(),
      name,
      members: Array.from(new Set(members)),
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const updated = [...state.teams, newTeam];
      saveTeams(updated);
      return { teams: updated };
    });
  },
  updateTeam: (id, data) => {
    set((state) => {
      const updated = state.teams.map((team) =>
        team.id === id ? { ...team, ...data } : team,
      );
      saveTeams(updated);
      return { teams: updated };
    });
  },
  deleteTeam: (id) => {
    set((state) => {
      const updated = state.teams.filter((team) => team.id !== id);
      saveTeams(updated);
      return { teams: updated };
    });
  },
}));