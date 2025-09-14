import { app, dialog, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';

export class AppUpdater {
  private mainWindow: BrowserWindow | null = null;
  private isManualCheck = false;

  constructor() {
    // Configure auto-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    
    // Set up feed URL for different channels
    const channel = this.getUpdateChannel();
    autoUpdater.channel = channel;
    autoUpdater.allowPrerelease = channel !== 'stable';

    // Configure logging
    autoUpdater.logger = require('electron-log');
    (autoUpdater.logger as any).transports.file.level = 'info';

    this.setupEventHandlers();
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private getUpdateChannel(): string {
    // Check for beta/alpha in version or use settings
    const version = app.getVersion();
    if (version.includes('beta')) return 'beta';
    if (version.includes('alpha')) return 'alpha';
    
    // Could also check user preferences here
    // return settingsStore.get('updateChannel', 'stable');
    return 'stable';
  }

  private setupEventHandlers() {
    autoUpdater.on('checking-for-update', () => {
      this.sendStatusToWindow('checking-for-update');
      console.log('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
      this.sendStatusToWindow('update-available', info);
      
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version ${info.version} is available. Would you like to download it now?`,
        detail: `Current version: ${app.getVersion()}\nNew version: ${info.version}\n\nRelease notes:\n${info.releaseNotes || 'No release notes available'}`,
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      this.sendStatusToWindow('update-not-available', info);
      
      if (this.isManualCheck) {
        dialog.showMessageBox({
          type: 'info',
          title: 'No Updates Available',
          message: `You're using the latest version of Bottleneck (${app.getVersion()})`,
          buttons: ['OK']
        });
      }
      
      this.isManualCheck = false;
    });

    autoUpdater.on('error', (err) => {
      this.sendStatusToWindow('update-error', err);
      
      if (this.isManualCheck) {
        dialog.showMessageBox({
          type: 'error',
          title: 'Update Error',
          message: 'An error occurred while checking for updates',
          detail: err.message,
          buttons: ['OK']
        });
      }
      
      this.isManualCheck = false;
      console.error('Update error:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
      logMessage = `${logMessage} - Downloaded ${progressObj.percent}%`;
      logMessage = `${logMessage} (${progressObj.transferred}/${progressObj.total})`;
      
      console.log(logMessage);
      this.sendStatusToWindow('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.sendStatusToWindow('update-downloaded', info);
      
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. The application will restart to apply the update.',
        detail: `Version ${info.version} has been downloaded and will be installed when you restart the application.`,
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          setImmediate(() => autoUpdater.quitAndInstall());
        }
      });
    });
  }

  private sendStatusToWindow(status: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', { status, data });
    }
  }

  checkForUpdates(isManual = false) {
    this.isManualCheck = isManual;
    autoUpdater.checkForUpdatesAndNotify();
  }

  checkForUpdatesInBackground() {
    // Check for updates silently
    autoUpdater.checkForUpdates();
  }

  downloadUpdate() {
    autoUpdater.downloadUpdate();
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall();
  }

  // Settings management
  setAutoDownload(enabled: boolean) {
    autoUpdater.autoDownload = enabled;
  }

  setAllowPrerelease(enabled: boolean) {
    autoUpdater.allowPrerelease = enabled;
  }

  setUpdateChannel(channel: 'stable' | 'beta' | 'alpha') {
    autoUpdater.channel = channel;
    autoUpdater.allowPrerelease = channel !== 'stable';
  }

  getCurrentVersion(): string {
    return app.getVersion();
  }

  getUpdateCheckInterval(): number {
    // Return interval in milliseconds (default: 1 hour)
    return 60 * 60 * 1000;
  }
}

// Export singleton instance
export const appUpdater = new AppUpdater();