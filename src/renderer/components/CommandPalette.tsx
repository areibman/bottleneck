import React from "react";
import { useUIStore } from "../stores/uiStore";
import { getCommandItems, CommandItem } from "../utils/commandRegistry";
import { cn } from "../utils/cn";

export default function CommandPalette() {
  const { theme, commandPaletteOpen, toggleCommandPalette } = useUIStore();
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [showPreview, setShowPreview] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (commandPaletteOpen) {
      const cmds = getCommandItems();
      setItems(cmds);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [commandPaletteOpen]);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;
      // Hold Cmd/Ctrl to show preview
      const isMeta = e.metaKey || e.ctrlKey;
      setShowPreview(isMeta);

      if (e.key === "Escape") {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const sel = filtered[selectedIndex];
        if (sel) {
          Promise.resolve(sel.run()).finally(() => toggleCommandPalette());
        }
        return;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;
      if (!(e.metaKey || e.ctrlKey)) setShowPreview(false);
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [commandPaletteOpen]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [
        item.title,
        item.description || "",
        ...(item.keywords || []),
        item.shortcut || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={toggleCommandPalette} />
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 top-24 w-[720px] max-w-[90vw] rounded-lg shadow-xl border",
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
        )}
      >
        <div className={cn("p-3 border-b", theme === "dark" ? "border-gray-700" : "border-gray-200")}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command…"
            className={cn(
              "w-full bg-transparent outline-none text-sm",
              theme === "dark" ? "text-white placeholder-gray-400" : "text-gray-900 placeholder-gray-500",
            )}
          />
        </div>

        <div className="flex">
          <div className="w-1/2 max-h-[400px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className={cn("p-4 text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}
              >No results</div>
            ) : (
              filtered.map((item, idx) => (
                <button
                  key={item.id}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    Promise.resolve(item.run()).finally(() => toggleCommandPalette());
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm transition-colors",
                    idx === selectedIndex
                      ? theme === "dark" ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"
                      : theme === "dark" ? "hover:bg-gray-700 text-gray-200" : "hover:bg-gray-100 text-gray-800",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{item.title}</div>
                      {item.description && (
                        <div className={cn("text-xs mt-0.5", theme === "dark" ? "text-gray-400" : "text-gray-600")}
                        >{item.description}</div>
                      )}
                    </div>
                    {item.shortcut && (
                      <div className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-600")}
                      >{item.shortcut}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className={cn(
            "w-1/2 border-l min-h-[240px] max-h-[400px] overflow-y-auto",
            theme === "dark" ? "border-gray-700" : "border-gray-200",
          )}
          >
            {filtered[selectedIndex] ? (
              <div className="p-4">
                <div className="text-sm font-medium mb-2">{filtered[selectedIndex].title}</div>
                <div className={cn("text-xs mb-3", theme === "dark" ? "text-gray-400" : "text-gray-600")}
                >{filtered[selectedIndex].description}</div>
                {showPreview && filtered[selectedIndex].preview ? (
                  <div>{filtered[selectedIndex].preview!()}</div>
                ) : (
                  <div className={cn("text-xs", theme === "dark" ? "text-gray-500" : "text-gray-500")}
                  >Hold Cmd/Ctrl to preview</div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

