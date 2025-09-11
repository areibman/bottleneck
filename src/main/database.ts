import * as sqlite3 from 'sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

export class Database {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'data');
    
    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    this.dbPath = path.join(dbDir, 'bottleneck.db');
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          // Enable foreign keys
          this.db!.run('PRAGMA foreign_keys = ON');
          
          // Create tables
          this.createTables();
          
          // Create indexes
          this.createIndexes();
          
          resolve();
        }
      });
    });
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Repositories table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS repositories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner TEXT NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL UNIQUE,
        description TEXT,
        default_branch TEXT,
        private BOOLEAN DEFAULT 0,
        clone_url TEXT,
        local_path TEXT,
        last_synced DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Pull requests table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pull_requests (
        id INTEGER PRIMARY KEY,
        repository_id INTEGER NOT NULL,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        state TEXT NOT NULL,
        draft BOOLEAN DEFAULT 0,
        merged BOOLEAN DEFAULT 0,
        mergeable BOOLEAN,
        merge_commit_sha TEXT,
        head_ref TEXT,
        head_sha TEXT,
        base_ref TEXT,
        base_sha TEXT,
        author_login TEXT,
        author_avatar_url TEXT,
        assignees TEXT,
        reviewers TEXT,
        labels TEXT,
        milestone TEXT,
        created_at DATETIME,
        updated_at DATETIME,
        closed_at DATETIME,
        merged_at DATETIME,
        last_synced DATETIME,
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
        UNIQUE(repository_id, number)
      )
    `);

    // Comments table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY,
        pull_request_id INTEGER NOT NULL,
        user_login TEXT,
        user_avatar_url TEXT,
        body TEXT,
        path TEXT,
        line INTEGER,
        side TEXT,
        start_line INTEGER,
        start_side TEXT,
        in_reply_to_id INTEGER,
        html_url TEXT,
        created_at DATETIME,
        updated_at DATETIME,
        FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id) ON DELETE CASCADE
      )
    `);

    // Reviews table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY,
        pull_request_id INTEGER NOT NULL,
        user_login TEXT,
        user_avatar_url TEXT,
        body TEXT,
        state TEXT,
        submitted_at DATETIME,
        commit_id TEXT,
        FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id) ON DELETE CASCADE
      )
    `);

    // Files table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pull_request_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        status TEXT,
        additions INTEGER DEFAULT 0,
        deletions INTEGER DEFAULT 0,
        changes INTEGER DEFAULT 0,
        patch TEXT,
        contents_url TEXT,
        blob_url TEXT,
        viewed BOOLEAN DEFAULT 0,
        FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id) ON DELETE CASCADE
      )
    `);

    // Branches table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repository_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        commit_sha TEXT,
        commit_message TEXT,
        commit_author TEXT,
        commit_date DATETIME,
        is_local BOOLEAN DEFAULT 0,
        is_remote BOOLEAN DEFAULT 0,
        ahead_by INTEGER DEFAULT 0,
        behind_by INTEGER DEFAULT 0,
        last_synced DATETIME,
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
        UNIQUE(repository_id, name)
      )
    `);

    // PR groups table for prefix-based grouping
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pr_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repository_id INTEGER NOT NULL,
        prefix TEXT NOT NULL,
        pattern TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        open_count INTEGER DEFAULT 0,
        merged_count INTEGER DEFAULT 0,
        closed_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
      )
    `);

    // User preferences table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Saved filters table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS saved_filters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        filter_json TEXT NOT NULL,
        is_default BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Draft reviews table for local autosave
    this.db.run(`
      CREATE TABLE IF NOT EXISTS draft_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pull_request_id INTEGER NOT NULL,
        body TEXT,
        comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id) ON DELETE CASCADE
      )
    `);
  }

  private createIndexes(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Indexes for performance
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_pr_repository ON pull_requests(repository_id);
      CREATE INDEX IF NOT EXISTS idx_pr_state ON pull_requests(state);
      CREATE INDEX IF NOT EXISTS idx_pr_author ON pull_requests(author_login);
      CREATE INDEX IF NOT EXISTS idx_pr_updated ON pull_requests(updated_at);
      CREATE INDEX IF NOT EXISTS idx_comments_pr ON comments(pull_request_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_pr ON reviews(pull_request_id);
      CREATE INDEX IF NOT EXISTS idx_files_pr ON files(pull_request_id);
      CREATE INDEX IF NOT EXISTS idx_branches_repo ON branches(repository_id);
      CREATE INDEX IF NOT EXISTS idx_pr_groups_repo ON pr_groups(repository_id);
      CREATE INDEX IF NOT EXISTS idx_pr_groups_prefix ON pr_groups(prefix);
    `);
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      this.db.all(sql, params || [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async execute(sql: string, params?: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      this.db.run(sql, params || [], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes, lastID: this.lastID });
        }
      });
    });
  }

  async transaction(fn: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      this.db.serialize(() => {
        this.db!.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          try {
            fn();
            this.db!.run('COMMIT', (err) => {
              if (err) {
                this.db!.run('ROLLBACK');
                reject(err);
              } else {
                resolve();
              }
            });
          } catch (error) {
            this.db!.run('ROLLBACK');
            reject(error);
          }
        });
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}
