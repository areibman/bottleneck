import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { Team, TeamMember, TeamFormData } from "../types/teams";

interface TeamsState {
  teams: Team[];
  selectedTeamIds: Set<string>;
  
  // CRUD operations
  createTeam: (data: TeamFormData) => Team;
  updateTeam: (id: string, data: Partial<TeamFormData>) => void;
  deleteTeam: (id: string) => void;
  getTeam: (id: string) => Team | undefined;
  
  // Selection management
  selectTeam: (id: string) => void;
  deselectTeam: (id: string) => void;
  clearTeamSelection: () => void;
  toggleTeam: (id: string) => void;
  
  // Utility functions
  getSelectedAuthors: () => string[];
  updateLastUsed: (id: string) => void;
  importTeams: (teams: Team[]) => void;
  exportTeams: () => string;
  
  // Check if an author is in selected teams
  isAuthorInSelectedTeams: (authorLogin: string) => boolean;
}

const DEFAULT_TEAMS: Team[] = [
  {
    id: 'recent-authors',
    name: 'Recent Authors',
    description: 'Authors from recent PRs/issues',
    members: [],
    icon: '🕐',
    createdAt: new Date().toISOString(),
    isDefault: true,
  }
];

export const useTeamsStore = create<TeamsState>()(
  persist(
    (set, get) => ({
      teams: DEFAULT_TEAMS,
      selectedTeamIds: new Set(),
      
      createTeam: (data: TeamFormData) => {
        const newTeam: Team = {
          id: uuidv4(),
          name: data.name,
          description: data.description,
          members: data.members.map(login => ({ login })),
          color: data.color,
          icon: data.icon,
          createdAt: new Date().toISOString(),
        };
        
        set(state => ({
          teams: [...state.teams, newTeam],
        }));
        
        return newTeam;
      },
      
      updateTeam: (id: string, data: Partial<TeamFormData>) => {
        set(state => ({
          teams: state.teams.map(team => {
            if (team.id !== id || team.isDefault) return team;
            
            return {
              ...team,
              ...(data.name && { name: data.name }),
              ...(data.description !== undefined && { description: data.description }),
              ...(data.members && { members: data.members.map(login => ({ login })) }),
              ...(data.color !== undefined && { color: data.color }),
              ...(data.icon !== undefined && { icon: data.icon }),
            };
          }),
        }));
      },
      
      deleteTeam: (id: string) => {
        set(state => ({
          teams: state.teams.filter(team => team.id !== id && !team.isDefault),
          selectedTeamIds: new Set(Array.from(state.selectedTeamIds).filter(teamId => teamId !== id)),
        }));
      },
      
      getTeam: (id: string) => {
        return get().teams.find(team => team.id === id);
      },
      
      selectTeam: (id: string) => {
        const team = get().getTeam(id);
        if (!team) return;
        
        set(state => {
          const newSelectedIds = new Set(state.selectedTeamIds);
          newSelectedIds.add(id);
          return { selectedTeamIds: newSelectedIds };
        });
        
        get().updateLastUsed(id);
      },
      
      deselectTeam: (id: string) => {
        set(state => {
          const newSelectedIds = new Set(state.selectedTeamIds);
          newSelectedIds.delete(id);
          return { selectedTeamIds: newSelectedIds };
        });
      },
      
      clearTeamSelection: () => {
        set({ selectedTeamIds: new Set() });
      },
      
      toggleTeam: (id: string) => {
        const state = get();
        if (state.selectedTeamIds.has(id)) {
          state.deselectTeam(id);
        } else {
          state.selectTeam(id);
        }
      },
      
      getSelectedAuthors: () => {
        const state = get();
        const authors = new Set<string>();
        
        state.selectedTeamIds.forEach(teamId => {
          const team = state.teams.find(t => t.id === teamId);
          if (team) {
            team.members.forEach(member => authors.add(member.login));
          }
        });
        
        return Array.from(authors);
      },
      
      updateLastUsed: (id: string) => {
        set(state => ({
          teams: state.teams.map(team => {
            if (team.id !== id) return team;
            return {
              ...team,
              lastUsedAt: new Date().toISOString(),
            };
          }),
        }));
      },
      
      importTeams: (teams: Team[]) => {
        set(state => {
          const existingIds = new Set(state.teams.map(t => t.id));
          const newTeams = teams.filter(t => !existingIds.has(t.id) && !t.isDefault);
          return {
            teams: [...state.teams, ...newTeams],
          };
        });
      },
      
      exportTeams: () => {
        const teams = get().teams.filter(t => !t.isDefault);
        return JSON.stringify(teams, null, 2);
      },
      
      isAuthorInSelectedTeams: (authorLogin: string) => {
        const state = get();
        for (const teamId of state.selectedTeamIds) {
          const team = state.teams.find(t => t.id === teamId);
          if (team?.members.some(m => m.login === authorLogin)) {
            return true;
          }
        }
        return false;
      },
    }),
    {
      name: "teams-storage",
      partialize: (state) => ({
        teams: state.teams.filter(t => !t.isDefault),
      }),
    },
  ),
);