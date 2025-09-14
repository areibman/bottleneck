import { app, BrowserWindow, ipcMain, shell, Menu, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

import { Database } from './database';
import { GitHubAuth } from './auth';
import { GitOperations } from './git';
import { TerminalManager } from './terminal';
import { createMenu } from './menu';
import Store from 'electron-store';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

const isDev = process.env.NODE_ENV === 'development';
const store = new Store();

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify();
autoUpdater.logger = console;

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
});

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater:', err);
  mainWindow?.webContents.send('update-error', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
  mainWindow?.webContents.send('update-download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  mainWindow?.webContents.send('update-downloaded', info);
});

let mainWindow: BrowserWindow | null = null;
let database: Database;
let githubAuth: GitHubAuth;
let gitOps: GitOperations;
let terminal: TerminalManager;

function createWindow() {
  const preloadPath = path.resolve(path.join(__dirname, '../preload/index.js'));
  console.log('Preload path:', preloadPath);
  console.log('Preload exists:', require('fs').existsSync(preloadPath));
  console.log('__dirname:', __dirname);
  
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true, // Enable web security
    },
    backgroundColor: '#1e1e1e',
    show: false,
  });

  // Disable Content Security Policy in development mode to allow API calls
  if (!isDev) {
    // Only apply CSP in production
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' https://api.github.com; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https://avatars.githubusercontent.com https://github.com https://*.githubusercontent.com; " +
            "font-src 'self' data:; " +
            "connect-src 'self' https://api.github.com https://github.com http://localhost:* ws://localhost:*; " +
            "worker-src 'self' blob:;"
          ]
        }
      });
    });
  } else {
    // Remove CSP entirely in development
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      delete responseHeaders['Content-Security-Policy'];
      delete responseHeaders['content-security-policy'];
      callback({ responseHeaders });
    });
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Debug: Check if preload was set
    console.log('Window created and shown');
  });

  // Debug: Log when page loads
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded, checking preload...');
    mainWindow?.webContents.executeJavaScript('console.log("window.electron:", window.electron)');
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
    
    // Enable additional DevTools features
    mainWindow.webContents.on('devtools-opened', () => {
      console.log('DevTools opened - Performance profiler should be available');
      // The Performance tab should be available in the DevTools
      // You can access it via the "Performance" tab in DevTools
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Set up application menu
  const menu = createMenu(mainWindow);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
  // Install DevTools Extensions
  if (isDev) {
    // Install React Developer Tools
    try {
      const name = await installExtension(REACT_DEVELOPER_TOOLS);
      console.log(`Added Extension: ${name}`);
    } catch (err) {
      console.log('An error occurred installing extensions: ', err);
    }
    
    // The Chrome DevTools Performance Profiler is built-in
    // It will be available in the Performance tab of DevTools
    console.log('Chrome DevTools Performance Profiler is available in the Performance tab');
  }

  // Initialize database
  database = new Database();
  await database.initialize();

  // Initialize GitHub auth
  githubAuth = new GitHubAuth(store);

  // Initialize Git operations
  gitOps = new GitOperations();

  // Initialize Terminal
  terminal = new TerminalManager();

  // Set default settings if they don't exist
  if (!store.has('cloneLocation')) {
    store.set('cloneLocation', '~/repos');
    console.log('[Settings] Set default clone location to ~/repos');
  }

  createWindow();

  // Check for updates after app is ready (but not in development)
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 5000); // Check after 5 seconds
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await database?.close();
});

// IPC Handlers
ipcMain.handle('auth:login', async () => {
  try {
    const token = await githubAuth.authenticate();
    return { success: true, token };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('auth:logout', async () => {
  try {
    await githubAuth.logout();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('auth:get-token', async () => {
  return githubAuth.getToken();
});

ipcMain.handle('db:query', async (_event, query: string, params?: any[]) => {
  try {
    const result = await database.query(query, params);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('db:execute', async (_event, query: string, params?: any[]) => {
  try {
    const result = await database.execute(query, params);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('git:clone', async (_event, repoUrl: string, localPath: string) => {
  try {
    await gitOps.clone(repoUrl, localPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('git:checkout', async (_event, repoPath: string, branch: string) => {
  try {
    await gitOps.checkout(repoPath, branch);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('git:pull', async (_event, repoPath: string) => {
  try {
    await gitOps.pull(repoPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('git:fetch', async (_event, repoPath: string) => {
  try {
    await gitOps.fetch(repoPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('git:branches', async (_event, repoPath: string) => {
  try {
    const branches = await gitOps.getBranches(repoPath);
    return { success: true, data: branches };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('app:select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

// Terminal IPC handlers
ipcMain.handle('terminal:spawn', async (_event, cwd?: string) => {
  try {
    let workingDirectory = cwd;

    // If no specific directory provided, use settings clone location
    if (!workingDirectory) {
      const cloneLocation = store.get('cloneLocation', '~/repos') as string;
      workingDirectory = cloneLocation.replace('~', require('os').homedir());
      console.log(`[Terminal] Using clone location from settings: ${cloneLocation} -> ${workingDirectory}`);
    }

    terminal.spawn(workingDirectory);

    // Set up data callback to send to renderer
    terminal.onData((data) => {
      mainWindow?.webContents.send('terminal:data', data);
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Fire-and-forget write for performance
ipcMain.on('terminal:write', (_event, data: string) => {
  try {
    terminal.write(data);
  } catch (error) {
    console.error('[Terminal] write error:', error);
  }
});

// Keep old handler for compatibility if anything invokes it
ipcMain.handle('terminal:write', async (_event, data: string) => {
  try {
    terminal.write(data);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('terminal:kill', async () => {
  try {
    terminal.kill();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('terminal:resize', async (_event, cols: number, rows: number) => {
  try {
    terminal.resize(cols, rows);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('terminal:restart', async (_event, cwd?: string) => {
  try {
    terminal.restart(cwd);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('terminal:health', async () => {
  try {
    const healthy = terminal.isHealthy();
    return { success: true, healthy };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Settings IPC handlers
ipcMain.handle('settings:get', async (_, key?: string) => {
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

ipcMain.handle('settings:set', async (_, key: string, value: any) => {
  try {
    store.set(key, value);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Auto-updater IPC handlers
ipcMain.handle('updater:check-for-updates', async () => {
  try {
    if (isDev) {
      return { success: false, error: 'Updates not available in development mode' };
    }
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('updater:download-update', async () => {
  try {
    if (isDev) {
      return { success: false, error: 'Updates not available in development mode' };
    }
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('updater:install-update', async () => {
  try {
    if (isDev) {
      return { success: false, error: 'Updates not available in development mode' };
    }
    autoUpdater.quitAndInstall();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('updater:get-version', async () => {
  try {
    return { success: true, version: app.getVersion() };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
