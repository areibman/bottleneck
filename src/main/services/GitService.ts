import * as Git from 'nodegit';
import * as path from 'path';
import * as fs from 'fs';

export class GitService {
  public async clone(url: string, localPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      await Git.Clone.clone(url, localPath);
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
      const repo = await Git.Repository.open(repoPath);
      const ref = await Git.Reference.lookup(repo, `refs/heads/${branch}`);
      await repo.checkoutRef(ref);
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
      const repo = await Git.Repository.open(repoPath);
      const localBranches: string[] = [];
      const remoteBranches: string[] = [];

      // Get local branches
      const localRefs = await repo.getReferences(Git.Reference.TYPE.LISTALL);
      for (const ref of localRefs) {
        if (ref.isBranch()) {
          const name = ref.name().replace('refs/heads/', '');
          localBranches.push(name);
        }
      }

      // Get remote branches
      const remoteRefs = await repo.getReferences(Git.Reference.TYPE.LISTALL);
      for (const ref of remoteRefs) {
        if (ref.isRemote()) {
          const name = ref.name().replace('refs/remotes/origin/', '');
          if (name !== 'HEAD') {
            remoteBranches.push(name);
          }
        }
      }

      return { local: localBranches, remote: remoteBranches };
    } catch (error) {
      console.error('Failed to get branches:', error);
      return { local: [], remote: [] };
    }
  }

  public async getDiff(repoPath: string, base: string, head: string): Promise<string> {
    try {
      const repo = await Git.Repository.open(repoPath);
      
      // Get the base and head commits
      const baseCommit = await repo.getCommit(base);
      const headCommit = await repo.getCommit(head);

      // Generate diff
      const diff = await Git.Diff.treeToTree(repo, baseCommit, headCommit, {
        flags: Git.Diff.OPTION.INCLUDE_UNTRACKED,
      });

      const patches = await diff.patches();
      let diffText = '';

      for (const patch of patches) {
        const hunks = await patch.hunks();
        for (const hunk of hunks) {
          const lines = await hunk.lines();
          for (const line of lines) {
            const content = line.content();
            const origin = line.origin();
            const lineNumber = line.newLineno();
            const oldLineNumber = line.oldLineno();
            
            let prefix = ' ';
            if (origin === Git.Diff.LINE.ADDITION) {
              prefix = '+';
            } else if (origin === Git.Diff.LINE.DELETION) {
              prefix = '-';
            } else if (origin === Git.Diff.LINE.CONTEXT) {
              prefix = ' ';
            }

            diffText += `${prefix}${content}`;
          }
        }
      }

      return diffText;
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
      const repo = await Git.Repository.open(repoPath);
      const status = await repo.getStatus();
      
      const modified: string[] = [];
      const added: string[] = [];
      const deleted: string[] = [];
      const untracked: string[] = [];

      for (const file of status) {
        const filePath = file.path();
        const statusFlags = file.status();

        if (statusFlags & Git.Status.STATUS.WT_MODIFIED) {
          modified.push(filePath);
        }
        if (statusFlags & Git.Status.STATUS.INDEX_ADDED) {
          added.push(filePath);
        }
        if (statusFlags & Git.Status.STATUS.WT_DELETED) {
          deleted.push(filePath);
        }
        if (statusFlags & Git.Status.STATUS.WT_NEW) {
          untracked.push(filePath);
        }
      }

      return { modified, added, deleted, untracked };
    } catch (error) {
      console.error('Failed to get git status:', error);
      return { modified: [], added: [], deleted: [], untracked: [] };
    }
  }

  public async pull(repoPath: string, branch: string = 'main'): Promise<{ success: boolean; error?: string }> {
    try {
      const repo = await Git.Repository.open(repoPath);
      const remote = await repo.getRemote('origin');
      
      await remote.fetch();
      
      const remoteBranch = await repo.getBranch(`origin/${branch}`);
      const localBranch = await repo.getBranch(branch);
      
      await repo.mergeBranches(branch, `origin/${branch}`);
      
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
      await Git.Repository.open(path);
      return true;
    } catch {
      return false;
    }
  }
}