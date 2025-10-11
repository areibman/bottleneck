import { create } from "zustand";

export interface TeamDefinition {
  id: string;
  name: string;
  members: string[];
  color?: string;
  icon?: string;
  description?: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface TeamInput {
  name: string;
  members: string[];
  color?: string;
  icon?: string;
  description?: string;
}

interface TeamState {
  teams: TeamDefinition[];
  loading: boolean;
  error: string | null;

  loadTeams: () => Promise<void>;
  addTeam: (input: TeamInput) => Promise<TeamDefinition>;
  updateTeam: (id: string, changes: Partial<TeamInput>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  markTeamUsed: (id: string) => Promise<void>;
  importTeams: (teams: TeamDefinition[]) => Promise<void>;
  exportTeams: () => string;
}

const generateId = (): string => {
  const globalCrypto: any = (globalThis as any).crypto;
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const persistTeams = async (teams: TeamDefinition[]) => {
  if (typeof window !== "undefined" && (window as any).electron?.settings) {
    try {
      await window.electron.settings.set("teams", teams);
    } catch (error) {
      console.error("Failed to persist teams:", error);
    }
  }
};

export const useTeamStore = create<TeamState>((set: any, get: any) => {
  // Initialize by loading teams from settings
  (async () => {
    if (typeof window !== "undefined" && (window as any).electron?.settings) {
      try {
        const result = await window.electron.settings.get("teams");
        if (result.success && Array.isArray(result.value)) {
          set({ teams: result.value as TeamDefinition[] });
        }
      } catch (error) {
        console.error("Failed to load teams on init:", error);
      }
    }
  })();

  return {
    teams: [],
    loading: false,
    error: null,

    loadTeams: async () => {
      if (typeof window === "undefined" || !(window as any).electron?.settings) {
        return;
      }
      set({ loading: true, error: null });
      try {
        const result = await window.electron.settings.get("teams");
        if (result.success && Array.isArray(result.value)) {
          set({ teams: result.value as TeamDefinition[], loading: false });
        } else {
          set({ teams: [], loading: false });
        }
      } catch (error) {
        set({ loading: false, error: (error as Error).message });
      }
    },

    addTeam: async (input: TeamInput) => {
      const now = new Date().toISOString();
      const team: TeamDefinition = {
        id: generateId(),
        name: input.name.trim(),
        members: Array.from(new Set(input.members.map((m) => m.trim()).filter(Boolean))),
        color: input.color,
        icon: input.icon,
        description: input.description,
        createdAt: now,
        lastUsedAt: now,
      };
      set((state: TeamState) => ({ teams: [...state.teams, team] }));
      await persistTeams(get().teams);
      return team;
    },

    updateTeam: async (id: string, changes: Partial<TeamInput>) => {
      set((state: TeamState) => ({
        teams: state.teams.map((t: TeamDefinition) =>
          t.id === id
            ? {
                ...t,
                name: changes.name !== undefined ? changes.name : t.name,
                members:
                  changes.members !== undefined
                    ? Array.from(new Set(changes.members.map((m: string) => m.trim()).filter(Boolean)))
                    : t.members,
                color: changes.color !== undefined ? changes.color : t.color,
                icon: changes.icon !== undefined ? changes.icon : t.icon,
                description:
                  changes.description !== undefined ? changes.description : t.description,
              }
            : t,
        ),
      }));
      await persistTeams(get().teams);
    },

    deleteTeam: async (id: string) => {
      set((state: TeamState) => ({ teams: state.teams.filter((t: TeamDefinition) => t.id !== id) }));
      await persistTeams(get().teams);
    },

    markTeamUsed: async (id: string) => {
      const now = new Date().toISOString();
      set((state: TeamState) => ({
        teams: state.teams.map((t: TeamDefinition) => (t.id === id ? { ...t, lastUsedAt: now } : t)),
      }));
      await persistTeams(get().teams);
    },

    importTeams: async (teams: TeamDefinition[]) => {
      // Merge by id if present, else by name
      set((state: TeamState) => {
        const existingById = new Map(state.teams.map((t: TeamDefinition) => [t.id, t] as const));
        const existingByName = new Map(
          state.teams.map((t: TeamDefinition) => [t.name.toLowerCase(), t] as const),
        );
        const merged: TeamDefinition[] = [...state.teams];
        for (const incoming of teams) {
          const normalizedIncoming: TeamDefinition = {
            ...incoming,
            id: incoming.id || generateId(),
            name: incoming.name?.trim() || "Untitled Team",
            members: Array.from(
              new Set((incoming.members || []).map((m: string) => m.trim()).filter(Boolean)),
            ),
            createdAt: incoming.createdAt || new Date().toISOString(),
          };
          const byId = incoming.id ? (existingById.get(incoming.id) as TeamDefinition | undefined) : undefined;
          const byName = existingByName.get(normalizedIncoming.name.toLowerCase()) as TeamDefinition | undefined;
          if (byId) {
            const idx = merged.findIndex((t: TeamDefinition) => t.id === byId.id);
            if (idx >= 0) merged[idx] = { ...byId, ...normalizedIncoming } as TeamDefinition;
          } else if (byName) {
            const idx = merged.findIndex((t: TeamDefinition) => t.id === byName.id);
            if (idx >= 0) merged[idx] = { ...byName, ...normalizedIncoming } as TeamDefinition;
          } else {
            merged.push(normalizedIncoming);
          }
        }
        return { teams: merged };
      });
      await persistTeams(get().teams);
    },

    exportTeams: () => {
      try {
        return JSON.stringify(get().teams, null, 2);
      } catch (error) {
        console.error("Failed to export teams:", error);
        return "[]";
      }
    },
  };
});

