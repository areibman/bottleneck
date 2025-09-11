import { app, BrowserWindow, ipcMain, shell, Menu, dialog } from 'electron';
import path from 'path';
import { Database } from './database';
import { GitHubAuth } from './auth';
import { GitOperations } from './git';
import { createMenu } from './menu';
import Store from 'electron-store';

const isDev = process.env.NODE_ENV === 'development';
const store = new Store();

let mainWindow: BrowserWindow | null = null;
let database: Database;
let githubAuth: GitHubAuth;
let gitOps: GitOperations;

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

  // Set Content Security Policy to allow local resources only
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https://avatars.githubusercontent.com https://github.com; " +
          "font-src 'self' data:; " +
          "connect-src 'self' https://api.github.com https://github.com http://localhost:*; " +
          "worker-src 'self' blob:;"
        ]
      }
    });
  });

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
  // Initialize database
  database = new Database();
  await database.initialize();

  // Initialize GitHub auth
  githubAuth = new GitHubAuth(store);

  // Initialize Git operations
  gitOps = new GitOperations();

  createWindow();

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
