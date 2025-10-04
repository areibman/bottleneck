import { loader } from "@monaco-editor/react";

// Configure Monaco to use local assets instead of CDN
// Note: We don't import monaco-editor directly to avoid bundling all languages
// The DiffEditor component gets Monaco instance via the onMount callback

// Just export the loader - don't import the entire Monaco package
export { loader };

// Initialize Monaco asynchronously
loader.init().then(() => {
  console.log("Monaco editor loaded locally");
  // Optionally configure Monaco here if needed
});

// Re-export a type-only import for type checking
export type { Monaco } from "@monaco-editor/react";
