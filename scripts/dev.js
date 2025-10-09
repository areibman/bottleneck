const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config();

// First, build main and preload once
console.log("Building main and preload scripts...");
const { execSync } = require("child_process");

try {
  execSync("npm run build:main && npm run build:preload", { stdio: "inherit" });
} catch (error) {
  console.error("Failed to build:", error);
  process.exit(1);
}

// Start TypeScript watchers for main and preload
console.log("Starting TypeScript watchers...");
const mainWatcher = spawn("npm", ["run", "dev:main"], {
  stdio: "inherit",
  shell: true,
});

const preloadWatcher = spawn("npm", ["run", "dev:preload"], {
  stdio: "inherit",
  shell: true,
});

// Start Vite dev server
console.log("Starting Vite dev server...");
const vite = spawn("npm", ["run", "dev:renderer"], {
  stdio: ["ignore", "pipe", "pipe"],
  shell: true,
});

let electronStarted = false;
let resolvedDevUrl = null;

function stripAnsi(input) {
  // Remove common ANSI escape sequences for colors/styles
  return input.replace(/\u001b\[[0-9;]*m/g, "");
}

function extractDevServerUrl(output) {
  const text = stripAnsi(output);
  // Prefer the "Local:" URL vite prints
  const localLineMatch = text.match(/Local:\s*(https?:\/\/[^\s]+)/i);
  if (localLineMatch && localLineMatch[1]) {
    return localLineMatch[1].replace(/\/$/, "");
  }
  // Fallback: any localhost/127.0.0.1 URL
  const urlMatch = text.match(/https?:\/\/(localhost|127\.0\.0\.1):\d+/i);
  if (urlMatch) {
    return urlMatch[0];
  }
  return null;
}

vite.stdout.on("data", (data) => {
  const output = data.toString();
  process.stdout.write(`[Vite]: ${output}`);

  // Start Electron when Vite is ready
  if (!electronStarted) {
    const candidateUrl = extractDevServerUrl(output);
    if (candidateUrl) {
      resolvedDevUrl = candidateUrl;
      electronStarted = true;
      console.log(`Detected Vite dev server at ${resolvedDevUrl}`);
      console.log("Starting Electron...");

      // Set environment variable for development
      process.env.NODE_ENV = "development";

      // Wait a bit for the server to be fully ready
      setTimeout(() => {
        const electron = spawn("npx", ["electron", "."], {
          stdio: "inherit",
          shell: true,
          env: {
            ...process.env,
            NODE_ENV: "development",
            VITE_DEV_SERVER_URL: resolvedDevUrl,
            GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
            GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
          },
        });

        electron.on("close", () => {
          console.log("Electron closed, shutting down...");
          vite.kill();
          mainWatcher.kill();
          preloadWatcher.kill();
          process.exit();
        });
      }, 500);
    }
  }
});

vite.stderr.on("data", (data) => {
  process.stderr.write(`[Vite Error]: ${data.toString()}`);
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("Shutting down...");
  vite.kill();
  mainWatcher.kill();
  preloadWatcher.kill();
  process.exit();
});
