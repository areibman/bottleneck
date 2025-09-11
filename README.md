# Bottleneck

A native-feeling Electron app for fast, reliable GitHub pull request review and branch management.

## Features

- **Fast PR Review**: Near-instant navigation, diff rendering, and branch checkout
- **Power Workflows**: Bulk actions, rich filtering, prefix-based grouping of PRs
- **Monaco Editor**: High-performance diff viewing with syntax highlighting
- **GitHub Integration**: Full GitHub API integration with OAuth authentication
- **Local Caching**: SQLite database for offline access and performance
- **Branch Management**: One-click checkout, create, and delete branches

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Package the app:
```bash
npm run dist
```

## Architecture

### Main Process
- Electron main process handling window lifecycle
- GitHub API integration with OAuth authentication
- SQLite database for local caching
- Git operations via NodeGit

### Renderer Process
- React/TypeScript UI with modern components
- Monaco Editor for diff viewing
- Zustand for state management
- GitHub API communication via IPC

### Key Components

- **Sidebar**: Repository and PR navigation with filtering
- **Main Pane**: PR review interface with conversation and files tabs
- **Right Panel**: Checks, participants, and labels
- **Diff Viewer**: Monaco-based code diff viewer with comments

## Configuration

The app requires a GitHub OAuth app for authentication. Update the client ID in `src/main/services/GitHubService.ts` with your OAuth app credentials.

## License

MIT