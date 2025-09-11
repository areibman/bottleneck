export const mockPullRequests = [
  {
    id: 1,
    number: 42,
    title: 'feat: Add new authentication flow',
    body: 'This PR implements the new OAuth2 authentication flow with improved security.',
    state: 'open' as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: 'feature/auth-flow',
      sha: 'abc123',
      repo: {
        name: 'bottleneck',
        owner: { login: 'dev-user' }
      }
    },
    base: {
      ref: 'main',
      sha: 'def456',
      repo: {
        name: 'bottleneck',
        owner: { login: 'dev-user' }
      }
    },
    user: {
      login: 'alice',
      avatar_url: 'https://github.com/github.png'
    },
    assignees: [],
    requested_reviewers: [
      { login: 'bob', avatar_url: 'https://github.com/octocat.png' }
    ],
    labels: [
      { name: 'enhancement', color: 'a2eeef' },
      { name: 'frontend', color: '0e8a16' }
    ],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    closed_at: null,
    merged_at: null
  },
  {
    id: 2,
    number: 41,
    title: 'fix: Resolve memory leak in diff viewer',
    body: 'Fixes the memory leak issue when viewing large diffs.',
    state: 'open' as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: 'fix/memory-leak',
      sha: 'ghi789',
      repo: {
        name: 'bottleneck',
        owner: { login: 'dev-user' }
      }
    },
    base: {
      ref: 'main',
      sha: 'def456',
      repo: {
        name: 'bottleneck',
        owner: { login: 'dev-user' }
      }
    },
    user: {
      login: 'bob',
      avatar_url: 'https://github.com/octocat.png'
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: 'bug', color: 'd73a4a' },
      { name: 'high-priority', color: 'b60205' }
    ],
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    closed_at: null,
    merged_at: null
  },
  {
    id: 3,
    number: 40,
    title: 'chore: Update dependencies',
    body: 'Monthly dependency updates.',
    state: 'open' as const,
    draft: true,
    merged: false,
    mergeable: null,
    merge_commit_sha: null,
    head: {
      ref: 'chore/deps-update',
      sha: 'jkl012',
      repo: {
        name: 'bottleneck',
        owner: { login: 'dev-user' }
      }
    },
    base: {
      ref: 'main',
      sha: 'def456',
      repo: {
        name: 'bottleneck',
        owner: { login: 'dev-user' }
      }
    },
    user: {
      login: 'charlie',
      avatar_url: 'https://github.com/github.png'
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: 'dependencies', color: '0366d6' }
    ],
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    closed_at: null,
    merged_at: null
  },
  {
    id: 4,
    number: 39,
    title: 'feat: Add dark mode support',
    body: 'Implements dark mode toggle with system preference detection.',
    state: 'closed' as const,
    draft: false,
    merged: true,
    mergeable: null,
    merge_commit_sha: 'mno345',
    head: {
      ref: 'feature/dark-mode',
      sha: 'pqr678',
      repo: {
        name: 'bottleneck',
        owner: { login: 'dev-user' }
      }
    },
    base: {
      ref: 'main',
      sha: 'stu901',
      repo: {
        name: 'bottleneck',
        owner: { login: 'dev-user' }
      }
    },
    user: {
      login: 'alice',
      avatar_url: 'https://github.com/github.png'
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: 'enhancement', color: 'a2eeef' },
      { name: 'ui/ux', color: 'fbca04' }
    ],
    created_at: new Date(Date.now() - 604800000).toISOString(),
    updated_at: new Date(Date.now() - 345600000).toISOString(),
    closed_at: new Date(Date.now() - 345600000).toISOString(),
    merged_at: new Date(Date.now() - 345600000).toISOString()
  },
  // Add more mock PRs with prefix patterns for grouping
  {
    id: 5,
    number: 38,
    title: 'cursor/fix-header-alignment',
    body: 'AI-generated fix for header alignment issue.',
    state: 'open' as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: 'cursor/fix-header-alignment',
      sha: 'vwx234',
      repo: {
        name: 'bottleneck',
        owner: { login: 'dev-user' }
      }
    },
    base: {
      ref: 'main',
      sha: 'def456',
      repo: {
        name: 'bottleneck',
        owner: { login: 'dev-user' }
      }
    },
    user: {
      login: 'cursor-ai',
      avatar_url: 'https://github.com/github.png'
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: 'ai-generated', color: '7057ff' }
    ],
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    closed_at: null,
    merged_at: null
  },
  {
    id: 6,
    number: 37,
    title: 'cursor/fix-button-styles',
    body: 'AI-generated fix for button styling issues.',
    state: 'open' as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: 'cursor/fix-button-styles',
      sha: 'yz1567',
      repo: {
        name: 'bottleneck',
        owner: { login: 'dev-user' }
      }
    },
    base: {
      ref: 'main',
      sha: 'def456',
      repo: {
        name: 'bottleneck',
        owner: { login: 'dev-user' }
      }
    },
    user: {
      login: 'cursor-ai',
      avatar_url: 'https://github.com/github.png'
    },
    assignees: [],
    requested_reviewers: [],
    labels: [
      { name: 'ai-generated', color: '7057ff' }
    ],
    created_at: new Date(Date.now() - 5400000).toISOString(),
    updated_at: new Date(Date.now() - 2700000).toISOString(),
    closed_at: null,
    merged_at: null
  }
];

export const mockRepositories = [
  {
    id: 1,
    owner: 'dev-user',
    name: 'bottleneck',
    full_name: 'dev-user/bottleneck',
    description: 'Fast GitHub PR review and branch management',
    default_branch: 'main',
    private: false,
    clone_url: 'https://github.com/dev-user/bottleneck.git'
  },
  {
    id: 2,
    owner: 'dev-user',
    name: 'example-repo',
    full_name: 'dev-user/example-repo',
    description: 'Example repository for testing',
    default_branch: 'main',
    private: false,
    clone_url: 'https://github.com/dev-user/example-repo.git'
  }
];

export const mockFiles = [
  {
    filename: 'src/components/Button.tsx',
    status: 'modified' as const,
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
    contents_url: '',
    blob_url: ''
  },
  {
    filename: 'src/styles/global.css',
    status: 'modified' as const,
    additions: 15,
    deletions: 2,
    changes: 17,
    patch: `@@ -1,5 +1,8 @@
+.btn {
+  padding: 8px 16px;
+  border-radius: 4px;
+}`,
    contents_url: '',
    blob_url: ''
  }
];

export const mockComments = [
  {
    id: 1,
    body: 'Great work on this PR! Just a few minor suggestions.',
    user: {
      login: 'reviewer1',
      avatar_url: 'https://github.com/octocat.png'
    },
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    html_url: '#'
  }
];

export const mockReviews = [
  {
    id: 1,
    user: {
      login: 'reviewer1',
      avatar_url: 'https://github.com/octocat.png'
    },
    body: 'LGTM! Nice implementation.',
    state: 'APPROVED' as const,
    submitted_at: new Date(Date.now() - 1800000).toISOString(),
    commit_id: 'abc123'
  }
];
