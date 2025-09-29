/* @jsxRuntime classic */
import React from "react";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const modKey = isMac ? "⌘" : "Ctrl";

interface RowProps {
  label: string;
  combo: string;
}

function Row({ label, combo }: RowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="text-sm">{label}</div>
      <kbd className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700">{combo}</kbd>
    </div>
  );
}

export default function KeyboardShortcutsModal() {
  const { keyboardShortcutsOpen, toggleKeyboardShortcuts, theme } = useUIStore();

  if (!keyboardShortcutsOpen) return null;

  return (
    <div className="fixed inset-0 z-[110]">
      <div className="absolute inset-0 bg-black/40" onClick={toggleKeyboardShortcuts} />
      <div className="absolute left-1/2 top-24 -translate-x-1/2 w-[680px] max-w-[92vw]">
        <div className={cn("rounded-lg overflow-hidden border shadow-2xl", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}>
          <div className={cn("px-4 py-3 border-b", theme === "dark" ? "border-gray-700" : "border-gray-200")}>
            <div className="text-sm font-semibold">Keyboard Shortcuts</div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide mb-2 opacity-70">General</div>
              <Row label="Open Command Palette" combo={`${modKey} ⇧ P`} />
              <Row label="Show Shortcuts" combo={`${modKey} /`} />
              <Row label="Toggle Theme" combo={`${modKey} T`} />
              <Row label="Sync All" combo="Open Palette → Sync all" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide mb-2 opacity-70">Navigation</div>
              <Row label="Go to Pull Requests" combo={`${modKey} 1`} />
              <Row label="Go to Issues" combo={`${modKey} 2`} />
              <Row label="Go to Branches" combo={`${modKey} 3`} />
              <Row label="Open Settings" combo={`${modKey} ,`} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide mb-2 mt-2 opacity-70">Diff</div>
              <Row label="Toggle Diff View" combo={`${modKey} ⇧ D`} />
              <Row label="Toggle Whitespace" combo={`${modKey} ⇧ W`} />
              <Row label="Toggle Word Wrap" combo={`${modKey} ⇧ M`} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide mb-2 mt-2 opacity-70">Command Palette Tips</div>
              <Row label="Hold for preview" combo={`${modKey} (hold)`} />
              <Row label="Repository switcher" combo=">repo <filter> (in palette)" />
              <Row label="Jump to PR" combo="Type PR number (in palette)" />
            </div>
          </div>
          <div className={cn("px-4 py-3 text-xs text-right", theme === "dark" ? "border-t border-gray-700 text-gray-400" : "border-t border-gray-200 text-gray-600")}>
            Press Esc to close
          </div>
        </div>
      </div>
    </div>
  );
}

