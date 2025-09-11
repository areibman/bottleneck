import Database from 'better-sqlite3';
import * as path from 'path';

export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  async initialize(): Promise<void> {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS repositories (
        id INTEGER PRIMARY KEY,
        owner TEXT NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL,
        description TEXT,
        private BOOLEAN,
        fork BOOLEAN,
        created_at TEXT,
        updated_at TEXT,
        pushed_at TEXT,
        size INTEGER,
        stargazers_count INTEGER,
        watchers_count INTEGER,
        language TEXT,
        default_branch TEXT,
        cached_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(owner, name)
      );

      CREATE TABLE IF NOT EXISTS pull_requests (
        id INTEGER PRIMARY KEY,
        repo_owner TEXT NOT NULL,
        repo_name TEXT NOT NULL,
        number INTEGER NOT NULL,
        state TEXT,
        title TEXT,
        body TEXT,
        user_login TEXT,
        user_avatar_url TEXT,
        created_at TEXT,
        updated_at TEXT,
        closed_at TEXT,
        merged_at TEXT,
        merge_commit_sha TEXT,
        draft BOOLEAN,
        head_ref TEXT,
        head_sha TEXT,
        base_ref TEXT,
        base_sha TEXT,
        labels TEXT,
        assignees TEXT,
        reviewers TEXT,
        review_comments INTEGER,
        comments INTEGER,
        commits INTEGER,
        additions INTEGER,
        deletions INTEGER,
        changed_files INTEGER,
        cached_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(repo_owner, repo_name, number)
      );

      CREATE TABLE IF NOT EXISTS pr_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pr_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        status TEXT,
        additions INTEGER,
        deletions INTEGER,
        changes INTEGER,
        patch TEXT,
        FOREIGN KEY (pr_id) REFERENCES pull_requests(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS pr_comments (
        id INTEGER PRIMARY KEY,
        pr_id INTEGER NOT NULL,
        user_login TEXT,
        user_avatar_url TEXT,
        body TEXT,
        created_at TEXT,
        updated_at TEXT,
        path TEXT,
        position INTEGER,
        line INTEGER,
        start_line INTEGER,
        in_reply_to_id INTEGER,
        FOREIGN KEY (pr_id) REFERENCES pull_requests(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS pr_reviews (
        id INTEGER PRIMARY KEY,
        pr_id INTEGER NOT NULL,
        user_login TEXT,
        user_avatar_url TEXT,
        body TEXT,
        state TEXT,
        submitted_at TEXT,
        FOREIGN KEY (pr_id) REFERENCES pull_requests(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_owner TEXT NOT NULL,
        repo_name TEXT NOT NULL,
        name TEXT NOT NULL,
        is_local BOOLEAN,
        is_remote BOOLEAN,
        ahead INTEGER DEFAULT 0,
        behind INTEGER DEFAULT 0,
        last_commit_sha TEXT,
        last_commit_message TEXT,
        last_commit_date TEXT,
        cached_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(repo_owner, repo_name, name)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS draft_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pr_id INTEGER NOT NULL,
        body TEXT,
        comments TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pr_id) REFERENCES pull_requests(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_pr_repo ON pull_requests(repo_owner, repo_name);
      CREATE INDEX IF NOT EXISTS idx_pr_state ON pull_requests(state);
      CREATE INDEX IF NOT EXISTS idx_pr_user ON pull_requests(user_login);
      CREATE INDEX IF NOT EXISTS idx_pr_updated ON pull_requests(updated_at);
      CREATE INDEX IF NOT EXISTS idx_branch_repo ON branches(repo_owner, repo_name);
    `);
  }

  async getCachedPullRequests(owner: string, repo: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM pull_requests 
      WHERE repo_owner = ? AND repo_name = ?
      ORDER BY updated_at DESC
    `);
    return stmt.all(owner, repo);
  }

  async cachePullRequest(pr: any): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pull_requests (
        id, repo_owner, repo_name, number, state, title, body,
        user_login, user_avatar_url, created_at, updated_at,
        closed_at, merged_at, merge_commit_sha, draft,
        head_ref, head_sha, base_ref, base_sha,
        labels, assignees, reviewers,
        review_comments, comments, commits,
        additions, deletions, changed_files
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      pr.id,
      pr.repo_owner,
      pr.repo_name,
      pr.number,
      pr.state,
      pr.title,
      pr.body,
      pr.user?.login,
      pr.user?.avatar_url,
      pr.created_at,
      pr.updated_at,
      pr.closed_at,
      pr.merged_at,
      pr.merge_commit_sha,
      pr.draft,
      pr.head?.ref,
      pr.head?.sha,
      pr.base?.ref,
      pr.base?.sha,
      JSON.stringify(pr.labels || []),
      JSON.stringify(pr.assignees || []),
      JSON.stringify(pr.requested_reviewers || []),
      pr.review_comments,
      pr.comments,
      pr.commits,
      pr.additions,
      pr.deletions,
      pr.changed_files
    );
  }

  async cachePRFiles(prId: number, files: any[]): Promise<void> {
    const deleteStmt = this.db.prepare('DELETE FROM pr_files WHERE pr_id = ?');
    deleteStmt.run(prId);

    const insertStmt = this.db.prepare(`
      INSERT INTO pr_files (pr_id, filename, status, additions, deletions, changes, patch)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((files: any[]) => {
      for (const file of files) {
        insertStmt.run(
          prId,
          file.filename,
          file.status,
          file.additions,
          file.deletions,
          file.changes,
          file.patch
        );
      }
    });

    insertMany(files);
  }

  async getCachedPRFiles(prId: number): Promise<any[]> {
    const stmt = this.db.prepare('SELECT * FROM pr_files WHERE pr_id = ?');
    return stmt.all(prId);
  }

  async cacheBranches(owner: string, repo: string, branches: any[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO branches (
        repo_owner, repo_name, name, is_local, is_remote,
        ahead, behind, last_commit_sha, last_commit_message, last_commit_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((branches: any[]) => {
      for (const branch of branches) {
        stmt.run(
          owner,
          repo,
          branch.name,
          branch.is_local,
          branch.is_remote,
          branch.ahead,
          branch.behind,
          branch.last_commit_sha,
          branch.last_commit_message,
          branch.last_commit_date
        );
      }
    });

    insertMany(branches);
  }

  async getCachedBranches(owner: string, repo: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM branches 
      WHERE repo_owner = ? AND repo_name = ?
      ORDER BY name
    `);
    return stmt.all(owner, repo);
  }

  async saveDraftReview(prId: number, body: string, comments: any[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO draft_reviews (pr_id, body, comments, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(prId, body, JSON.stringify(comments));
  }

  async getDraftReview(prId: number): Promise<any> {
    const stmt = this.db.prepare('SELECT * FROM draft_reviews WHERE pr_id = ?');
    const result = stmt.get(prId);
    if (result && result.comments) {
      result.comments = JSON.parse(result.comments);
    }
    return result;
  }

  async deleteDraftReview(prId: number): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM draft_reviews WHERE pr_id = ?');
    stmt.run(prId);
  }

  async getSettings(): Promise<Record<string, any>> {
    const stmt = this.db.prepare('SELECT * FROM settings');
    const rows = stmt.all();
    const settings: Record<string, any> = {};
    
    for (const row of rows as any[]) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    
    return settings;
  }

  async saveSettings(settings: Record<string, any>): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value)
      VALUES (?, ?)
    `);

    const saveMany = this.db.transaction((entries: [string, any][]) => {
      for (const [key, value] of entries) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        stmt.run(key, serialized);
      }
    });

    saveMany(Object.entries(settings));
  }

  close(): void {
    this.db.close();
  }
}