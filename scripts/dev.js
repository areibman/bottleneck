const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config();

// First, build main and preload once
console.log("Building main and preload scripts...");
const { execSync } = require("child_process");

try {
  execSync("npm run build:main && npm run build:preload", { stdio: "inherit" });
  console.log("✅ Main and preload scripts built successfully");
} catch (error) {
  console.error("❌ Failed to build main and preload scripts:", error.message);
  process.exit(1);
}

// Start TypeScript watchers for main and preload
console.log("Starting TypeScript watchers...");
const mainWatcher = spawn("npm", ["run", "dev:main"], {
  stdio: "pipe",
  shell: true,
});

const preloadWatcher = spawn("npm", ["run", "dev:preload"], {
  stdio: "pipe",
  shell: true,
});

// Handle watcher errors
mainWatcher.on("error", (error) => {
  console.error("❌ Main watcher error:", error);
});

preloadWatcher.on("error", (error) => {
  console.error("❌ Preload watcher error:", error);
});

// Start Vite dev server
console.log("Starting Vite dev server...");
const vite = spawn("npm", ["run", "dev:renderer"], {
  stdio: "pipe",
  shell: true,
});

// Handle Vite errors
vite.on("error", (error) => {
  console.error("❌ Vite error:", error);
});

let electronStarted = false;

vite.stdout.on("data", (data) => {
  const output = data.toString();
  console.log("[Vite]:", output);

  // Start Electron when Vite is ready
  if (!electronStarted && output.includes("Local:")) {
    electronStarted = true;
    console.log("✅ Vite dev server ready, starting Electron...");

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
          GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
          GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
        },
      });

      electron.on("close", (code) => {
        console.log(`Electron closed with code ${code}, shutting down...`);
        vite.kill();
        mainWatcher.kill();
        preloadWatcher.kill();
        process.exit();
      });

      electron.on("error", (error) => {
        console.error("❌ Electron error:", error);
        
        // Check if it's a display-related error (common in headless environments)
        if (error.message && error.message.includes("X server") || error.message.includes("DISPLAY")) {
          console.log("\n💡 Note: This appears to be a headless environment without a display server.");
          console.log("   The Vite dev server is still running at http://localhost:3000");
          console.log("   You can access the app in a browser or set up X11 forwarding for Electron.");
        }
        // Don't exit immediately, let the user see the error
      });
    }, 500); // Reduced from 2000ms to 500ms
  }
});

vite.stderr.on("data", (data) => {
  console.error("[Vite Error]:", data.toString());
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("Shutting down...");
  vite.kill();
  mainWatcher.kill();
  preloadWatcher.kill();
  process.exit();
});
