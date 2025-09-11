import { app, BrowserWindow, ipcMain, shell, dialog, Menu } from 'electron';
import * as path from 'path';
import { AuthManager } from './auth';
import { DatabaseManager } from './database';
import { GitManager } from './git';
import { GitHubAPIManager } from './github-api';
import Store from 'electron-store';

const isDev = process.env.NODE_ENV === 'development';
const store = new Store();

let mainWindow: BrowserWindow | null = null;
let authManager: AuthManager;
let dbManager: DatabaseManager;
let gitManager: GitManager;
let githubAPI: GitHubAPIManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e1e',
    show: false,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App menu
function createMenu() {
  const template: any[] = [
    {
      label: 'Bottleneck',
      submenu: [
        { label: 'About Bottleneck', role: 'about' },
        { type: 'separator' },
        { label: 'Preferences', accelerator: 'Cmd+,', click: () => {
          mainWindow?.webContents.send('open-preferences');
        }},
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Cmd+Q', role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Cmd+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+Cmd+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Cmd+X', role: 'cut' },
        { label: 'Copy', accelerator: 'Cmd+C', role: 'copy' },
        { label: 'Paste', accelerator: 'Cmd+V', role: 'paste' },
        { label: 'Select All', accelerator: 'Cmd+A', role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'Cmd+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'Cmd+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'Alt+Cmd+I', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'Cmd+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'Cmd+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'Cmd+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'Ctrl+Cmd+F', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'Cmd+M', role: 'minimize' },
        { label: 'Close', accelerator: 'Cmd+W', role: 'close' },
      ],
    },
  ];

  if (process.platform === 'darwin') {
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

// Initialize managers
async function initializeManagers() {
  const dbPath = path.join(app.getPath('userData'), 'bottleneck.db');
  
  dbManager = new DatabaseManager(dbPath);
  await dbManager.initialize();
  
  authManager = new AuthManager(store);
  gitManager = new GitManager();
  githubAPI = new GitHubAPIManager(authManager);
}

// App event handlers
app.whenReady().then(async () => {
  await initializeManagers();
  createWindow();
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('auth:login', async () => {
  try {
    const token = await authManager.authenticate();
    return { success: true, token };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:logout', async () => {
  await authManager.logout();
  return { success: true };
});

ipcMain.handle('auth:get-token', async () => {
  return authManager.getToken();
});

ipcMain.handle('github:get-user', async () => {
  return githubAPI.getCurrentUser();
});

ipcMain.handle('github:get-repos', async (_, options) => {
  return githubAPI.getRepositories(options);
});

ipcMain.handle('github:get-prs', async (_, { owner, repo, options }) => {
  return githubAPI.getPullRequests(owner, repo, options);
});

ipcMain.handle('github:get-pr', async (_, { owner, repo, number }) => {
  return githubAPI.getPullRequest(owner, repo, number);
});

ipcMain.handle('github:get-pr-files', async (_, { owner, repo, number }) => {
  return githubAPI.getPullRequestFiles(owner, repo, number);
});

ipcMain.handle('github:get-pr-comments', async (_, { owner, repo, number }) => {
  return githubAPI.getPullRequestComments(owner, repo, number);
});

ipcMain.handle('github:create-comment', async (_, { owner, repo, number, body, path, position, line }) => {
  return githubAPI.createComment(owner, repo, number, { body, path, position, line });
});

ipcMain.handle('github:update-comment', async (_, { owner, repo, commentId, body }) => {
  return githubAPI.updateComment(owner, repo, commentId, body);
});

ipcMain.handle('github:delete-comment', async (_, { owner, repo, commentId }) => {
  return githubAPI.deleteComment(owner, repo, commentId);
});

ipcMain.handle('github:create-review', async (_, { owner, repo, number, event, body, comments }) => {
  return githubAPI.createReview(owner, repo, number, { event, body, comments });
});

ipcMain.handle('github:merge-pr', async (_, { owner, repo, number, method, title, message }) => {
  return githubAPI.mergePullRequest(owner, repo, number, { method, title, message });
});

ipcMain.handle('git:clone', async (_, { url, path: repoPath }) => {
  return gitManager.clone(url, repoPath);
});

ipcMain.handle('git:checkout', async (_, { path: repoPath, branch }) => {
  return gitManager.checkout(repoPath, branch);
});

ipcMain.handle('git:pull', async (_, { path: repoPath }) => {
  return gitManager.pull(repoPath);
});

ipcMain.handle('git:get-branches', async (_, { path: repoPath }) => {
  return gitManager.getBranches(repoPath);
});

ipcMain.handle('db:get-cached-prs', async (_, { owner, repo }) => {
  return dbManager.getCachedPullRequests(owner, repo);
});

ipcMain.handle('db:cache-pr', async (_, pr) => {
  return dbManager.cachePullRequest(pr);
});

ipcMain.handle('db:get-settings', async () => {
  return dbManager.getSettings();
});

ipcMain.handle('db:save-settings', async (_, settings) => {
  return dbManager.saveSettings(settings);
});

ipcMain.handle('dialog:select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});