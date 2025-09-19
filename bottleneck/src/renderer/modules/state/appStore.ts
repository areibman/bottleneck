import create from 'zustand';

type PR = { id: string; number: number; title: string; author: string; state: 'open' | 'draft' | 'merged' | 'closed'; branch: string; labels: string[]; updatedAt: string };

type AppState = {
  prs: PR[];
  selectedPr: PR | null;
  setPRs: (prs: PR[]) => void;
  selectPr: (pr: PR | null) => void;
  filter: string;
  setFilter: (f: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  prs: [
    { id: '1', number: 101, title: 'agent/feat-refactor-core parsing speed', author: 'alice', state: 'open', branch: 'agent/feat-refactor-core', labels: ['perf'], updatedAt: new Date().toISOString() },
    { id: '2', number: 102, title: 'agent/feat-refactor-editor selection', author: 'bob', state: 'open', branch: 'agent/feat-refactor-editor', labels: ['perf'], updatedAt: new Date().toISOString() },
    { id: '3', number: 103, title: 'chore/lint-apply rules', author: 'bot', state: 'draft', branch: 'chore/lint-apply', labels: ['chore'], updatedAt: new Date().toISOString() },
  ],
  selectedPr: null,
  setPRs: (prs) => set({ prs }),
  selectPr: (pr) => set({ selectedPr: pr }),
  filter: '',
  setFilter: (filter) => set({ filter }),
}));

export type { PR };

