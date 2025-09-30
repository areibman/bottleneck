import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthorTeam {
  id: string;
  name: string;
  members: string[]; // Array of GitHub usernames
  description?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  lastUsed?: string;
}

interface TeamsState {
  teams: AuthorTeam[];
  createTeam: (team: Omit<AuthorTeam, "id" | "createdAt">) => void;
  updateTeam: (id: string, updates: Partial<Omit<AuthorTeam, "id" | "createdAt">>) => void;
  deleteTeam: (id: string) => void;
  getTeam: (id: string) => AuthorTeam | undefined;
  markTeamAsUsed: (id: string) => void;
  exportTeams: () => string;
  importTeams: (data: string) => boolean;
}

const generateId = () => {
  return `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useTeamsStore = create<TeamsState>()(
  persist(
    (set, get) => ({
      teams: [],

      createTeam: (teamData) => {
        const newTeam: AuthorTeam = {
          ...teamData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          teams: [...state.teams, newTeam],
        }));

        // Save to electron store if available
        if (window.electron) {
          window.electron.settings.set("authorTeams", [...get().teams]).catch((error) => {
            console.error("Failed to save teams to electron store:", error);
          });
        }
      },

      updateTeam: (id, updates) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === id ? { ...team, ...updates } : team
          ),
        }));

        // Save to electron store if available
        if (window.electron) {
          window.electron.settings.set("authorTeams", get().teams).catch((error) => {
            console.error("Failed to save teams to electron store:", error);
          });
        }
      },

      deleteTeam: (id) => {
        set((state) => ({
          teams: state.teams.filter((team) => team.id !== id),
        }));

        // Save to electron store if available
        if (window.electron) {
          window.electron.settings.set("authorTeams", get().teams).catch((error) => {
            console.error("Failed to save teams to electron store:", error);
          });
        }
      },

      getTeam: (id) => {
        return get().teams.find((team) => team.id === id);
      },

      markTeamAsUsed: (id) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === id
              ? { ...team, lastUsed: new Date().toISOString() }
              : team
          ),
        }));

        // Save to electron store if available
        if (window.electron) {
          window.electron.settings.set("authorTeams", get().teams).catch((error) => {
            console.error("Failed to save teams to electron store:", error);
          });
        }
      },

      exportTeams: () => {
        return JSON.stringify(get().teams, null, 2);
      },

      importTeams: (data) => {
        try {
          const importedTeams = JSON.parse(data) as AuthorTeam[];
          
          // Validate the structure
          if (!Array.isArray(importedTeams)) {
            return false;
          }

          // Validate each team has required fields
          const isValid = importedTeams.every(
            (team) =>
              typeof team.name === "string" &&
              Array.isArray(team.members) &&
              team.members.every((m) => typeof m === "string")
          );

          if (!isValid) {
            return false;
          }

          // Regenerate IDs to avoid conflicts
          const teamsWithNewIds = importedTeams.map((team) => ({
            ...team,
            id: generateId(),
            createdAt: new Date().toISOString(),
          }));

          set((state) => ({
            teams: [...state.teams, ...teamsWithNewIds],
          }));

          // Save to electron store if available
          if (window.electron) {
            window.electron.settings.set("authorTeams", get().teams).catch((error) => {
              console.error("Failed to save teams to electron store:", error);
            });
          }

          return true;
        } catch (error) {
          console.error("Failed to import teams:", error);
          return false;
        }
      },
    }),
    {
      name: "teams-storage",
      // Load teams from electron store on initialization
      onRehydrateStorage: () => {
        return async (state) => {
          if (window.electron && state) {
            try {
              const result = await window.electron.settings.get("authorTeams");
              if (result.success && result.value) {
                state.teams = result.value as AuthorTeam[];
              }
            } catch (error) {
              console.error("Failed to load teams from electron store:", error);
            }
          }
        };
      },
    }
  )
);