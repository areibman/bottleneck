export const mockPullRequests = [
  {
    id: 1,
    number: 42,
    title: "feat: Add new authentication flow",
    body: "This PR implements the new OAuth2 authentication flow with improved security.",
    state: "open" as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: "feature/auth-flow",
      sha: "abc123",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "alice",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [
      { login: "bob", avatar_url: "https://github.com/octocat.png" },
    ],
    labels: [
      { name: "enhancement", color: "a2eeef" },
      { name: "frontend", color: "0e8a16" },
    ],
    comments: 5,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    closed_at: null,
    merged_at: null,
    changed_files: 8,
    additions: 247,
    deletions: 43,
  },
  {
    id: 2,
    number: 41,
    title: "fix: Resolve memory leak in diff viewer",
    body: "Fixes the memory leak issue when viewing large diffs.",
    state: "open" as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: "fix/memory-leak",
      sha: "ghi789",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "bob",
      avatar_url: "https://github.com/octocat.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: "bug", color: "d73a4a" },
      { name: "high-priority", color: "b60205" },
    ],
    comments: 12,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    closed_at: null,
    merged_at: null,
    changed_files: 3,
    additions: 45,
    deletions: 128,
  },
  {
    id: 3,
    number: 40,
    title: "chore: Update dependencies",
    body: "Monthly dependency updates.",
    state: "open" as const,
    draft: true,
    merged: false,
    mergeable: null,
    merge_commit_sha: null,
    head: {
      ref: "chore/deps-update",
      sha: "jkl012",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "charlie",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [{ name: "dependencies", color: "0366d6" }],
    comments: 2,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    closed_at: null,
    merged_at: null,
    changed_files: 15,
    additions: 523,
    deletions: 189,
  },
  {
    id: 4,
    number: 39,
    title: "feat: Add dark mode support",
    body: "Implements dark mode toggle with system preference detection.",
    state: "closed" as const,
    draft: false,
    merged: true,
    mergeable: null,
    merge_commit_sha: "mno345",
    head: {
      ref: "feature/dark-mode",
      sha: "pqr678",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "stu901",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "alice",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: "enhancement", color: "a2eeef" },
      { name: "ui/ux", color: "fbca04" },
    ],
    comments: 8,
    created_at: new Date(Date.now() - 604800000).toISOString(),
    updated_at: new Date(Date.now() - 345600000).toISOString(),
    closed_at: new Date(Date.now() - 345600000).toISOString(),
    merged_at: new Date(Date.now() - 345600000).toISOString(),
    changed_files: 12,
    additions: 384,
    deletions: 95,
  },
  // Add more mock PRs with prefix patterns for grouping
  {
    id: 5,
    number: 1255,
    title: "Fix local development setup issues",
    body: "AI-generated fix for local dev environment.",
    state: "open" as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: "cursor/fix-local-dev-1",
      sha: "vwx234",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "cursor-ai",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [{ name: "ai-generated", color: "7057ff" }],
    comments: 3,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    closed_at: null,
    merged_at: null,
    changed_files: 5,
    additions: 67,
    deletions: 23,
  },
  {
    id: 6,
    number: 1254,
    title: "Fix local development environment configuration",
    body: "AI-generated fix for dev config issues.",
    state: "open" as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: "cursor/fix-local-dev-2",
      sha: "yz1567",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "cursor-ai",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [{ name: "ai-generated", color: "7057ff" }],
    comments: 0,
    created_at: new Date(Date.now() - 5400000).toISOString(),
    updated_at: new Date(Date.now() - 2700000).toISOString(),
    closed_at: null,
    merged_at: null,
    changed_files: 2,
    additions: 18,
    deletions: 5,
  },
  {
    id: 7,
    number: 1253,
    title: "Fix local development server startup",
    body: "AI-generated fix for server startup issues.",
    state: "open" as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: "cursor/fix-local-dev-3",
      sha: "abc890",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "cursor-ai",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [{ name: "ai-generated", color: "7057ff" }],
    comments: 7,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    closed_at: null,
    merged_at: null,
    changed_files: 4,
    additions: 92,
    deletions: 31,
  },
  {
    id: 8,
    number: 1252,
    title: "Update UI components for better accessibility",
    body: "AI-generated improvements for accessibility.",
    state: "open" as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: "cursor/update-ui-accessibility",
      sha: "def123",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "cursor-ai",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: "ai-generated", color: "7057ff" },
      { name: "accessibility", color: "0366d6" },
    ],
    comments: 4,
    created_at: new Date(Date.now() - 9000000).toISOString(),
    updated_at: new Date(Date.now() - 4500000).toISOString(),
    closed_at: null,
    merged_at: null,
    changed_files: 7,
    additions: 156,
    deletions: 42,
  },
  {
    id: 9,
    number: 1251,
    title: "Update UI components for mobile responsiveness",
    body: "AI-generated mobile responsive improvements.",
    state: "open" as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: "cursor/update-ui-mobile",
      sha: "ghi456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "cursor-ai",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: "ai-generated", color: "7057ff" },
      { name: "ui/ux", color: "fbca04" },
    ],
    comments: 1,
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 5400000).toISOString(),
    closed_at: null,
    merged_at: null,
    changed_files: 6,
    additions: 203,
    deletions: 78,
  },
  // Add more diverse agent contributors
  {
    id: 10,
    number: 1250,
    title: "Implement advanced caching mechanism",
    body: "AI-generated performance optimization with Redis caching.",
    state: "closed" as const,
    draft: false,
    merged: true,
    mergeable: null,
    merge_commit_sha: "xyz789",
    head: {
      ref: "devin/caching-optimization",
      sha: "abc123",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "devin-ai",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: "ai-generated", color: "7057ff" },
      { name: "performance", color: "0e8a16" },
    ],
    comments: 8,
    created_at: new Date(Date.now() - 1209600000).toISOString(), // 2 weeks ago
    updated_at: new Date(Date.now() - 1209600000 + 172800000).toISOString(), // 2 days later
    closed_at: new Date(Date.now() - 1209600000 + 172800000).toISOString(),
    merged_at: new Date(Date.now() - 1209600000 + 172800000).toISOString(),
    changed_files: 12,
    additions: 456,
    deletions: 89,
  },
  {
    id: 11,
    number: 1249,
    title: "Add comprehensive error handling",
    body: "AI-generated error handling improvements across the application.",
    state: "closed" as const,
    draft: false,
    merged: true,
    mergeable: null,
    merge_commit_sha: "def456",
    head: {
      ref: "chatgpt/error-handling",
      sha: "ghi789",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "chatgpt-ai",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: "ai-generated", color: "7057ff" },
      { name: "bug", color: "d73a4a" },
    ],
    comments: 5,
    created_at: new Date(Date.now() - 2592000000).toISOString(), // 1 month ago
    updated_at: new Date(Date.now() - 2592000000 + 432000000).toISOString(), // 5 days later
    closed_at: new Date(Date.now() - 2592000000 + 432000000).toISOString(),
    merged_at: new Date(Date.now() - 2592000000 + 432000000).toISOString(),
    changed_files: 8,
    additions: 234,
    deletions: 67,
  },
  {
    id: 12,
    number: 1248,
    title: "Optimize database queries",
    body: "AI-generated database query optimization for better performance.",
    state: "open" as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: "devin/db-optimization",
      sha: "jkl012",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "devin-ai",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: "ai-generated", color: "7057ff" },
      { name: "performance", color: "0e8a16" },
    ],
    comments: 3,
    created_at: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
    updated_at: new Date(Date.now() - 216000000).toISOString(), // 2.5 days ago
    closed_at: null,
    merged_at: null,
    changed_files: 15,
    additions: 678,
    deletions: 123,
  },
  {
    id: 13,
    number: 1247,
    title: "Add unit tests for authentication module",
    body: "AI-generated comprehensive unit tests for the authentication system.",
    state: "closed" as const,
    draft: false,
    merged: true,
    mergeable: null,
    merge_commit_sha: "mno345",
    head: {
      ref: "claude/tests-auth",
      sha: "pqr678",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "claude-ai",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: "ai-generated", color: "7057ff" },
      { name: "tests", color: "0366d6" },
    ],
    comments: 2,
    created_at: new Date(Date.now() - 1814400000).toISOString(), // 3 weeks ago
    updated_at: new Date(Date.now() - 1814400000 + 259200000).toISOString(), // 3 days later
    closed_at: new Date(Date.now() - 1814400000 + 259200000).toISOString(),
    merged_at: new Date(Date.now() - 1814400000 + 259200000).toISOString(),
    changed_files: 6,
    additions: 345,
    deletions: 12,
  },
  // Add more human contributors for better stats
  {
    id: 14,
    number: 1246,
    title: "Refactor user authentication flow",
    body: "Complete refactor of the authentication system for better security.",
    state: "closed" as const,
    draft: false,
    merged: true,
    mergeable: null,
    merge_commit_sha: "stu901",
    head: {
      ref: "feature/auth-refactor",
      sha: "vwx234",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "david",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: "enhancement", color: "a2eeef" },
      { name: "security", color: "b60205" },
    ],
    comments: 15,
    created_at: new Date(Date.now() - 3456000000).toISOString(), // 6 weeks ago
    updated_at: new Date(Date.now() - 3456000000 + 604800000).toISOString(), // 1 week later
    closed_at: new Date(Date.now() - 3456000000 + 604800000).toISOString(),
    merged_at: new Date(Date.now() - 3456000000 + 604800000).toISOString(),
    changed_files: 25,
    additions: 1200,
    deletions: 300,
  },
  {
    id: 15,
    number: 1245,
    title: "Fix critical security vulnerability",
    body: "Addresses CVE-2023-12345 in the dependency chain.",
    state: "closed" as const,
    draft: false,
    merged: true,
    mergeable: null,
    merge_commit_sha: "yz1567",
    head: {
      ref: "hotfix/security-patch",
      sha: "abc890",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    base: {
      ref: "main",
      sha: "def456",
      repo: {
        name: "bottleneck",
        owner: { login: "dev-user" },
      },
    },
    user: {
      login: "sarah",
      avatar_url: "https://github.com/github.png",
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: "bug", color: "d73a4a" },
      { name: "security", color: "b60205" },
      { name: "hotfix", color: "ff6b6b" },
    ],
    comments: 8,
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 43200000).toISOString(), // 12 hours later
    closed_at: new Date(Date.now() - 43200000).toISOString(),
    merged_at: new Date(Date.now() - 43200000).toISOString(),
    changed_files: 3,
    additions: 45,
    deletions: 12,
  },
];

export const mockRepositories = [
  {
    id: 1,
    owner: "dev-user",
    name: "bottleneck",
    full_name: "dev-user/bottleneck",
    description: "Fast GitHub PR review and branch management",
    default_branch: "main",
    private: false,
    clone_url: "https://github.com/dev-user/bottleneck.git",
  },
  {
    id: 2,
    owner: "dev-user",
    name: "example-repo",
    full_name: "dev-user/example-repo",
    description: "Example repository for testing",
    default_branch: "main",
    private: false,
    clone_url: "https://github.com/dev-user/example-repo.git",
  },
];

export const mockFiles = [
  {
    filename: "src/components/Button.tsx",
    status: "modified" as const,
    additions: 24,
    deletions: 3,
    changes: 27,
    patch: `@@ -10,7 +10,10 @@ export function Button({ children, onClick }) {
-  return <button onClick={onClick}>{children}</button>;
+  return (
+    <button className="btn btn-primary" onClick={onClick}>
+      {children}
+    </button>
+  );`,
    contents_url: "",
    blob_url: "",
  },
  {
    filename: "src/styles/global.css",
    status: "modified" as const,
    additions: 15,
    deletions: 2,
    changes: 17,
    patch: `@@ -1,5 +1,8 @@
+.btn {
+  padding: 8px 16px;
+  border-radius: 4px;
+}`,
    contents_url: "",
    blob_url: "",
  },
];

export const mockComments = [
  {
    id: 1,
    body: "Great work on this PR! Just a few minor suggestions.",
    user: {
      login: "reviewer1",
      avatar_url: "https://github.com/octocat.png",
    },
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    html_url: "#",
  },
];

export const mockReviews = [
  {
    id: 1,
    user: {
      login: "reviewer1",
      avatar_url: "https://github.com/octocat.png",
    },
    body: "LGTM! Nice implementation.",
    state: "APPROVED" as const,
    submitted_at: new Date(Date.now() - 1800000).toISOString(),
    commit_id: "abc123",
  },
];

export const mockReviewComments = [
  {
    id: 101,
    body: "Consider extracting this logic into a helper to keep the component tidy.",
    user: {
      login: "reviewer2",
      avatar_url: "https://github.com/octocat.png",
    },
    created_at: new Date(Date.now() - 2400000).toISOString(),
    updated_at: new Date(Date.now() - 2400000).toISOString(),
    html_url: "#",
    path: "src/components/Button.tsx",
    line: 42,
    side: "RIGHT" as const,
    diff_hunk: "@@ -38,6 +42,10 @@",
  },
  {
    id: 102,
    body: "Nit: we usually keep imports alphabetised.",
    user: {
      login: "reviewer3",
      avatar_url: "https://github.com/github.png",
    },
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    html_url: "#",
    path: "src/components/Button.tsx",
    line: 18,
    side: "RIGHT" as const,
    diff_hunk: "@@ -12,3 +18,3 @@",
    in_reply_to_id: 101,
  },
];

export const mockReviewThreads = [
  {
    id: "PRRT_mock_thread_201",
    state: "pending" as const,
    path: "src/components/Button.tsx",
    start_line: 42,
    line: 42,
    side: "RIGHT" as const,
    comments: mockReviewComments.map((comment) => ({ ...comment })),
  },
];

export const mockIssues = [
  {
    id: 1,
    number: 101,
    title: "Fix login button alignment",
    body: "The login button is misaligned on the welcome screen.",
    state: "open",
    user: {
      login: "design-team",
      avatar_url: "https://avatars.githubusercontent.com/u/12346",
    },
    labels: [
      { name: "bug", color: "d73a4a" },
      { name: "ui", color: "a2eeef" },
    ],
    assignees: [
      {
        login: "reibs",
        avatar_url: "https://avatars.githubusercontent.com/u/12345",
      },
    ],
    comments: 2,
    created_at: "2023-10-07T10:00:00Z",
    updated_at: "2023-10-07T11:30:00Z",
    closed_at: null,
  },
  {
    id: 2,
    number: 102,
    title: "Add dark mode support",
    body: "Implement a toggle for dark mode in the settings.",
    state: "open",
    user: {
      login: "product-manager",
      avatar_url: "https://avatars.githubusercontent.com/u/12347",
    },
    labels: [{ name: "feature", color: "28a745" }],
    assignees: [],
    comments: 5,
    created_at: "2023-10-08T14:00:00Z",
    updated_at: "2023-10-08T15:20:00Z",
    closed_at: null,
  },
  {
    id: 3,
    number: 98,
    title: "Update documentation for API v2",
    body: "The documentation needs to be updated to reflect the new API v2 changes.",
    state: "closed",
    user: {
      login: "dev-rel",
      avatar_url: "https://avatars.githubusercontent.com/u/12348",
    },
    labels: [{ name: "documentation", color: "0075ca" }],
    assignees: [],
    comments: 1,
    created_at: "2023-09-25T18:00:00Z",
    updated_at: "2023-09-28T10:00:00Z",
    closed_at: "2023-09-28T10:00:00Z",
  },
];
