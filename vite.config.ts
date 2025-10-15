import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import monacoEditorPlugin from "vite-plugin-monaco-editor";

export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin({
      languageWorkers: ["editorWorkerService", "typescript", "json"],
      customWorkers: [],
    }),
  ],
  base: "./",
  root: path.resolve(__dirname, "src/renderer"),
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild",
    target: "esnext",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Put all node_modules into a single vendor chunk to avoid dependency issues
          if (id.includes('node_modules')) {
            // Monaco should be separate as it's large and rarely changes
            if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
              return 'monaco';
            }
            // Everything else goes into vendor (including React)
            return 'vendor';
          }
        },
        compact: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
      "@main": path.resolve(__dirname, "src/main"),
    },
  },
  server: {
    port: 3000,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "zustand",
      "@tanstack/react-query",
      "lucide-react",
      "clsx",
      "react-markdown",
      "rehype-raw",
      "react-complex-tree",
      "date-fns",
    ],
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    treeShaking: true,
  },
});
