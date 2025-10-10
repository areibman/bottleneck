import { app, BrowserWindow, ipcMain, shell, Menu, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import path from "path";
import { config } from "dotenv";
config();

import { GitHubAuth } from "./auth";
import { GitOperations } from "./git";
import { createMenu } from "./menu";
import Store from "electron-store";

// Performance logging
const APP_START = Date.now();
function perfLog(label: string, startTime?: number) {
  const now = Date.now();
  const elapsed = now - APP_START;
  const delta = startTime ? now - startTime : 0;
  console.log(
    `⏱️ [MAIN PERF] ${label.padEnd(35)} | ${delta ? `+${delta}ms | ` : ""}Total: ${elapsed}ms`
  );
  return now;
}

perfLog("Main process started");

const isDev = !app.isPackaged;
perfLog("Environment loaded (isDev=" + isDev + ")");

const store = new Store();
perfLog("Electron store initialized");

let mainWindow: BrowserWindow | null = null;
let githubAuth: GitHubAuth;
let gitOps: GitOperations;
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
let periodicUpdateInterval: ReturnType<typeof setInterval> | null = null;
let isUpdateCheckInProgress = false;

function createWindow() {
  const start = perfLog("createWindow called");

  const preloadPath = path.resolve(path.join(__dirname, "../preload/index.js"));
  console.log("Preload path:", preloadPath);
  console.log("Preload exists:", require("fs").existsSync(preloadPath));
  console.log("__dirname:", __dirname);

  const beforeWindow = Date.now();
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 400,
    minHeight: 300,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true, // Enable web security
    },
    backgroundColor: "#1e1e1e",
    show: false,
  });

  perfLog("BrowserWindow created", beforeWindow);

  // Disable Content Security Policy in development mode to allow API calls
  if (!isDev) {
    // Only apply CSP in production
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              "default-src 'self' https://api.github.com https://cdn.jsdelivr.net; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
              "img-src 'self' data: https://avatars.githubusercontent.com https://github.com https://*.githubusercontent.com; " +
              "font-src 'self' data: https://cdn.jsdelivr.net; " +
              "connect-src 'self' https://api.github.com https://github.com https://cdn.jsdelivr.net http://localhost:* ws://localhost:*; " +
              "worker-src 'self' blob: https://cdn.jsdelivr.net;",
            ],
          },
        });
      },
    );
  } else {
    // Remove CSP entirely in development
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        const responseHeaders = { ...details.responseHeaders };
        delete responseHeaders["Content-Security-Policy"];
        delete responseHeaders["content-security-policy"];
        callback({ responseHeaders });
      },
    );
  }

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    perfLog("Window ready-to-show event fired");
    mainWindow?.show();
    perfLog("Window shown");
  });

  // Debug: Log when page loads
  mainWindow.webContents.on("did-start-loading", () => {
    perfLog("Renderer started loading");
  });

  mainWindow.webContents.on("did-finish-load", () => {
    perfLog("Renderer finished loading");
    mainWindow?.webContents.executeJavaScript(
      'console.log("window.electron:", window.electron)',
    );
  });

  mainWindow.webContents.on("dom-ready", () => {
    perfLog("DOM ready");
  });

  // Load the app
  const beforeLoad = Date.now();
  if (isDev) {
    perfLog("Loading dev server URL");
    mainWindow.loadURL("http://localhost:3000");
    perfLog("Dev URL loaded", beforeLoad);
    mainWindow.webContents.openDevTools();

    // Enable additional DevTools features
    mainWindow.webContents.on("devtools-opened", () => {
      console.log("DevTools opened - Performance profiler should be available");
      // The Performance tab should be available in the DevTools
      // You can access it via the "Performance" tab in DevTools
    });
  } else {
    perfLog("Loading production HTML");
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
    perfLog("Production HTML loaded", beforeLoad);
  }

  perfLog("createWindow completed", start);

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Set up application menu
  const menu = createMenu(mainWindow);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
  const readyTime = perfLog("App ready event fired");

  try {
    // Initialize GitHub auth
    const authStart = Date.now();
    githubAuth = new GitHubAuth(store);
    perfLog("GitHub auth initialized", authStart);

    // Initialize Git operations
    const gitStart = Date.now();
    gitOps = new GitOperations();
    perfLog("Git operations initialized", gitStart);

    // Set default settings if they don't exist
    const settingsStart = Date.now();
    if (!store.has("cloneLocation")) {
      store.set("cloneLocation", "~/repos");
      console.log("[Settings] Set default clone location to ~/repos");
    }
    perfLog("Settings checked", settingsStart);

    createWindow();
    perfLog("Main process initialization complete", readyTime);

    // Set up auto-updater (only in production)
    if (!isDev) {
      autoUpdater.logger = console;
      autoUpdater.autoDownload = true; // Auto-download updates in background
      autoUpdater.autoInstallOnAppQuit = true; // Install on next quit

      const runUpdateCheck = (reason: "startup" | "scheduled") => {
        if (isUpdateCheckInProgress) {
          console.log(`[Updater] Skipping ${reason} update check; another check is in progress`);
          return;
        }

        isUpdateCheckInProgress = true;
        const checkPromise =
          reason === "startup"
            ? autoUpdater.checkForUpdatesAndNotify()
            : autoUpdater.checkForUpdates();

        checkPromise
          .catch((error) => {
            console.error(`Failed ${reason} update check:`, error);
          })
          .finally(() => {
            isUpdateCheckInProgress = false;
          });
      };

      // Check for updates on startup
      runUpdateCheck("startup");

      // Schedule periodic update checks every 4 hours
      if (!periodicUpdateInterval) {
        periodicUpdateInterval = setInterval(() => {
          runUpdateCheck("scheduled");
        }, UPDATE_CHECK_INTERVAL_MS);
      }

      // Set up event listeners
      autoUpdater.on('checking-for-update', () => {
        console.log('Checking for updates...');
        mainWindow?.webContents.send('updater:checking-for-update');
      });

      autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
        mainWindow?.webContents.send('updater:update-available', {
          version: info.version,
          releaseDate: info.releaseDate,
          releaseNotes: info.releaseNotes
        });
      });

      autoUpdater.on('update-not-available', (info) => {
        console.log('Update not available. Current version is latest:', info.version);
        mainWindow?.webContents.send('updater:update-not-available', {
          version: info.version
        });
      });

      autoUpdater.on('download-progress', (progress) => {
        console.log(`Download progress: ${progress.percent}%`);
        mainWindow?.webContents.send('updater:download-progress', {
          percent: progress.percent,
          bytesPerSecond: progress.bytesPerSecond,
          transferred: progress.transferred,
          total: progress.total
        });
      });

      autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded:', info.version);
        mainWindow?.webContents.send('updater:update-downloaded', {
          version: info.version,
          releaseDate: info.releaseDate
        });
      });

      autoUpdater.on('error', (err) => {
        console.error('Update error:', err);
        mainWindow?.webContents.send('updater:error', {
          message: err.message
        });
      });
    }

    // Install DevTools Extensions AFTER window creation (non-blocking)
    if (isDev) {
      const devToolsStart = Date.now();
      // Install React Developer Tools asynchronously without blocking
      import("electron-devtools-installer")
        .then(({ default: installExtension, REACT_DEVELOPER_TOOLS }) => {
          return installExtension(REACT_DEVELOPER_TOOLS);
        })
        .then((name) => {
          console.log(`Added Extension: ${name}`);
          perfLog("DevTools extensions installed", devToolsStart);
        })
        .catch((err) => {
          console.log("An error occurred installing extensions: ", err);
        });

      // The Chrome DevTools Performance Profiler is built-in
      // It will be available in the Performance tab of DevTools
      console.log(
        "Chrome DevTools Performance Profiler is available in the Performance tab",
      );
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error("Fatal error during app initialization:", error);
    dialog.showErrorBox(
      "Initialization Error",
      `Failed to initialize application: ${(error as Error).message}\n\nStack: ${(error as Error).stack}`,
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (periodicUpdateInterval) {
    clearInterval(periodicUpdateInterval);
    periodicUpdateInterval = null;
  }
});

// IPC Handlers
ipcMain.handle("utils:fromBase64", (_event, data: string) => {
  return Buffer.from(data, "base64").toString("utf8");
});

ipcMain.handle("auth:login", async () => {
  try {
    const token = await githubAuth.authenticate();
    return { success: true, token };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("auth:logout", async () => {
  try {
    await githubAuth.logout();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("auth:get-token", async () => {
  return githubAuth.getToken();
});

ipcMain.handle(
  "git:clone",
  async (_event, repoUrl: string, localPath: string) => {
    try {
      await gitOps.clone(repoUrl, localPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
);

ipcMain.handle(
  "git:checkout",
  async (_event, repoPath: string, branch: string) => {
    try {
      await gitOps.checkout(repoPath, branch);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
);

ipcMain.handle("git:pull", async (_event, repoPath: string) => {
  try {
    await gitOps.pull(repoPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("git:fetch", async (_event, repoPath: string) => {
  try {
    await gitOps.fetch(repoPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("git:branches", async (_event, repoPath: string) => {
  try {
    const branches = await gitOps.getBranches(repoPath);
    return { success: true, data: branches };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("app:select-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openDirectory"],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle("app:get-version", () => {
  return app.getVersion();
});

// Settings IPC handlers
ipcMain.handle("settings:get", async (_, key?: string) => {
  try {
    if (key) {
      const value = store.get(key);
      return { success: true, value };
    } else {
      const allSettings = store.store;
      return { success: true, settings: allSettings };
    }
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("settings:set", async (_, key: string, value: any) => {
  try {
    store.set(key, value);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("settings:clear", async () => {
  try {
    store.clear();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Zoom IPC handlers
ipcMain.handle("app:zoom-in", () => {
  if (mainWindow) {
    const currentZoom = mainWindow.webContents.getZoomLevel();
    const newZoom = Math.min(currentZoom + 0.5, 5); // Max zoom level 5
    mainWindow.webContents.setZoomLevel(newZoom);
    return { success: true, zoomLevel: newZoom };
  }
  return { success: false, error: "No window available" };
});

ipcMain.handle("app:zoom-out", () => {
  if (mainWindow) {
    const currentZoom = mainWindow.webContents.getZoomLevel();
    const newZoom = Math.max(currentZoom - 0.5, -5); // Min zoom level -5
    mainWindow.webContents.setZoomLevel(newZoom);
    return { success: true, zoomLevel: newZoom };
  }
  return { success: false, error: "No window available" };
});

ipcMain.handle("app:zoom-reset", () => {
  if (mainWindow) {
    mainWindow.webContents.setZoomLevel(0);
    return { success: true, zoomLevel: 0 };
  }
  return { success: false, error: "No window available" };
});

ipcMain.handle("app:get-zoom-level", () => {
  if (mainWindow) {
    return { success: true, zoomLevel: mainWindow.webContents.getZoomLevel() };
  }
  return { success: false, error: "No window available" };
});

// Auto-updater IPC handlers
ipcMain.handle("updater:check-for-updates", async () => {
  if (isDev) {
    return { success: false, error: "Updates not available in development mode" };
  }

  try {
    if (isUpdateCheckInProgress) {
      return { success: false, error: "Update check already in progress" };
    }

    isUpdateCheckInProgress = true;
    const result = await autoUpdater.checkForUpdates();
    return {
      success: true,
      updateInfo: result ? {
        version: result.updateInfo.version,
        releaseDate: result.updateInfo.releaseDate
      } : null
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  } finally {
    isUpdateCheckInProgress = false;
  }
});

ipcMain.handle("updater:install-update", () => {
  if (isDev) {
    return { success: false, error: "Updates not available in development mode" };
  }

  try {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("updater:get-status", () => {
  return {
    success: true,
    isDev,
    currentVersion: app.getVersion()
  };
});

// Find-in-page IPC handlers
ipcMain.handle("find:start", () => {
  if (mainWindow) {
    mainWindow.webContents.findInPage("");
    return { success: true };
  }
  return { success: false, error: "No window available" };
});

ipcMain.handle("find:find", (_, text: string, options?: { forward?: boolean; matchCase?: boolean; findNext?: boolean }) => {
  if (mainWindow) {
    const findOptions = {
      forward: options?.forward !== false,
      matchCase: options?.matchCase || false,
      findNext: options?.findNext || false
    };
    mainWindow.webContents.findInPage(text, findOptions);
    return { success: true };
  }
  return { success: false, error: "No window available" };
});

ipcMain.handle("find:stop", () => {
  if (mainWindow) {
    mainWindow.webContents.stopFindInPage("clearSelection");
    return { success: true };
  }
  return { success: false, error: "No window available" };
});
