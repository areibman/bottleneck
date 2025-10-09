import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    // Monaco is now loaded via @monaco-editor/react lazy loading
    // No need for vite-plugin-monaco-editor
  ],
  base: "./",
  root: path.resolve(__dirname, "src/renderer"),
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
      "@main": path.resolve(__dirname, "src/main"),
      "@shared": path.resolve(__dirname, "src/shared"),
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
    exclude: ["monaco-editor", "@monaco-editor/react"], // Monaco is lazy-loaded, don't pre-bundle it
  },
});
