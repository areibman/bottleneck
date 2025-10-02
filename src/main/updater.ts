import { autoUpdater } from "electron-updater";
import { BrowserWindow, dialog } from "electron";
import log from "electron-log";

// Configure logging
log.transports.file.level = "info";
autoUpdater.logger = log;

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

interface UpdateCheckResult {
  updateAvailable: boolean;
  version?: string;
  releaseNotes?: string;
  releaseDate?: string;
}

export class AppUpdater {
  private mainWindow: BrowserWindow;
  private updateAvailable = false;
  private updateDownloaded = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupListeners();
  }

  private setupListeners() {
    // Check for updates event
    autoUpdater.on("checking-for-update", () => {
      log.info("Checking for updates...");
      this.sendStatusToWindow("checking-for-update");
    });

    // Update available event
    autoUpdater.on("update-available", (info) => {
      log.info("Update available:", info);
      this.updateAvailable = true;
      this.sendStatusToWindow("update-available", {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
      });

      // Show notification
      this.showUpdateAvailableDialog(info);
    });

    // Update not available event
    autoUpdater.on("update-not-available", (info) => {
      log.info("Update not available:", info);
      this.updateAvailable = false;
      this.sendStatusToWindow("update-not-available");
    });

    // Update error event
    autoUpdater.on("error", (err) => {
      log.error("Error in auto-updater:", err);
      this.sendStatusToWindow("update-error", { error: err.message });
    });

    // Download progress event
    autoUpdater.on("download-progress", (progressObj) => {
      const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
      log.info(logMessage);
      this.sendStatusToWindow("download-progress", {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond,
      });
    });

    // Update downloaded event
    autoUpdater.on("update-downloaded", (info) => {
      log.info("Update downloaded:", info);
      this.updateDownloaded = true;
      this.sendStatusToWindow("update-downloaded", {
        version: info.version,
      });

      // Show install dialog
      this.showUpdateReadyDialog(info);
    });
  }

  private sendStatusToWindow(status: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("update-status", { status, ...data });
    }
  }

  private async showUpdateAvailableDialog(info: any) {
    const { response } = await dialog.showMessageBox(this.mainWindow, {
      type: "info",
      title: "Update Available",
      message: `A new version ${info.version} is available!`,
      detail: `Current version: ${autoUpdater.currentVersion}\nNew version: ${info.version}\n\nWould you like to download it now?`,
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      await this.downloadUpdate();
    }
  }

  private async showUpdateReadyDialog(info: any) {
    const { response } = await dialog.showMessageBox(this.mainWindow, {
      type: "info",
      title: "Update Ready",
      message: "Update downloaded successfully!",
      detail: `Version ${info.version} has been downloaded and is ready to install.\n\nWould you like to restart and install now?`,
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
    }
  }

  /**
   * Check for updates manually
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    try {
      log.info("Manual check for updates triggered");
      const result = await autoUpdater.checkForUpdates();
      
      if (result && result.updateInfo) {
        return {
          updateAvailable: true,
          version: result.updateInfo.version,
          releaseNotes: result.updateInfo.releaseNotes as string,
          releaseDate: result.updateInfo.releaseDate,
        };
      }
      
      return { updateAvailable: false };
    } catch (error) {
      log.error("Error checking for updates:", error);
      throw error;
    }
  }

  /**
   * Check for updates silently (without user interaction)
   */
  async checkForUpdatesSilently(): Promise<boolean> {
    try {
      const result = await autoUpdater.checkForUpdates();
      return result !== null && result.updateInfo !== null;
    } catch (error) {
      log.error("Error checking for updates silently:", error);
      return false;
    }
  }

  /**
   * Download available update
   */
  async downloadUpdate(): Promise<void> {
    if (!this.updateAvailable) {
      throw new Error("No update available to download");
    }

    try {
      log.info("Starting update download");
      await autoUpdater.downloadUpdate();
    } catch (error) {
      log.error("Error downloading update:", error);
      throw error;
    }
  }

  /**
   * Install downloaded update and restart
   */
  quitAndInstall(): void {
    if (!this.updateDownloaded) {
      throw new Error("No update downloaded to install");
    }

    log.info("Quitting and installing update");
    autoUpdater.quitAndInstall(false, true);
  }

  /**
   * Get current update status
   */
  getStatus() {
    return {
      updateAvailable: this.updateAvailable,
      updateDownloaded: this.updateDownloaded,
      currentVersion: autoUpdater.currentVersion,
    };
  }

  /**
   * Set update channel (stable, beta, alpha)
   */
  setChannel(channel: "stable" | "beta" | "alpha") {
    autoUpdater.channel = channel;
    log.info(`Update channel set to: ${channel}`);
  }

  /**
   * Enable or disable automatic updates
   */
  setAutoDownload(enabled: boolean) {
    autoUpdater.autoDownload = enabled;
    log.info(`Auto-download ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Initialize auto-updater (check for updates on startup)
   */
  initialize(checkOnStartup = true) {
    if (process.env.NODE_ENV === "development") {
      log.info("Auto-updater disabled in development mode");
      return;
    }

    if (checkOnStartup) {
      // Check for updates 5 seconds after startup
      setTimeout(() => {
        this.checkForUpdatesSilently();
      }, 5000);

      // Check for updates every 6 hours
      setInterval(() => {
        this.checkForUpdatesSilently();
      }, 6 * 60 * 60 * 1000);
    }
  }
}
