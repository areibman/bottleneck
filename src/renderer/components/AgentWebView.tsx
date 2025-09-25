import { useEffect, useRef } from "react";
import { cn } from "../utils/cn";
import { useUIStore } from "../stores/uiStore";

interface AgentWebViewProps {
    url: string;
    className?: string;
    title?: string;
}

export function AgentWebView({ url, className, title }: AgentWebViewProps) {
    const { theme } = useUIStore();
    const webviewRef = useRef<HTMLWebViewElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const webview = webviewRef.current;
        if (!webview) return;

        // Set up webview attributes
        webview.setAttribute("src", url);
        webview.setAttribute("partition", "persist:agent");
        webview.setAttribute("webpreferences", "contextIsolation=true, nodeIntegration=false");

        // Allow the webview to open links in new windows
        webview.addEventListener("new-window", (e: any) => {
            e.preventDefault();
            if (window.electron) {
                window.electron.openExternal(e.url);
            }
        });

        // Handle loading events
        const handleLoadStart = () => {
            console.log(`Loading ${title || url}...`);
        };

        const handleLoadStop = () => {
            console.log(`Finished loading ${title || url}`);

            // Inject CSS to improve appearance if needed
            if (theme === "dark") {
                // Optional: inject dark mode CSS if the site doesn't have it
                webview.insertCSS(`
          ::-webkit-scrollbar {
            width: 12px;
            height: 12px;
          }
          ::-webkit-scrollbar-track {
            background: #1f2937;
          }
          ::-webkit-scrollbar-thumb {
            background: #4b5563;
            border-radius: 6px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
          }
        `);
            }
        };

        const handleLoadError = (event: any) => {
            console.error(`Failed to load ${title || url}:`, event.errorDescription);
        };

        webview.addEventListener("did-start-loading", handleLoadStart);
        webview.addEventListener("did-stop-loading", handleLoadStop);
        webview.addEventListener("did-fail-load", handleLoadError);

        return () => {
            webview.removeEventListener("did-start-loading", handleLoadStart);
            webview.removeEventListener("did-stop-loading", handleLoadStop);
            webview.removeEventListener("did-fail-load", handleLoadError);
        };
    }, [url, title, theme]);

    return (
        <div
            ref={containerRef}
            className={cn(
                "flex flex-col h-full overflow-hidden",
                theme === "dark" ? "bg-gray-900" : "bg-white",
                className
            )}
        >
            <div
                className={cn(
                    "flex items-center px-4 py-2 border-b",
                    theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-gray-200"
                        : "bg-gray-50 border-gray-200 text-gray-700"
                )}
            >
                <span className="text-sm font-medium">{title || url}</span>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => {
                            const webview = webviewRef.current;
                            if (webview) {
                                webview.goBack();
                            }
                        }}
                        className={cn(
                            "p-1 rounded hover:bg-gray-700/50",
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                        )}
                        title="Go back"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => {
                            const webview = webviewRef.current;
                            if (webview) {
                                webview.goForward();
                            }
                        }}
                        className={cn(
                            "p-1 rounded hover:bg-gray-700/50",
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                        )}
                        title="Go forward"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => {
                            const webview = webviewRef.current;
                            if (webview) {
                                webview.reload();
                            }
                        }}
                        className={cn(
                            "p-1 rounded hover:bg-gray-700/50",
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                        )}
                        title="Reload"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <button
                        onClick={() => {
                            if (window.electron) {
                                window.electron.openExternal(url);
                            }
                        }}
                        className={cn(
                            "p-1 rounded hover:bg-gray-700/50",
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                        )}
                        title="Open in browser"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </button>
                </div>
            </div>
            <webview
                ref={webviewRef as any}
                className="flex-1 w-full"
                style={{ display: "flex", flex: 1 }}
            />
        </div>
    );
}
