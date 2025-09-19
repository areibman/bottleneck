import simpleGit, { SimpleGit, BranchSummary } from "simple-git";
import path from "path";
import fs from "fs";
import { app } from "electron";

export interface Branch {
  name: string;
  current: boolean;
  commit: string;
  label: string;
  linkedWorkTree?: string;
  isLocal: boolean;
  isRemote: boolean;
}

export interface DiffResult {
  files: Array<{
    file: string;
    changes: number;
    insertions: number;
    deletions: number;
    binary: boolean;
  }>;
  insertions: number;
  deletions: number;
  files_changed: number;
}

export class GitOperations {
  private getGit(repoPath: string): SimpleGit {
    return simpleGit(repoPath);
  }

  private getReposPath(): string {
    const userDataPath = app.getPath("userData");
    const reposPath = path.join(userDataPath, "repos");

    if (!fs.existsSync(reposPath)) {
      fs.mkdirSync(reposPath, { recursive: true });
    }

    return reposPath;
  }

  async clone(repoUrl: string, localPath?: string): Promise<string> {
    const reposPath = this.getReposPath();
    const repoName = this.extractRepoName(repoUrl);
    const targetPath = localPath || path.join(reposPath, repoName);

    const git = simpleGit();
    await git.clone(repoUrl, targetPath);

    return targetPath;
  }

  async fetch(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.fetch(["--all", "--prune"]);
  }

  async pull(repoPath: string, branch?: string): Promise<void> {
    const git = this.getGit(repoPath);

    if (branch) {
      await git.pull("origin", branch);
    } else {
      await git.pull();
    }
  }

  async checkout(
    repoPath: string,
    branch: string,
    create: boolean = false,
  ): Promise<void> {
    const git = this.getGit(repoPath);

    if (create) {
      await git.checkoutBranch(branch, `origin/${branch}`);
    } else {
      await git.checkout(branch);
    }
  }

  async getBranches(repoPath: string): Promise<Branch[]> {
    const git = this.getGit(repoPath);
    const branchSummary: BranchSummary = await git.branch(["-a", "-v"]);

    const branches: Branch[] = [];

    for (const [name, branch] of Object.entries(branchSummary.branches)) {
      branches.push({
        name: branch.name,
        current: branch.current,
        commit: branch.commit,
        label: branch.label || "",
        linkedWorkTree: branch.linkedWorkTree === true ? "true" : undefined,
        isLocal: !name.startsWith("remotes/"),
        isRemote: name.startsWith("remotes/"),
      });
    }

    return branches;
  }

  async getCurrentBranch(repoPath: string): Promise<string> {
    const git = this.getGit(repoPath);
    const branch = await git.revparse(["--abbrev-ref", "HEAD"]);
    return branch.trim();
  }

  async getStatus(repoPath: string): Promise<any> {
    const git = this.getGit(repoPath);
    return await git.status();
  }

  async getDiff(
    repoPath: string,
    base: string,
    head: string,
  ): Promise<DiffResult> {
    const git = this.getGit(repoPath);
    const diff = await git.diffSummary([base, head]);

    return {
      files: diff.files.map((file) => ({
        file: file.file,
        changes: (file as any).changes || 0,
        insertions: (file as any).insertions || 0,
        deletions: (file as any).deletions || 0,
        binary: file.binary,
      })),
      insertions: diff.insertions,
      deletions: diff.deletions,
      files_changed: diff.changed,
    };
  }

  async getFileDiff(
    repoPath: string,
    file: string,
    base: string,
    head: string,
  ): Promise<string> {
    const git = this.getGit(repoPath);
    return await git.diff([base, head, "--", file]);
  }

  async createBranch(
    repoPath: string,
    branchName: string,
    from?: string,
  ): Promise<void> {
    const git = this.getGit(repoPath);

    if (from) {
      await git.checkoutBranch(branchName, from);
    } else {
      await git.checkoutLocalBranch(branchName);
    }
  }

  async deleteBranch(
    repoPath: string,
    branchName: string,
    force: boolean = false,
  ): Promise<void> {
    const git = this.getGit(repoPath);

    if (force) {
      await git.deleteLocalBranch(branchName, true);
    } else {
      await git.deleteLocalBranch(branchName);
    }
  }

  async push(
    repoPath: string,
    branch?: string,
    force: boolean = false,
  ): Promise<void> {
    const git = this.getGit(repoPath);
    const args = ["origin"];

    if (branch) {
      args.push(branch);
    }

    if (force) {
      args.push("--force");
    }

    await git.push(args);
  }

  async getCommitLog(repoPath: string, limit: number = 50): Promise<any[]> {
    const git = this.getGit(repoPath);
    const log = await git.log(["-n", String(limit)]);
    return [...log.all];
  }

  async stash(repoPath: string, message?: string): Promise<void> {
    const git = this.getGit(repoPath);

    if (message) {
      await git.stash(["save", message]);
    } else {
      await git.stash();
    }
  }

  async stashPop(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.stash(["pop"]);
  }

  private extractRepoName(repoUrl: string): string {
    // Extract repo name from URL
    const match = repoUrl.match(/\/([^\/]+?)(?:\.git)?$/);
    return match ? match[1] : "repo";
  }
}
