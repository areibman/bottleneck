# Bottleneck

Fast GitHub PR review and branch management - A native Electron app that reproduces the core GitHub PR experience while being dramatically faster and optimized for power-review workflows.

## Features

- ⚡ **Lightning Fast** - Near-instant navigation, diff rendering, and branch checkout
- 🔄 **Smart Sync** - Incremental updates via GitHub GraphQL with intelligent caching
- 👥 **Bulk Actions** - Multi-select PRs for batch operations (merge, close, label, etc.)
- 🏷️ **Prefix Grouping** - Automatically groups PRs by common prefixes (feat/, fix/, etc.)
- 📝 **Monaco Editor** - VSCode-powered diff viewer with syntax highlighting
- 💾 **Offline Support** - SQLite-based local cache for offline access
- ⌨️ **Keyboard First** - Comprehensive keyboard shortcuts for power users

## Tech Stack

- **Electron** - Cross-platform desktop app
- **React 18** - UI framework with TypeScript
- **Monaco Editor** - Code diff viewing
- **SQLite** - Local data persistence
- **GitHub API** - PR and repository management
- **Tailwind CSS** - Styling
- **Zustand** - State management

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- GitHub account with appropriate permissions

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bottleneck.git
cd bottleneck
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm run dist
```

## Development
## Distribution & Updates

### Releases
- Push a tag like `v1.2.3` to trigger the release workflow. Draft releases are created with assets for Windows (.exe, .msi, .zip), macOS (.dmg, .zip, universal), and Linux (.AppImage, .deb, .rpm, .snap, .tar.gz). SHA256 checksums are attached.
- Beta releases are supported using prerelease tags (e.g., `v1.2.3-beta.1`).

### Auto-Update
- The app uses electron-updater for differential updates where supported.
- Channels: `latest` (default) and `beta` (prereleases). The channel is inferred from the tag.
- The app checks for updates on startup and from Help → Check for Updates.

### Code Signing & Notarization
- macOS builds are signed and notarized using `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, and `MAC_CERT_*` secrets.
- Windows builds are signed via `WIN_CSC_*` secrets.

### System Requirements
- Windows 10+
- macOS 12+
- Linux: modern x64 distro (AppImage provided). Packages for Debian/Ubuntu (.deb) and Fedora/RHEL (.rpm) are included.

### Troubleshooting
- Update fails to download: ensure network allows GitHub Releases CDN.
- macOS cannot open app: right-click → Open, or verify signature and quarantine cleared post-notarization.
- Renderer fails to start after update: use rollback by reinstalling a prior asset from Releases.

### Release Notes Template
```
## What's Changed

- Feature: ... (#PR)
- Fix: ... (#PR)
- Perf: ... (#PR)

## Checksums
See attached sha256sums.txt.
```

### Project Structure

```
bottleneck/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts     # Main entry point
│   │   ├── database.ts  # SQLite operations
│   │   ├── auth.ts      # GitHub OAuth
│   │   └── git.ts       # Git operations
│   ├── renderer/        # React app
│   │   ├── components/  # UI components
│   │   ├── views/       # Page views
│   │   ├── stores/      # Zustand stores
│   │   ├── services/    # API services
│   │   └── utils/       # Utilities
│   └── shared/          # Shared types/constants
├── dist/                # Compiled output
└── release/             # Packaged apps
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run dist` - Package the app for distribution
- `npm run electron` - Run the built app

## Keyboard Shortcuts

### Global
- `Cmd/Ctrl + B` - Toggle sidebar
- `Cmd/Ctrl + Shift + B` - Toggle right panel
- `Cmd/Ctrl + Shift + P` - Command palette
- `Cmd/Ctrl + /` - Show keyboard shortcuts

### Navigation
- `Cmd/Ctrl + P` - Go to PR
- `Cmd/Ctrl + T` - Go to file
- `Cmd/Ctrl + [` - Previous PR
- `Cmd/Ctrl + ]` - Next PR
- `Alt + Up` - Previous file
- `Alt + Down` - Next file

### Review
- `Cmd/Ctrl + Enter` - Submit comment
- `Cmd/Ctrl + Shift + A` - Approve PR
- `Cmd/Ctrl + Shift + R` - Request changes
- `V` - Mark file as viewed
- `D` - Toggle diff view
- `W` - Toggle whitespace

## Performance

### Targets
- PR list render: <300ms from cache, <1.5s cold fetch
- First diff paint: <150ms for typical files
- Handle 1k+ files / 50k+ changed lines smoothly
- 60 FPS scrolling in all views

### Optimizations
- Virtualized lists and diff rendering
- Web workers for diff computation
- Incremental syntax highlighting
- Smart caching with ETags
- Concurrent API requests with rate limiting

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Built with Electron, React, and Monaco Editor
- Inspired by the need for faster PR reviews
- Optimized for teams using agent-based development
