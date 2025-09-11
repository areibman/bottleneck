import Database from 'better-sqlite3';
import * as path from 'path';
import * as os from 'os';

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
  author: string;
  authorId: number;
  repo: string;
  repoId: number;
  headRef: string;
  baseRef: string;
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  closedAt?: string;
  labels: string[];
  reviewers: string[];
  assignees: string[];
  checksStatus: 'pending' | 'success' | 'failure' | 'error';
  checksConclusion?: string;
  mergeable: boolean;
  mergeableState: 'clean' | 'dirty' | 'unstable' | 'blocked';
  additions: number;
  deletions: number;
  changedFiles: number;
  body?: string;
  url: string;
  htmlUrl: string;
}

export interface Comment {
  id: string;
  prId: string;
  type: 'comment' | 'review' | 'suggestion';
  author: string;
  authorId: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  path?: string;
  position?: number;
  line?: number;
  side?: 'left' | 'right';
  inReplyTo?: string;
  resolved: boolean;
  reviewId?: string;
}

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  cloneUrl: string;
  sshUrl: string;
  defaultBranch: string;
  lastSyncAt: string;
}

export class DatabaseManager {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(os.homedir(), '.bottleneck', 'bottleneck.db');
    this.db = new Database(dbPath);
  }

  public async initialize(): Promise<void> {
    this.createTables();
  }

  private createTables(): void {
    // Repositories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS repositories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL UNIQUE,
        owner TEXT NOT NULL,
        private BOOLEAN NOT NULL,
        clone_url TEXT NOT NULL,
        ssh_url TEXT NOT NULL,
        default_branch TEXT NOT NULL,
        last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Pull requests table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pull_requests (
        id TEXT PRIMARY KEY,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('open', 'closed', 'merged')),
        draft BOOLEAN NOT NULL DEFAULT 0,
        author TEXT NOT NULL,
        author_id INTEGER NOT NULL,
        repo TEXT NOT NULL,
        repo_id INTEGER NOT NULL,
        head_ref TEXT NOT NULL,
        base_ref TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        merged_at DATETIME,
        closed_at DATETIME,
        labels TEXT NOT NULL DEFAULT '[]',
        reviewers TEXT NOT NULL DEFAULT '[]',
        assignees TEXT NOT NULL DEFAULT '[]',
        checks_status TEXT NOT NULL DEFAULT 'pending',
        checks_conclusion TEXT,
        mergeable BOOLEAN NOT NULL DEFAULT 1,
        mergeable_state TEXT NOT NULL DEFAULT 'clean',
        additions INTEGER NOT NULL DEFAULT 0,
        deletions INTEGER NOT NULL DEFAULT 0,
        changed_files INTEGER NOT NULL DEFAULT 0,
        body TEXT,
        url TEXT NOT NULL,
        html_url TEXT NOT NULL,
        FOREIGN KEY (repo_id) REFERENCES repositories(id)
      )
    `);

    // Comments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        pr_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('comment', 'review', 'suggestion')),
        author TEXT NOT NULL,
        author_id INTEGER NOT NULL,
        body TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        path TEXT,
        position INTEGER,
        line INTEGER,
        side TEXT CHECK (side IN ('left', 'right')),
        in_reply_to TEXT,
        resolved BOOLEAN NOT NULL DEFAULT 0,
        review_id TEXT,
        FOREIGN KEY (pr_id) REFERENCES pull_requests(id)
      )
    `);

    // Groups table for prefix-based grouping
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        pattern TEXT NOT NULL,
        repo_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (repo_id) REFERENCES repositories(id)
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_prs_repo_state ON pull_requests(repo, state);
      CREATE INDEX IF NOT EXISTS idx_prs_author ON pull_requests(author);
      CREATE INDEX IF NOT EXISTS idx_prs_created_at ON pull_requests(created_at);
      CREATE INDEX IF NOT EXISTS idx_comments_pr_id ON comments(pr_id);
      CREATE INDEX IF NOT EXISTS idx_comments_path ON comments(path);
    `);
  }

  public async saveRepository(repo: Repository): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO repositories 
      (id, name, full_name, owner, private, clone_url, ssh_url, default_branch, last_sync_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      repo.id,
      repo.name,
      repo.fullName,
      repo.owner,
      repo.private ? 1 : 0,
      repo.cloneUrl,
      repo.sshUrl,
      repo.defaultBranch,
      repo.lastSyncAt
    );
  }

  public async savePullRequest(pr: PullRequest): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pull_requests 
      (id, number, title, state, draft, author, author_id, repo, repo_id, head_ref, base_ref,
       created_at, updated_at, merged_at, closed_at, labels, reviewers, assignees,
       checks_status, checks_conclusion, mergeable, mergeable_state, additions, deletions,
       changed_files, body, url, html_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      pr.id,
      pr.number,
      pr.title,
      pr.state,
      pr.draft ? 1 : 0,
      pr.author,
      pr.authorId,
      pr.repo,
      pr.repoId,
      pr.headRef,
      pr.baseRef,
      pr.createdAt,
      pr.updatedAt,
      pr.mergedAt || null,
      pr.closedAt || null,
      JSON.stringify(pr.labels),
      JSON.stringify(pr.reviewers),
      JSON.stringify(pr.assignees),
      pr.checksStatus,
      pr.checksConclusion || null,
      pr.mergeable ? 1 : 0,
      pr.mergeableState,
      pr.additions,
      pr.deletions,
      pr.changedFiles,
      pr.body || null,
      pr.url,
      pr.htmlUrl
    );
  }

  public async getPullRequests(filters: {
    repo?: string;
    state?: string;
    author?: string;
    labels?: string[];
    limit?: number;
    offset?: number;
  } = {}): Promise<PullRequest[]> {
    let query = 'SELECT * FROM pull_requests WHERE 1=1';
    const params: any[] = [];

    if (filters.repo) {
      query += ' AND repo = ?';
      params.push(filters.repo);
    }

    if (filters.state) {
      query += ' AND state = ?';
      params.push(filters.state);
    }

    if (filters.author) {
      query += ' AND author = ?';
      params.push(filters.author);
    }

    if (filters.labels && filters.labels.length > 0) {
      query += ' AND labels LIKE ?';
      params.push(`%${filters.labels[0]}%`);
    }

    query += ' ORDER BY updated_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      ...row,
      draft: Boolean(row.draft),
      labels: JSON.parse(row.labels),
      reviewers: JSON.parse(row.reviewers),
      assignees: JSON.parse(row.assignees),
      mergeable: Boolean(row.mergeable),
    }));
  }

  public async saveComment(comment: Comment): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO comments 
      (id, pr_id, type, author, author_id, body, created_at, updated_at, path, position, line, side, in_reply_to, resolved, review_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      comment.id,
      comment.prId,
      comment.type,
      comment.author,
      comment.authorId,
      comment.body,
      comment.createdAt,
      comment.updatedAt,
      comment.path || null,
      comment.position || null,
      comment.line || null,
      comment.side || null,
      comment.inReplyTo || null,
      comment.resolved ? 1 : 0,
      comment.reviewId || null
    );
  }

  public async getComments(prId: string): Promise<Comment[]> {
    const stmt = this.db.prepare('SELECT * FROM comments WHERE pr_id = ? ORDER BY created_at ASC');
    const rows = stmt.all(prId) as any[];

    return rows.map(row => ({
      ...row,
      resolved: Boolean(row.resolved),
    }));
  }

  public async getRepositories(): Promise<Repository[]> {
    const stmt = this.db.prepare('SELECT * FROM repositories ORDER BY name');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      ...row,
      private: Boolean(row.private),
    }));
  }

  public close(): void {
    this.db.close();
  }
}