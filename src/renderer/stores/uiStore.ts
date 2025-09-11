import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  commandPaletteOpen: boolean;
  keyboardShortcutsOpen: boolean;
  selectedPRs: Set<string>;
  activeView: 'list' | 'detail';
  diffView: 'unified' | 'split';
  showWhitespace: boolean;
  
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  toggleCommandPalette: () => void;
  toggleKeyboardShortcuts: () => void;
  toggleDiffView: () => void;
  toggleWhitespace: () => void;
  selectPR: (prId: string) => void;
  deselectPR: (prId: string) => void;
  clearSelection: () => void;
  setActiveView: (view: 'list' | 'detail') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  rightPanelOpen: false,
  commandPaletteOpen: false,
  keyboardShortcutsOpen: false,
  selectedPRs: new Set(),
  activeView: 'list',
  diffView: 'unified',
  showWhitespace: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  toggleKeyboardShortcuts: () => set((state) => ({ keyboardShortcutsOpen: !state.keyboardShortcutsOpen })),
  toggleDiffView: () => set((state) => ({ 
    diffView: state.diffView === 'unified' ? 'split' : 'unified' 
  })),
  toggleWhitespace: () => set((state) => ({ showWhitespace: !state.showWhitespace })),
  
  selectPR: (prId) => set((state) => {
    const newSet = new Set(state.selectedPRs);
    newSet.add(prId);
    return { selectedPRs: newSet };
  }),
  
  deselectPR: (prId) => set((state) => {
    const newSet = new Set(state.selectedPRs);
    newSet.delete(prId);
    return { selectedPRs: newSet };
  }),
  
  clearSelection: () => set({ selectedPRs: new Set() }),
  setActiveView: (view) => set({ activeView: view }),
}));
