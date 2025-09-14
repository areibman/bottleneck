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
- 🔄 **Auto-Updates** - Seamless automatic updates with background downloads
- 📦 **Multi-Platform** - Native installers for Windows, macOS, and Linux

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

#### For Users

Download the latest release from the [GitHub Releases page](https://github.com/your-github-username/bottleneck/releases).

**Windows**: Download and run `Bottleneck-{version}-win-x64.exe`  
**macOS**: Download and open `Bottleneck-{version}-mac-universal.dmg`  
**Linux**: Download and run `Bottleneck-{version}-linux-x64.AppImage`

See [Installation Guide](./docs/INSTALLATION.md) for detailed instructions.

#### For Developers

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

#### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run electron` - Run the built app

#### Distribution
- `npm run dist` - Package the app for distribution
- `npm run dist:win` - Build Windows packages only
- `npm run dist:mac` - Build macOS packages only
- `npm run dist:linux` - Build Linux packages only
- `npm run release` - Build and publish to GitHub Releases

#### Release Management
- `npm run release:patch` - Create patch release (bug fixes)
- `npm run release:minor` - Create minor release (new features)
- `npm run release:major` - Create major release (breaking changes)
- `npm run release:dry` - Preview release changes without publishing

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

## Documentation

- [Installation Guide](./docs/INSTALLATION.md) - Platform-specific installation instructions
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Release Management](./docs/RELEASES.md) - Release process and versioning

## Releases

Bottleneck uses automated releases with semantic versioning:

- **Stable releases** are available on the [GitHub Releases page](https://github.com/your-github-username/bottleneck/releases)
- **Auto-updates** keep your installation current automatically
- **Multiple formats** available for each platform (installer, portable, package manager)
- **Code signing** ensures authenticity and security
- **Checksums** provided for verification

### Download Options

| Platform | Recommended | Alternative Formats |
|----------|-------------|-------------------|
| Windows | `.exe` installer | `.msi`, portable `.zip` |
| macOS | `.dmg` | `.zip` |
| Linux | AppImage | `.deb`, `.rpm`, `.snap`, `.tar.gz` |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Built with Electron, React, and Monaco Editor
- Inspired by the need for faster PR reviews
- Optimized for teams using agent-based development
