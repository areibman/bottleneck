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
    comments: 5,
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
    comments: 12,
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
    comments: 2,
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
    comments: 8,
    created_at: new Date(Date.now() - 604800000).toISOString(),
    updated_at: new Date(Date.now() - 345600000).toISOString(),
    closed_at: new Date(Date.now() - 345600000).toISOString(),
    merged_at: new Date(Date.now() - 345600000).toISOString()
  },
  // Add more mock PRs with prefix patterns for grouping
  {
    id: 5,
    number: 1255,
    title: 'Fix local development setup issues',
    body: 'AI-generated fix for local dev environment.',
    state: 'open' as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: 'cursor/fix-local-dev-1',
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
    comments: 3,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    closed_at: null,
    merged_at: null
  },
  {
    id: 6,
    number: 1254,
    title: 'Fix local development environment configuration',
    body: 'AI-generated fix for dev config issues.',
    state: 'open' as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: 'cursor/fix-local-dev-2',
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
    comments: 0,
    created_at: new Date(Date.now() - 5400000).toISOString(),
    updated_at: new Date(Date.now() - 2700000).toISOString(),
    closed_at: null,
    merged_at: null
  },
  {
    id: 7,
    number: 1253,
    title: 'Fix local development server startup',
    body: 'AI-generated fix for server startup issues.',
    state: 'open' as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: 'cursor/fix-local-dev-3',
      sha: 'abc890',
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
    comments: 7,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    closed_at: null,
    merged_at: null
  },
  {
    id: 8,
    number: 1252,
    title: 'Update UI components for better accessibility',
    body: 'AI-generated improvements for accessibility.',
    state: 'open' as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: 'cursor/update-ui-accessibility',
      sha: 'def123',
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
      { name: 'ai-generated', color: '7057ff' },
      { name: 'accessibility', color: '0366d6' }
    ],
    comments: 4,
    created_at: new Date(Date.now() - 9000000).toISOString(),
    updated_at: new Date(Date.now() - 4500000).toISOString(),
    closed_at: null,
    merged_at: null
  },
  {
    id: 9,
    number: 1251,
    title: 'Update UI components for mobile responsiveness',
    body: 'AI-generated mobile responsive improvements.',
    state: 'open' as const,
    draft: false,
    merged: false,
    mergeable: true,
    merge_commit_sha: null,
    head: {
      ref: 'cursor/update-ui-mobile',
      sha: 'ghi456',
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
      { name: 'ai-generated', color: '7057ff' },
      { name: 'ui/ux', color: 'fbca04' }
    ],
    comments: 1,
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 5400000).toISOString(),
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

export const mockIssues = [
  {
    id: 1,
    number: 101,
    title: 'Fix login button alignment',
    body: 'The login button is misaligned on the welcome screen.',
    state: 'open',
    user: {
      login: 'design-team',
      avatar_url: 'https://avatars.githubusercontent.com/u/12346',
    },
    labels: [
      { name: 'bug', color: 'd73a4a' },
      { name: 'ui', color: 'a2eeef' },
    ],
    assignees: [
      {
        login: 'reibs',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      },
    ],
    comments: 2,
    created_at: '2023-10-07T10:00:00Z',
    updated_at: '2023-10-07T11:30:00Z',
    closed_at: null,
  },
  {
    id: 2,
    number: 102,
    title: 'Add dark mode support',
    body: 'Implement a toggle for dark mode in the settings.',
    state: 'open',
    user: {
      login: 'product-manager',
      avatar_url: 'https://avatars.githubusercontent.com/u/12347',
    },
    labels: [{ name: 'feature', color: '28a745' }],
    assignees: [],
    comments: 5,
    created_at: '2023-10-08T14:00:00Z',
    updated_at: '2023-10-08T15:20:00Z',
    closed_at: null,
  },
  {
    id: 3,
    number: 98,
    title: 'Update documentation for API v2',
    body: 'The documentation needs to be updated to reflect the new API v2 changes.',
    state: 'closed',
    user: {
      login: 'dev-rel',
      avatar_url: 'https://avatars.githubusercontent.com/u/12348',
    },
    labels: [{ name: 'documentation', color: '0075ca' }],
    assignees: [],
    comments: 1,
    created_at: '2023-09-25T18:00:00Z',
    updated_at: '2023-09-28T10:00:00Z',
    closed_at: '2023-09-28T10:00:00Z',
  },
];

