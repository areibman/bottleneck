import { useState, useEffect } from "react";
import { Download, RefreshCw } from "lucide-react";
import { cn } from "../../utils/cn";
import packageJson from "../../../../package.json";

interface SidebarFooterProps {
  theme: "light" | "dark";
}

export function SidebarFooter({ theme }: SidebarFooterProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<string>("");
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Listen for update events
    window.electron.updater.onUpdateAvailable((info) => {
      setUpdateAvailable(true);
      setUpdateVersion(info.version);
      setIsDownloaded(false);
    });

    window.electron.updater.onUpdateDownloaded((info) => {
      setUpdateAvailable(true);
      setUpdateVersion(info.version);
      setIsDownloaded(true);
    });

    window.electron.updater.onUpdateNotAvailable(() => {
      setUpdateAvailable(false);
      setIsDownloaded(false);
    });

    window.electron.updater.onError(() => {
      setUpdateAvailable(false);
      setIsDownloaded(false);
    });

    return () => {
      window.electron.updater.removeAllListeners();
    };
  }, []);

  const handleUpdateClick = async () => {
    if (isDownloaded) {
      setIsInstalling(true);
      try {
        await window.electron.updater.installUpdate();
      } catch (error) {
        console.error("Failed to install update:", error);
        setIsInstalling(false);
      }
    }
  };

  return (
    <div
      className={cn(
        "p-4 border-t mt-auto flex flex-col",
        theme === "dark" ? "border-gray-700" : "border-gray-200",
      )}
    >
      <div className="text-left">
        <div className={cn(
          "font-semibold text-lg",
          theme === "dark" ? "text-gray-200" : "text-gray-800"
        )}>
          Bottleneck ⧖
        </div>
        <div className={cn(
          "text-xs mt-1",
          theme === "dark" ? "text-gray-400" : "text-gray-500"
        )}>
          v{packageJson.version}
        </div>

        {/* Update Notification */}
        {updateAvailable && (
          <div className="mt-3 space-y-2">
            <div className={cn(
              "text-xs flex items-center gap-1",
              theme === "dark" ? "text-blue-400" : "text-blue-600"
            )}>
              {isDownloaded ? (
                <>
                  <Download className="w-3 h-3" />
                  <span>Update {updateVersion} ready</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3 animate-pulse" />
                  <span>Downloading {updateVersion}...</span>
                </>
              )}
            </div>

            {isDownloaded && (
              <button
                onClick={handleUpdateClick}
                disabled={isInstalling}
                className={cn(
                  "w-full text-xs py-1.5 px-2 rounded transition-colors flex items-center justify-center gap-1",
                  theme === "dark"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white",
                  isInstalling && "opacity-50 cursor-not-allowed"
                )}
              >
                <RefreshCw className={cn("w-3 h-3", isInstalling && "animate-spin")} />
                {isInstalling ? "Restarting..." : "Click to Update"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
