import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Configure Monaco to use local assets instead of CDN
// Note: Workers are handled automatically by vite-plugin-monaco-editor
loader.config({ monaco });

// Initialize Monaco
loader.init().then((monacoInstance) => {
  console.log("Monaco editor loaded locally");
});

export { loader, monaco };
