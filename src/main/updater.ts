import { app, dialog, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';

// Configure logging
autoUpdater.logger = require('electron-log');
(autoUpdater.logger as any).transports.file.level = 'info';

export class AppUpdater {
  private mainWindow: BrowserWindow | null = null;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private isManualCheck = false;

  constructor() {
    // Configure auto-updater
    this.configureUpdater();
    
    // Set up event handlers
    this.setupEventHandlers();
  }

  private configureUpdater(): void {
    // Configure update settings
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    
    // Support pre-release/beta channels based on app version
    const version = app.getVersion();
    if (version.includes('beta') || version.includes('alpha')) {
      autoUpdater.allowPrerelease = true;
      autoUpdater.channel = 'beta';
    } else {
      autoUpdater.allowPrerelease = false;
      autoUpdater.channel = 'latest';
    }

    // Configure differential updates
    autoUpdater.allowDowngrade = false;
    
    // Set feed URL if needed (GitHub releases will be auto-detected)
    if (process.env.UPDATE_FEED_URL) {
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: process.env.UPDATE_FEED_URL,
      });
    }
  }

  private setupEventHandlers(): void {
    // Checking for update
    autoUpdater.on('checking-for-update', () => {
      this.sendStatusToWindow('checking-for-update');
      console.log('Checking for update...');
    });

    // Update available
    autoUpdater.on('update-available', (info) => {
      this.sendStatusToWindow('update-available', info);
      console.log('Update available:', info);
      
      // Show dialog to user
      const dialogOpts = {
        type: 'info' as const,
        buttons: ['Download', 'Later'],
        title: 'Application Update',
        message: process.platform === 'win32' ? info.releaseNotes as string : info.releaseName as string,
        detail: `A new version ${info.version} is available. Current version is ${app.getVersion()}.\n\nDo you want to download it now?`,
      };

      dialog.showMessageBox(this.mainWindow!, dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
    });

    // No update available
    autoUpdater.on('update-not-available', (info) => {
      this.sendStatusToWindow('update-not-available', info);
      console.log('Update not available:', info);
      
      if (this.isManualCheck) {
        dialog.showMessageBox(this.mainWindow!, {
          type: 'info',
          title: 'No Updates Available',
          message: 'You are running the latest version.',
          detail: `Current version: ${app.getVersion()}`,
          buttons: ['OK'],
        });
        this.isManualCheck = false;
      }
    });

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      this.sendStatusToWindow('download-progress', progressObj);
      
      let logMessage = 'Download speed: ' + progressObj.bytesPerSecond;
      logMessage = logMessage + ' - Downloaded ' + progressObj.percent + '%';
      logMessage = logMessage + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
      console.log(logMessage);
      
      // Update progress in main window
      if (this.mainWindow) {
        this.mainWindow.setProgressBar(progressObj.percent / 100);
      }
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      this.sendStatusToWindow('update-downloaded', info);
      console.log('Update downloaded:', info);
      
      // Reset progress bar
      if (this.mainWindow) {
        this.mainWindow.setProgressBar(-1);
      }
      
      // Prompt user to restart
      const dialogOpts = {
        type: 'info' as const,
        buttons: ['Restart Now', 'Later'],
        title: 'Application Update',
        message: process.platform === 'win32' ? info.releaseNotes as string : info.releaseName as string,
        detail: `A new version ${info.version} has been downloaded. Restart the application to apply the updates.`,
      };

      dialog.showMessageBox(this.mainWindow!, dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
          setImmediate(() => autoUpdater.quitAndInstall());
        }
      });
    });

    // Error handling
    autoUpdater.on('error', (err) => {
      this.sendStatusToWindow('error', err);
      console.error('Error in auto-updater:', err);
      
      if (this.isManualCheck) {
        dialog.showErrorBox('Update Error', 'Error checking for updates: ' + err.toString());
        this.isManualCheck = false;
      }
    });

    // Before quit for update
    autoUpdater.on('before-quit-for-update', () => {
      console.log('Application is about to quit for update...');
      // Perform any cleanup here
    });
  }

  private sendStatusToWindow(status: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', { status, data });
    }
  }

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  public checkForUpdates(isManual = false): void {
    this.isManualCheck = isManual;
    autoUpdater.checkForUpdatesAndNotify();
  }

  public startAutoUpdateCheck(intervalMinutes = 60): void {
    // Check for updates immediately
    this.checkForUpdates();
    
    // Set up periodic checks
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, intervalMinutes * 60 * 1000);
  }

  public stopAutoUpdateCheck(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  public downloadUpdate(): void {
    autoUpdater.downloadUpdate();
  }

  public quitAndInstall(): void {
    autoUpdater.quitAndInstall();
  }

  public getCurrentVersion(): string {
    return app.getVersion();
  }

  public getUpdateChannel(): string {
    return autoUpdater.channel || 'latest';
  }

  public setUpdateChannel(channel: 'latest' | 'beta' | 'alpha'): void {
    autoUpdater.channel = channel;
    autoUpdater.allowPrerelease = channel !== 'latest';
  }

  public isUpdateAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      autoUpdater.once('update-available', () => resolve(true));
      autoUpdater.once('update-not-available', () => resolve(false));
      autoUpdater.once('error', () => resolve(false));
      autoUpdater.checkForUpdates();
    });
  }
}

// Export singleton instance
export const appUpdater = new AppUpdater();