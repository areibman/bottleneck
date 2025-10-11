import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthorTeam {
  id: string;
  name: string;
  members: string[]; // Array of author login names
  color?: string; // Optional color for visual identification
  icon?: string; // Optional icon/emoji
  description?: string;
}

interface TeamsState {
  teams: AuthorTeam[];
  addTeam: (team: Omit<AuthorTeam, "id">) => void;
  updateTeam: (id: string, team: Partial<Omit<AuthorTeam, "id">>) => void;
  deleteTeam: (id: string) => void;
  getTeam: (id: string) => AuthorTeam | undefined;
  getAllTeams: () => AuthorTeam[];
}

export const useTeamsStore = create<TeamsState>()(
  persist(
    (set, get) => ({
      teams: [],

      addTeam: (team) => {
        const id = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
          teams: [...state.teams, { ...team, id }],
        }));
      },

      updateTeam: (id, updates) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === id ? { ...team, ...updates } : team
          ),
        }));
      },

      deleteTeam: (id) => {
        set((state) => ({
          teams: state.teams.filter((team) => team.id !== id),
        }));
      },

      getTeam: (id) => {
        return get().teams.find((team) => team.id === id);
      },

      getAllTeams: () => {
        return get().teams;
      },
    }),
    {
      name: "teams-storage",
    }
  )
);
