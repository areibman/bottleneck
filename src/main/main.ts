import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { DatabaseManager } from './database/DatabaseManager';
import { GitHubService } from './services/GitHubService';
import { GitService } from './services/GitService';
import { PerformanceService } from './services/PerformanceService';
import { CacheService } from './services/CacheService';

class BottleneckApp {
  private mainWindow: BrowserWindow | null = null;
  private databaseManager: DatabaseManager;
  private githubService: GitHubService;
  private gitService: GitService;
  private performanceService: PerformanceService;
  private cacheService: CacheService;

  constructor() {
    this.databaseManager = new DatabaseManager();
    this.githubService = new GitHubService();
    this.gitService = new GitService();
    this.performanceService = new PerformanceService();
    this.cacheService = new CacheService();
    this.setupIpcHandlers();
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'hiddenInset',
      show: false,
    });

    // Load the renderer
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, 'index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupIpcHandlers(): void {
    // GitHub authentication
    ipcMain.handle('github:authenticate', async () => {
      return await this.githubService.authenticate();
    });

    ipcMain.handle('github:get-user', async () => {
      return await this.githubService.getCurrentUser();
    });

    ipcMain.handle('github:get-repos', async () => {
      return await this.githubService.getRepositories();
    });

    ipcMain.handle('github:get-prs', async (_, repo: string, state: string) => {
      return await this.githubService.getPullRequests(repo, state);
    });

    ipcMain.handle('github:get-pr-details', async (_, repo: string, prNumber: number) => {
      return await this.githubService.getPullRequestDetails(repo, prNumber);
    });

    ipcMain.handle('github:get-pr-files', async (_, repo: string, prNumber: number) => {
      return await this.githubService.getPullRequestFiles(repo, prNumber);
    });

    ipcMain.handle('github:get-pr-comments', async (_, repo: string, prNumber: number) => {
      return await this.githubService.getPullRequestComments(repo, prNumber);
    });

    ipcMain.handle('github:create-review', async (_, repo: string, prNumber: number, review: any) => {
      return await this.githubService.createReview(repo, prNumber, review);
    });

    ipcMain.handle('github:merge-pr', async (_, repo: string, prNumber: number, mergeMethod: string) => {
      return await this.githubService.mergePullRequest(repo, prNumber, mergeMethod);
    });

    // Git operations
    ipcMain.handle('git:clone', async (_, url: string, path: string) => {
      return await this.gitService.clone(url, path);
    });

    ipcMain.handle('git:checkout', async (_, repoPath: string, branch: string) => {
      return await this.gitService.checkout(repoPath, branch);
    });

    ipcMain.handle('git:get-branches', async (_, repoPath: string) => {
      return await this.gitService.getBranches(repoPath);
    });

    ipcMain.handle('git:get-diff', async (_, repoPath: string, base: string, head: string) => {
      return await this.gitService.getDiff(repoPath, base, head);
    });

    // Database operations
    ipcMain.handle('db:save-pr', async (_, pr: any) => {
      return await this.databaseManager.savePullRequest(pr);
    });

    ipcMain.handle('db:get-prs', async (_, filters: any) => {
      return await this.databaseManager.getPullRequests(filters);
    });

    ipcMain.handle('db:save-comment', async (_, comment: any) => {
      return await this.databaseManager.saveComment(comment);
    });

    ipcMain.handle('db:get-comments', async (_, prId: string) => {
      return await this.databaseManager.getComments(prId);
    });

    // File operations
    ipcMain.handle('dialog:select-directory', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory'],
      });
      return result.canceled ? null : result.filePaths[0];
    });
  }

  public async initialize(): Promise<void> {
    await this.databaseManager.initialize();
    await app.whenReady();
    this.createWindow();

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  private cleanup(): void {
    this.performanceService.cleanup();
    this.databaseManager.close();
  }
}

const bottleneckApp = new BottleneckApp();
bottleneckApp.initialize().catch(console.error);