# Bottleneck

A fast, native-feeling Electron app for GitHub pull request review and branch management.

## Features

- **Lightning Fast**: Near-instant navigation, diff rendering, and branch checkout
- **Power Workflows**: Bulk actions, rich filtering, prefix-based grouping of PRs
- **Native Performance**: Built with Electron and optimized for handling large diffs
- **Smart Grouping**: Automatically groups related PRs by prefix patterns
- **Monaco Editor**: Industry-standard code editor for reviewing diffs
- **Offline Support**: Local caching with SQLite for offline access
- **GitHub Integration**: Full GitHub API integration with OAuth authentication

## Key Capabilities

### PR Management
- View and manage pull requests across multiple repositories
- Filter by state (open, closed, merged, draft), author, labels, and more
- Bulk actions: merge, close, label, request reviews
- Automatic grouping of related PRs (e.g., `feature/*`, `fix/*`)

### Code Review
- Side-by-side and unified diff views
- Inline commenting with thread support
- Review workflows (approve, request changes, comment)
- Syntax highlighting for all major languages
- Fast rendering of large diffs (1000+ files)

### Branch Management
- Local and remote branch management
- One-click checkout and branch creation
- Create PRs directly from branches
- View ahead/behind status

## Installation

### Prerequisites
- Node.js 18+ and npm
- Git installed locally
- GitHub account

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bottleneck.git
cd bottleneck
```

2. Install dependencies:
```bash
npm install
```

3. Set up GitHub OAuth (optional for development):
   - Create a GitHub OAuth App at https://github.com/settings/developers
   - Set the callback URL to `http://localhost:3000/callback`
   - Copy your Client ID and Client Secret
   - Create a `.env` file:
   ```
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

## Development

Run the app in development mode:

```bash
npm run dev
```

This will:
- Start the webpack dev server for the renderer process
- Watch and compile the main process
- Launch Electron with hot-reload enabled

## Building

Build the app for production:

```bash
npm run build
```

Create distributable packages:

```bash
npm run dist
```

This will create:
- macOS: `.dmg` file
- Windows: `.exe` installer
- Linux: `.AppImage`

## Project Structure

```
bottleneck/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts      # Main entry point
│   │   ├── auth.ts      # GitHub OAuth authentication
│   │   ├── database.ts  # SQLite database management
│   │   ├── github-api.ts # GitHub API wrapper
│   │   └── git.ts       # Local git operations
│   ├── renderer/        # React app (renderer process)
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── store/       # Zustand state management
│   │   ├── hooks/       # Custom React hooks
│   │   └── styles/      # Global styles
│   └── shared/          # Shared types and utilities
├── dist/                # Compiled output
├── dist-app/            # Packaged applications
└── package.json
```

## Technologies

- **Electron**: Cross-platform desktop app framework
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Monaco Editor**: VS Code's editor for diff viewing
- **Zustand**: State management
- **React Query**: Data fetching and caching
- **Tailwind CSS**: Utility-first CSS framework
- **SQLite**: Local database for caching
- **Octokit**: GitHub API client

## Performance Targets

- PR list render: <300ms from cache, <1.5s on cold fetch
- First file diff paint: <150ms for typical files
- Handle PRs with 1000+ files / 50k+ changed lines
- 60 FPS scrolling in all views

## Keyboard Shortcuts

- `⌘K` - Open command palette
- `⌘P` - Quick file search
- `⌘⇧P` - Quick PR search
- `⌘R` - Refresh current view
- `⌘1-9` - Switch between tabs
- `Space` - Toggle file viewed status
- `Enter` - Open selected PR/file

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issue tracker.