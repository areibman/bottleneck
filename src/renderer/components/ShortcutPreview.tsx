import React, { useState, useEffect } from "react";
import {
  Command,
  GitPullRequest,
  GitBranch,
  FileText,
  Settings,
  Sun,
  Moon,
  RefreshCw,
  Home,
  ToggleLeft,
  ToggleRight,
  Plus,
  ExternalLink,
  Copy,
  Keyboard,
} from "lucide-react";
import { useUIStore } from "../stores/uiStore";
import { usePRStore } from "../stores/prStore";
import { cn } from "../utils/cn";

interface ShortcutItem {
  key: string;
  description: string;
  icon: React.ComponentType<any>;
  category: string;
}

export default function ShortcutPreview() {
  const { theme } = useUIStore();
  const { selectedRepo } = usePRStore();
  const [showPreview, setShowPreview] = useState(false);
  const [modifierKey, setModifierKey] = useState<'cmd' | 'ctrl' | null>(null);

  const shortcuts: ShortcutItem[] = [
    // Command Palette and Navigation
    { key: "⌘⇧P", description: "Open Command Palette", icon: Command, category: "General" },
    { key: "⌘1", description: "Go to Pull Requests", icon: GitPullRequest, category: "Navigation" },
    { key: "⌘2", description: "Go to Branches", icon: GitBranch, category: "Navigation" },
    { key: "⌘3", description: "Go to Issues", icon: FileText, category: "Navigation" },
    { key: "⌘H", description: "Go Home", icon: Home, category: "Navigation" },
    { key: "⌘,", description: "Open Settings", icon: Settings, category: "Navigation" },
    
    // View Controls
    { key: "⌘B", description: "Toggle Sidebar", icon: ToggleLeft, category: "View" },
    { key: "⌘⇧B", description: "Toggle Right Panel", icon: ToggleRight, category: "View" },
    { key: "⌘⇧T", description: "Toggle Theme", icon: theme === "dark" ? Sun : Moon, category: "View" },
    
    // Actions
    { key: "⌘R", description: "Sync All Repositories", icon: RefreshCw, category: "Actions" },
    { key: "⌘N", description: "New Pull Request", icon: Plus, category: "Actions" },
    { key: "⌘⇧C", description: "Clone Repository", icon: Copy, category: "Actions" },
    
    // Quick Access
    { key: "⌘⇧O", description: "Open in GitHub", icon: ExternalLink, category: "Quick Access" },
    { key: "⌘⇧U", description: "Copy Repository URL", icon: Copy, category: "Quick Access" },
    
    // Help
    { key: "⌘/", description: "Show Keyboard Shortcuts", icon: Keyboard, category: "Help" },
  ];

  // Filter shortcuts that are relevant to current context
  const relevantShortcuts = shortcuts.filter(shortcut => {
    // Always show general shortcuts
    if (shortcut.category === "General" || shortcut.category === "View" || shortcut.category === "Help") {
      return true;
    }
    
    // Show repository-specific shortcuts only if a repo is selected
    if (shortcut.category === "Actions" || shortcut.category === "Quick Access") {
      return selectedRepo !== null;
    }
    
    return true;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isModifierPressed = isMac ? e.metaKey : e.ctrlKey;
      
      if (isModifierPressed && !e.shiftKey && !e.altKey) {
        setModifierKey(isMac ? 'cmd' : 'ctrl');
        setShowPreview(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isModifierReleased = isMac ? !e.metaKey : !e.ctrlKey;
      
      if (isModifierReleased) {
        setShowPreview(false);
        setModifierKey(null);
      }
    };

    // Also hide on window blur
    const handleBlur = () => {
      setShowPreview(false);
      setModifierKey(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  if (!showPreview) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Shortcuts Panel */}
      <div className="absolute top-16 right-4 w-80 max-h-[calc(100vh-5rem)] overflow-y-auto">
        <div
          className={cn(
            "rounded-lg shadow-2xl border backdrop-blur-sm",
            theme === "dark"
              ? "bg-gray-800/95 border-gray-700"
              : "bg-white/95 border-gray-200"
          )}
        >
          {/* Header */}
          <div className={cn(
            "px-4 py-3 border-b",
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          )}>
            <div className="flex items-center space-x-2">
              <Keyboard className="w-4 h-4" />
              <span className="font-medium text-sm">
                Keyboard Shortcuts
              </span>
              <div className={cn(
                "text-xs px-2 py-1 rounded ml-auto",
                theme === "dark" ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-600"
              )}>
                Hold {modifierKey === 'cmd' ? '⌘' : 'Ctrl'}
              </div>
            </div>
          </div>

          {/* Shortcuts List */}
          <div className="max-h-96 overflow-y-auto">
            {Object.entries(
              relevantShortcuts.reduce((acc, shortcut) => {
                if (!acc[shortcut.category]) acc[shortcut.category] = [];
                acc[shortcut.category].push(shortcut);
                return acc;
              }, {} as Record<string, ShortcutItem[]>)
            ).map(([category, categoryShortcuts]) => (
              <div key={category}>
                {/* Category Header */}
                <div className={cn(
                  "px-4 py-2 text-xs font-medium uppercase tracking-wider",
                  theme === "dark" ? "text-gray-400 bg-gray-750" : "text-gray-600 bg-gray-50"
                )}>
                  {category}
                </div>
                
                {/* Category Shortcuts */}
                {categoryShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className={cn(
                      "flex items-center px-4 py-2",
                      theme === "dark" ? "text-gray-100" : "text-gray-900"
                    )}
                  >
                    <shortcut.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                    <span className="text-sm flex-1">{shortcut.description}</span>
                    <div className={cn(
                      "text-xs px-2 py-1 rounded ml-3 font-mono",
                      theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
                    )}>
                      {shortcut.key.replace("⌘", modifierKey === 'cmd' ? '⌘' : 'Ctrl+')}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className={cn(
            "px-4 py-3 text-xs border-t",
            theme === "dark" 
              ? "text-gray-400 border-gray-700" 
              : "text-gray-600 border-gray-200"
          )}>
            Release {modifierKey === 'cmd' ? '⌘' : 'Ctrl'} to hide • Press {modifierKey === 'cmd' ? '⌘⇧P' : 'Ctrl+Shift+P'} for command palette
          </div>
        </div>
      </div>
    </div>
  );
}