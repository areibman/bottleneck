import React from "react";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";

export default function KeyboardShortcutsModal() {
  const { theme, keyboardShortcutsOpen, toggleKeyboardShortcuts } = useUIStore();

  if (!keyboardShortcutsOpen) return null;

  const rows = [
    { keys: "Cmd/Ctrl+Shift+P", action: "Open Command Palette" },
    { keys: "Cmd/Ctrl+B", action: "Toggle Sidebar" },
    { keys: "Cmd/Ctrl+Shift+B", action: "Toggle Right Panel" },
    { keys: "Cmd/Ctrl+/", action: "Show Keyboard Shortcuts" },
    { keys: "Cmd/Ctrl+Shift+S", action: "Sync All" },
    { keys: "D", action: "Toggle Diff View (in Diff)" },
    { keys: "W", action: "Toggle Whitespace (in Diff)" },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={toggleKeyboardShortcuts} />
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 top-28 w-[600px] max-w-[90vw] rounded-lg shadow-xl border",
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
        )}
      >
        <div className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: theme === "dark" ? "#374151" : "#E5E7EB" }}
        >
          <div className={cn("text-sm font-medium", theme === "dark" ? "text-white" : "text-gray-900")}
          >Keyboard Shortcuts</div>
          <button
            onClick={toggleKeyboardShortcuts}
            className={cn("text-xs px-2 py-1 rounded",
              theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200",
            )}
          >Close</button>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.keys} className="flex items-center justify-between text-sm">
                <div className={cn(theme === "dark" ? "text-gray-300" : "text-gray-800")}>{r.action}</div>
                <div className={cn("font-mono text-xs px-2 py-1 rounded border",
                  theme === "dark" ? "border-gray-700 text-gray-300" : "border-gray-300 text-gray-700",
                )}>{r.keys}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

