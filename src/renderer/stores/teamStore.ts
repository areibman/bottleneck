import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Team {
  id: string;
  name: string;
  description?: string;
  authors: string[]; // Array of author usernames
  color?: string; // Optional hex color for visual identification
  icon?: string; // Optional emoji or icon
  createdAt: string;
  lastUsedAt?: string;
}

interface TeamState {
  teams: Team[];
  createTeam: (team: Omit<Team, "id" | "createdAt" | "lastUsedAt">) => void;
  updateTeam: (id: string, updates: Partial<Omit<Team, "id" | "createdAt">>) => void;
  deleteTeam: (id: string) => void;
  getTeam: (id: string) => Team | undefined;
  getTeamsByAuthors: (authors: string[]) => Team[];
  markTeamAsUsed: (id: string) => void;
  exportTeams: () => string;
  importTeams: (data: string) => boolean;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      teams: [],

      createTeam: (teamData) => {
        const newTeam: Team = {
          ...teamData,
          id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          teams: [...state.teams, newTeam],
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

      getTeamsByAuthors: (authors) => {
        return get().teams.filter((team) =>
          authors.some((author) => team.authors.includes(author))
        );
      },

      markTeamAsUsed: (id) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === id
              ? { ...team, lastUsedAt: new Date().toISOString() }
              : team
          ),
        }));
      },

      exportTeams: () => {
        const teams = get().teams;
        return JSON.stringify(teams, null, 2);
      },

      importTeams: (data) => {
        try {
          const importedTeams = JSON.parse(data);
          if (Array.isArray(importedTeams)) {
            // Validate team structure
            const validTeams = importedTeams.filter(
              (team) =>
                team.id &&
                team.name &&
                Array.isArray(team.authors) &&
                team.createdAt
            );
            
            if (validTeams.length > 0) {
              set({ teams: validTeams });
              return true;
            }
          }
          return false;
        } catch (error) {
          console.error("Failed to import teams:", error);
          return false;
        }
      },
    }),
    {
      name: "team-storage",
      partialize: (state) => ({ teams: state.teams }),
    }
  )
);