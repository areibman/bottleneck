import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { useUIStore } from "../stores/uiStore";
import { usePRStore } from "../stores/prStore";
import { useSettingsStore } from "../stores/settingsStore";
import { cn } from "../utils/cn";

interface TerminalProps {
  className?: string;
  onResize?: (height: number) => void;
}

export const Terminal = React.memo(function Terminal({
  className,
  onResize,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { theme } = useUIStore();
  const { selectedRepo } = usePRStore();
  const { settings } = useSettingsStore();
  const [isReady, setIsReady] = useState(false);
  const [currentRepoPath, setCurrentRepoPath] = useState<string | null>(null);

  // Memoize terminal theme to prevent unnecessary re-renders
  const terminalTheme = useMemo(() => {
    return theme === "dark"
      ? {
          background: "#1f2937",
          foreground: "#e5e7eb",
          cursor: "#3b82f6",
          black: "#1f2937",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#eab308",
          blue: "#3b82f6",
          magenta: "#a855f7",
          cyan: "#06b6d4",
          white: "#f3f4f6",
          brightBlack: "#4b5563",
          brightRed: "#f87171",
          brightGreen: "#4ade80",
          brightYellow: "#facc15",
          brightBlue: "#60a5fa",
          brightMagenta: "#c084fc",
          brightCyan: "#22d3ee",
          brightWhite: "#ffffff",
        }
      : {
          background: "#ffffff",
          foreground: "#1f2937",
          cursor: "#3b82f6",
          black: "#1f2937",
          red: "#dc2626",
          green: "#16a34a",
          yellow: "#ca8a04",
          blue: "#2563eb",
          magenta: "#9333ea",
          cyan: "#0891b2",
          white: "#f9fafb",
          brightBlack: "#6b7280",
          brightRed: "#ef4444",
          brightGreen: "#22c55e",
          brightYellow: "#eab308",
          brightBlue: "#3b82f6",
          brightMagenta: "#a855f7",
          brightCyan: "#06b6d4",
          brightWhite: "#ffffff",
        };
  }, [theme]);

  // Debounced fit function to prevent excessive fitting
  const debouncedFit = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = setTimeout(() => {
      if (fitAddonRef.current && isReady) {
        try {
          fitAddonRef.current.fit();
          // Inform backend about new size if available
          if (xtermRef.current && window.electron?.terminal) {
            const cols = (xtermRef.current as any).cols as number;
            const rows = (xtermRef.current as any).rows as number;
            window.electron.terminal.resize(cols, rows).catch(() => {});
          }
        } catch (error) {
          console.warn("Terminal fit failed:", error);
        }
      }
    }, 100);
  }, [isReady]);

  // Initialize terminal only once
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    // Create terminal instance
    const terminal = new XTerm({
      theme: terminalTheme,
      fontSize: settings.terminalFontSize,
      fontFamily: `${settings.terminalFontFamily}, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New", monospace`,
      allowTransparency: false,
      cursorBlink: true,
      convertEol: true,
      scrollback: 1000,
      tabStopWidth: 4,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Open terminal
    terminal.open(terminalRef.current);

    // Add CSS padding to the terminal screen after it's opened
    setTimeout(() => {
      const screenElement = terminalRef.current?.querySelector(".xterm-screen");
      if (screenElement) {
        (screenElement as HTMLElement).style.cssText =
          "padding: 10px 10px 10px 10px !important;";
        console.log(
          "[Terminal] Applied 10px padding to all sides of terminal screen",
        );
      }

      // Ensure background matches theme
      const xtermElement = terminalRef.current?.querySelector(".xterm");
      if (xtermElement) {
        (xtermElement as HTMLElement).style.background = "transparent";
      }
    }, 100);

    // Initial fit with delay
    const initTimeout = setTimeout(async () => {
      try {
        fitAddon.fit();
        // Send initial size to backend if available
        if (window.electron?.terminal) {
          const cols = (terminal as any).cols as number;
          const rows = (terminal as any).rows as number;
          window.electron.terminal.resize(cols, rows).catch(() => {});
        }

        // Focus the terminal for input
        terminal.focus();
        setIsReady(true);

        // Notify parent of height
        if (onResize) {
          const height = Math.max(200, terminal.rows * 20 + 40);
          onResize(height);
        }

        // Spawn terminal process if electron is available
        if (window.electron?.terminal) {
          try {
            // Get clone location from settings to use as default directory
            let defaultDir: string | undefined;
            if (window.electron?.settings) {
              const settingsResult =
                await window.electron.settings.get("cloneLocation");
              defaultDir = settingsResult?.value || undefined;
            }

            // Spawn terminal in clone location or default
            const spawnResult =
              await window.electron.terminal.spawn(defaultDir);
            if (!spawnResult.success) {
              console.error("Failed to spawn terminal:", spawnResult.error);
              terminal.write(
                `\x1b[31mTerminal startup failed: ${spawnResult.error}\x1b[0m\r\n`,
              );
            } else {
              console.log(
                "[Terminal] Process spawned successfully in:",
                defaultDir || "default directory",
              );
              // Store the initial directory
              if (defaultDir) {
                setCurrentRepoPath(defaultDir);
              }
            }
          } catch (error) {
            console.error("Terminal spawn error:", error);
            terminal.write(
              `\x1b[31mTerminal startup error: ${(error as Error).message}\x1b[0m\r\n`,
            );
          }
        }
      } catch (error) {
        console.warn("Initial terminal setup failed:", error);
        setIsReady(true);
      }
    }, 100);

    // Handle input
    const dataHandler = (data: string) => {
      if (window.electron?.terminal) {
        // Send keystrokes to PTY - PTY handles echo automatically
        try {
          window.electron.terminal.write(data);
          // Note: Do NOT echo locally when using PTY, as PTY handles echo
        } catch (error) {
          console.error("Failed to write to terminal:", error);
        }
      } else {
        // Dev mode - echo input for local testing
        if (data === "\r") {
          terminal.write("\r\n\x1b[32m$\x1b[0m ");
        } else if (data === "\u007f") {
          // backspace
          terminal.write("\b \b");
        } else {
          terminal.write(data);
        }
      }
    };

    terminal.onData(dataHandler);

    // Handle terminal output from electron
    if (window.electron?.terminal) {
      window.electron.terminal.onData((output: string) => {
        if (xtermRef.current) {
          xtermRef.current.write(output);
        }
      });
    }

    // Cleanup
    return () => {
      clearTimeout(initTimeout);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      // Kill terminal process and cleanup
      if (window.electron?.terminal) {
        window.electron.terminal.kill().catch(console.error);
        window.electron.terminal.offData();
      }

      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      setIsReady(false);
    };
  }, []); // Only run once on mount

  // Handle theme changes separately to avoid recreation
  useEffect(() => {
    if (xtermRef.current && isReady) {
      xtermRef.current.options.theme = terminalTheme;
    }
  }, [terminalTheme, isReady]);

  // Handle terminal font settings changes
  useEffect(() => {
    if (xtermRef.current && isReady) {
      xtermRef.current.options.fontSize = settings.terminalFontSize;
      xtermRef.current.options.fontFamily = `${settings.terminalFontFamily}, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New", monospace`;
      // Trigger re-fit after font changes
      debouncedFit();
    }
  }, [
    settings.terminalFontSize,
    settings.terminalFontFamily,
    isReady,
    debouncedFit,
  ]);

  // Handle window resize with debouncing
  useEffect(() => {
    const handleResize = () => {
      debouncedFit();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [debouncedFit]);

  // Handle repository changes - change terminal directory when repo changes
  useEffect(() => {
    if (!isReady || !window.electron?.terminal) return;

    const changeRepoDirectory = async () => {
      try {
        // Get clone location from settings
        const settingsResult =
          await window.electron.settings?.get("cloneLocation");
        const cloneLocation = settingsResult?.value || "~/repos";

        // Determine the target directory
        let targetPath: string;
        if (selectedRepo) {
          // If a repo is selected, navigate to it
          targetPath = `${cloneLocation}/${selectedRepo.name}`;
        } else {
          // If no repo selected, go to clone location root
          targetPath = cloneLocation;
        }

        // Only change if different from current
        if (targetPath !== currentRepoPath) {
          console.log(`[Terminal] Changing directory to: ${targetPath}`);
          setCurrentRepoPath(targetPath);

          // Send cd command to change directory
          if (xtermRef.current && window.electron?.terminal) {
            // Clear current line and send cd command
            window.electron.terminal.write("\x03"); // Ctrl+C to clear current input
            setTimeout(() => {
              window.electron.terminal.write(`cd "${targetPath}"\r`);
            }, 100);
          }
        }
      } catch (error) {
        console.error("Error changing terminal directory:", error);
      }
    };

    changeRepoDirectory();
  }, [selectedRepo, isReady, currentRepoPath]);

  return (
    <div className={cn("w-full h-full", className)}>
      <div
        ref={terminalRef}
        className="w-full h-full rounded-lg"
        style={{ minHeight: "200px" }}
        onClick={() => {
          if (xtermRef.current) {
            xtermRef.current.focus();
          }
        }}
      />
    </div>
  );
});
