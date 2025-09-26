import { useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";

const CHATGPT_CODEX_URL = "https://chatgpt.com/codex";

export default function ChatGPTView() {
    const { theme } = useUIStore();

    const handleOpen = useCallback(() => {
        if (window?.electron?.openExternal) {
            void window.electron.openExternal(CHATGPT_CODEX_URL);
        } else {
            window.open(CHATGPT_CODEX_URL, "_blank", "noopener,noreferrer");
        }
    }, []);

    return (
        <div
            className={cn(
                "flex h-full flex-col items-center justify-center px-8 text-center",
                theme === "dark" ? "bg-gray-900" : "bg-white",
            )}
        >
            <div className="max-w-md space-y-4">
                <h1
                    className={cn(
                        "text-3xl font-semibold",
                        theme === "dark" ? "text-gray-100" : "text-gray-900",
                    )}
                >
                    ChatGPT Codex
                </h1>
                <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-600")}
                >
                    Unfortunately, Codex does not have an API yet. Open Codex directly in your browser.
                </p>
                <div className="flex flex-col items-center gap-2">
                    <button
                        type="button"
                        onClick={handleOpen}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Open chatgpt.com/codex
                    </button>
                    <a
                        href={CHATGPT_CODEX_URL}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                            "text-xs underline",
                            theme === "dark"
                                ? "text-gray-400 hover:text-gray-200"
                                : "text-gray-600 hover:text-gray-800",
                        )}
                    >
                        Open link in a new tab
                    </a>
                </div>
            </div>
        </div>
    );
}
