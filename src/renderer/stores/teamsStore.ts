import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Team, TeamFormData } from "../types/teams";

interface TeamsStore {
  teams: Team[];
  addTeam: (teamData: TeamFormData) => string; // Returns the ID of the created team
  updateTeam: (teamId: string, teamData: Partial<TeamFormData>) => void;
  deleteTeam: (teamId: string) => void;
  getTeam: (teamId: string) => Team | undefined;
  getTeamsByMember: (memberLogin: string) => Team[];
  importTeams: (teams: Team[]) => void;
  exportTeams: () => Team[];
}

// Generate a unique ID for a team
const generateTeamId = (): string => {
  return `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useTeamsStore = create<TeamsStore>()(
  persist(
    (set, get) => ({
      teams: [],

      addTeam: (teamData: TeamFormData) => {
        const newTeam: Team = {
          id: generateTeamId(),
          name: teamData.name,
          members: teamData.members,
          color: teamData.color,
          icon: teamData.icon,
          description: teamData.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          teams: [...state.teams, newTeam],
        }));

        return newTeam.id;
      },

      updateTeam: (teamId: string, teamData: Partial<TeamFormData>) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === teamId
              ? {
                  ...team,
                  ...teamData,
                  updatedAt: new Date().toISOString(),
                }
              : team
          ),
        }));
      },

      deleteTeam: (teamId: string) => {
        set((state) => ({
          teams: state.teams.filter((team) => team.id !== teamId),
        }));
      },

      getTeam: (teamId: string) => {
        return get().teams.find((team) => team.id === teamId);
      },

      getTeamsByMember: (memberLogin: string) => {
        return get().teams.filter((team) => team.members.includes(memberLogin));
      },

      importTeams: (teams: Team[]) => {
        set({ teams });
      },

      exportTeams: () => {
        return get().teams;
      },
    }),
    {
      name: "teams-storage", // Unique name for localStorage key
      version: 1, // Version number for migration purposes
    }
  )
);

// Default teams that can be suggested to users
export const defaultTeamSuggestions = [
  {
    name: "Frontend Team",
    icon: "🎨",
    description: "Frontend developers and UI/UX designers",
  },
  {
    name: "Backend Team", 
    icon: "⚙️",
    description: "Backend engineers and system architects",
  },
  {
    name: "DevOps Team",
    icon: "🚀",
    description: "DevOps engineers and infrastructure specialists",
  },
  {
    name: "Code Reviewers",
    icon: "👁️",
    description: "Designated code reviewers and maintainers",
  },
  {
    name: "QA Team",
    icon: "🧪",
    description: "Quality assurance engineers and testers",
  },
];