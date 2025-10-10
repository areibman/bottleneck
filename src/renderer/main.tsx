import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./styles/global.css";
// Monaco CSS is handled by @monaco-editor/react lazy loading
import { PerfLogger } from "./utils/perfLogger";

PerfLogger.mark("main.tsx execution started");

// Global error handlers for renderer process
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  // Prevent the error from crashing the renderer
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the error from crashing the renderer
  event.preventDefault();
});

const beforeQueryClient = performance.now();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});
PerfLogger.mark("QueryClient created");

const beforeGlobalCSS = performance.now();
console.log(`⏱️ [RENDER] Global CSS loaded in ${(performance.now() - beforeGlobalCSS).toFixed(2)}ms`);

PerfLogger.mark("Starting React render");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

PerfLogger.mark("ReactDOM.render called");
