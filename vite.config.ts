import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    // Monaco is loaded from CDN in production
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
      "framer-motion",
      "lucide-react",
      "clsx",
      "react-markdown",
      "remark-gfm",
      "rehype-raw",
      "react-complex-tree",
      "date-fns",
    ],
    // Monaco is now bundled via vite-plugin-monaco-editor
  },
});
