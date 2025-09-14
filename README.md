# Bottleneck

Fast GitHub PR review and branch management - A native Electron app that reproduces the core GitHub PR experience while being dramatically faster and optimized for power-review workflows.

## Installation

Official builds are distributed via GitHub Releases. Download the latest for your platform:

- Windows: `.exe` (NSIS installer), `.msi`, portable `.zip`
- macOS: `.dmg` and `.zip` (Universal for Intel and Apple Silicon)
- Linux: `.AppImage`, `.deb`, `.rpm`, `.snap`, `.tar.gz`

Checksums (SHA256) are provided with each release.

## Updates

The app integrates with an auto-updater. Stable releases update from the latest published GitHub Release. Pre-releases (beta) will receive beta updates when running a beta version.

To manually check for updates:

1. Open the app
2. Go to Settings → Updates → Check for updates

If an update is downloaded, it will be installed on quit.

## System Requirements

- Windows 10 or later (x64)
- macOS 12+ (Universal)
- Linux glibc-based distro (x64); for `.deb` Ubuntu 20.04+, for `.rpm` Fedora 35+

## Troubleshooting

- If launch fails on Linux, ensure the AppImage is executable: `chmod +x Bottleneck-*.AppImage`
- On macOS, if blocked by Gatekeeper, right-click the app and choose Open the first time
- Corporate proxies may block update checks; configure system proxy settings

## Release Notes

Release notes are auto-generated from merged PRs and conventional commits. See each release on GitHub for details.

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
