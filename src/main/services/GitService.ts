import { simpleGit, SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';

export class GitService {
  public async clone(url: string, localPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const git = simpleGit();
      await git.clone(url, localPath);
      return { success: true };
    } catch (error) {
      console.error('Git clone failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Clone failed' 
      };
    }
  }

  public async checkout(repoPath: string, branch: string): Promise<{ success: boolean; error?: string }> {
    try {
      const git = simpleGit(repoPath);
      await git.checkout(branch);
      return { success: true };
    } catch (error) {
      console.error('Git checkout failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Checkout failed' 
      };
    }
  }

  public async getBranches(repoPath: string): Promise<{ local: string[]; remote: string[] }> {
    try {
      const git = simpleGit(repoPath);
      const branches = await git.branch(['-a']);
      
      const localBranches: string[] = [];
      const remoteBranches: string[] = [];

      branches.all.forEach(branch => {
        if (branch.startsWith('remotes/')) {
          const remoteBranch = branch.replace('remotes/origin/', '');
          if (remoteBranch !== 'HEAD') {
            remoteBranches.push(remoteBranch);
          }
        } else if (!branch.includes('HEAD')) {
          localBranches.push(branch);
        }
      });

      return { local: localBranches, remote: remoteBranches };
    } catch (error) {
      console.error('Failed to get branches:', error);
      return { local: [], remote: [] };
    }
  }

  public async getDiff(repoPath: string, base: string, head: string): Promise<string> {
    try {
      const git = simpleGit(repoPath);
      const diff = await git.diff([`${base}...${head}`]);
      return diff;
    } catch (error) {
      console.error('Failed to generate diff:', error);
      return '';
    }
  }

  public async getStatus(repoPath: string): Promise<{
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
  }> {
    try {
      const git = simpleGit(repoPath);
      const status = await git.status();
      
      return {
        modified: status.modified,
        added: status.created,
        deleted: status.deleted,
        untracked: status.not_added
      };
    } catch (error) {
      console.error('Failed to get git status:', error);
      return { modified: [], added: [], deleted: [], untracked: [] };
    }
  }

  public async pull(repoPath: string, branch: string = 'main'): Promise<{ success: boolean; error?: string }> {
    try {
      const git = simpleGit(repoPath);
      await git.pull('origin', branch);
      return { success: true };
    } catch (error) {
      console.error('Git pull failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Pull failed' 
      };
    }
  }

  public async isGitRepository(path: string): Promise<boolean> {
    try {
      const git = simpleGit(path);
      await git.status();
      return true;
    } catch {
      return false;
    }
  }
}