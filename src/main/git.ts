import simpleGit, { SimpleGit, BranchSummary } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';

export class GitManager {
  private git: SimpleGit;

  constructor() {
    this.git = simpleGit();
  }

  async clone(repoUrl: string, targetPath: string): Promise<void> {
    await this.git.clone(repoUrl, targetPath);
  }

  async checkout(repoPath: string, branch: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.checkout(branch);
  }

  async pull(repoPath: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.pull();
  }

  async fetch(repoPath: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.fetch(['--all', '--prune']);
  }

  async getBranches(repoPath: string): Promise<any[]> {
    const git = simpleGit(repoPath);
    const summary: BranchSummary = await git.branch(['-a', '-v']);
    
    const branches = [];
    for (const [name, branch] of Object.entries(summary.branches)) {
      const isRemote = name.startsWith('remotes/');
      const cleanName = isRemote ? name.replace('remotes/origin/', '') : name;
      
      branches.push({
        name: cleanName,
        is_local: !isRemote,
        is_remote: isRemote,
        current: branch.current,
        commit: branch.commit,
        label: branch.label,
      });
    }
    
    return branches;
  }

  async getCurrentBranch(repoPath: string): Promise<string> {
    const git = simpleGit(repoPath);
    const summary = await git.branch();
    return summary.current;
  }

  async getStatus(repoPath: string): Promise<any> {
    const git = simpleGit(repoPath);
    return await git.status();
  }

  async createBranch(repoPath: string, branchName: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.checkoutLocalBranch(branchName);
  }

  async deleteBranch(repoPath: string, branchName: string, force: boolean = false): Promise<void> {
    const git = simpleGit(repoPath);
    await git.deleteLocalBranch(branchName, force);
  }

  async getCommitDiff(repoPath: string, from: string, to: string): Promise<string> {
    const git = simpleGit(repoPath);
    return await git.diff([`${from}...${to}`]);
  }

  async getFileDiff(repoPath: string, filePath: string, from: string, to: string): Promise<string> {
    const git = simpleGit(repoPath);
    return await git.diff([`${from}...${to}`, '--', filePath]);
  }

  async stash(repoPath: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.stash();
  }

  async stashPop(repoPath: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.stash(['pop']);
  }

  async getRemoteUrl(repoPath: string): Promise<string> {
    const git = simpleGit(repoPath);
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    return origin?.refs?.fetch || '';
  }

  async isGitRepository(dirPath: string): Promise<boolean> {
    try {
      const gitDir = path.join(dirPath, '.git');
      const stats = await fs.promises.stat(gitDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}