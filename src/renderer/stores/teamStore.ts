import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthorTeam {
  id: string;
  name: string;
  description?: string;
  members: string[]; // Array of author login names
  color?: string; // Optional color for visual identification
  icon?: string; // Optional emoji or icon
  createdAt: string;
  updatedAt: string;
}

interface TeamState {
  teams: AuthorTeam[];
  
  // Team management actions
  createTeam: (team: Omit<AuthorTeam, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTeam: (id: string, updates: Partial<Omit<AuthorTeam, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteTeam: (id: string) => void;
  getTeam: (id: string) => AuthorTeam | undefined;
  
  // Utility functions
  getTeamsContainingAuthor: (authorLogin: string) => AuthorTeam[];
  getAllAuthorsFromTeams: (teamIds: string[]) => string[];
}

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      teams: [],

      createTeam: (teamData) => {
        const now = new Date().toISOString();
        const newTeam: AuthorTeam = {
          ...teamData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          teams: [...state.teams, newTeam],
        }));
      },

      updateTeam: (id, updates) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === id
              ? { ...team, ...updates, updatedAt: new Date().toISOString() }
              : team
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

      getTeamsContainingAuthor: (authorLogin) => {
        return get().teams.filter((team) =>
          team.members.includes(authorLogin)
        );
      },

      getAllAuthorsFromTeams: (teamIds) => {
        const { teams } = get();
        const selectedTeams = teams.filter((team) => teamIds.includes(team.id));
        const allAuthors = new Set<string>();
        
        selectedTeams.forEach((team) => {
          team.members.forEach((member) => allAuthors.add(member));
        });

        return Array.from(allAuthors);
      },
    }),
    {
      name: "team-storage",
      // Persist all team data
    }
  )
);