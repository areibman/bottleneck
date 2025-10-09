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
  stdio: "pipe",
  shell: true,
});

const preloadWatcher = spawn("npm", ["run", "dev:preload"], {
  stdio: "pipe",
  shell: true,
});

// Start Vite dev server
console.log("Starting Vite dev server...");
const vite = spawn("npm", ["run", "dev:renderer"], {
  stdio: "pipe",
  shell: true,
});

let electronStarted = false;

vite.stdout.on("data", (data) => {
  const output = data.toString();
  console.log("[Vite]:", output);

  // Start Electron when Vite is ready
  if (!electronStarted && output.includes("Local:")) {
    electronStarted = true;
    
    // Check if we're in a headless environment
    const isHeadless = !process.env.DISPLAY && process.platform === "linux";
    
    if (isHeadless) {
      console.log("\n🖥️  Headless environment detected!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ Dev server is running successfully at http://localhost:3000");
      console.log("✅ TypeScript watchers are active");
      console.log("⚠️  Electron GUI cannot start without a display server");
      console.log("\nTo run with GUI, you need:");
      console.log("  • A desktop environment with X11/Wayland");
      console.log("  • Or use Xvfb for virtual display: xvfb-run npm run dev");
      console.log("  • Or set DISPLAY environment variable if X11 forwarding is available");
      console.log("\nThe dev server will continue running for API/build testing...");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return;
    }
    
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
      
      electron.on("error", (err) => {
        console.error("Failed to start Electron:", err);
        console.log("\n⚠️  If you're seeing display-related errors, see the headless environment message above.");
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
