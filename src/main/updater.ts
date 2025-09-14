import { autoUpdater } from 'electron-updater';
import { dialog, BrowserWindow } from 'electron';
import Store from 'electron-store';

const store = new Store();

export class Updater {
  private mainWindow: BrowserWindow | null = null;
  private isUpdateAvailable = false;
  private updateInfo: any = null;

  constructor() {
    this.setupUpdater();
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private setupUpdater() {
    // Configure auto-updater
    autoUpdater.checkForUpdatesAndNotify = false; // We'll handle this manually
    autoUpdater.autoDownload = false; // We'll handle downloads manually
    autoUpdater.autoInstallOnAppQuit = true;

    // Set update server (GitHub releases)
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'YOUR_GITHUB_USERNAME', // This should be replaced with actual username
      repo: 'bottleneck'
    });

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
      this.sendToRenderer('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      this.isUpdateAvailable = true;
      this.updateInfo = info;
      this.sendToRenderer('update-available', info);
      
      // Show notification to user
      this.showUpdateNotification(info);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info);
      this.sendToRenderer('update-not-available', info);
    });

    autoUpdater.on('error', (err) => {
      console.error('Update error:', err);
      this.sendToRenderer('update-error', err.message);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
      console.log(message);
      this.sendToRenderer('update-download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      this.sendToRenderer('update-downloaded', info);
      
      // Show dialog asking user to restart
      this.showRestartDialog();
    });
  }

  async checkForUpdates() {
    try {
      // Check if auto-updates are enabled
      const autoUpdateEnabled = store.get('autoUpdateEnabled', true) as boolean;
      if (!autoUpdateEnabled) {
        console.log('Auto-updates are disabled');
        return;
      }

      // Check for updates
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('Failed to check for updates:', error);
      this.sendToRenderer('update-error', 'Failed to check for updates');
    }
  }

  async downloadUpdate() {
    if (!this.isUpdateAvailable) {
      console.log('No update available to download');
      return;
    }

    try {
      console.log('Starting update download...');
      this.sendToRenderer('update-downloading');
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Failed to download update:', error);
      this.sendToRenderer('update-error', 'Failed to download update');
    }
  }

  async installUpdate() {
    try {
      console.log('Installing update...');
      this.sendToRenderer('update-installing');
      autoUpdater.quitAndInstall();
    } catch (error) {
      console.error('Failed to install update:', error);
      this.sendToRenderer('update-error', 'Failed to install update');
    }
  }

  private showUpdateNotification(info: any) {
    if (!this.mainWindow) return;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available!`,
      detail: `Current version: ${info.currentVersion}\nNew version: ${info.version}\n\nWould you like to download it now?`,
      buttons: ['Download Now', 'Download Later', 'Skip This Version'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      switch (result.response) {
        case 0: // Download Now
          this.downloadUpdate();
          break;
        case 1: // Download Later
          // User will be prompted again later
          break;
        case 2: // Skip This Version
          this.skipVersion(info.version);
          break;
      }
    });
  }

  private showRestartDialog() {
    if (!this.mainWindow) return;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded successfully!',
      detail: 'The application will restart to apply the update.',
      buttons: ['Restart Now', 'Restart Later'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        this.installUpdate();
      }
    });
  }

  private skipVersion(version: string) {
    const skippedVersions = store.get('skippedVersions', []) as string[];
    if (!skippedVersions.includes(version)) {
      skippedVersions.push(version);
      store.set('skippedVersions', skippedVersions);
    }
  }

  private sendToRenderer(channel: string, data?: any) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  // Public methods for settings
  setAutoUpdateEnabled(enabled: boolean) {
    store.set('autoUpdateEnabled', enabled);
  }

  isAutoUpdateEnabled(): boolean {
    return store.get('autoUpdateEnabled', true) as boolean;
  }

  getSkippedVersions(): string[] {
    return store.get('skippedVersions', []) as string[];
  }

  clearSkippedVersions() {
    store.delete('skippedVersions');
  }
}