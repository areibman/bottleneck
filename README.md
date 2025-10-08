# Bottleneck

Superhuman for Code Review. 
<img width="1504" height="842" alt="Screenshot 2025-10-01 at 3 17 02 PM" src="https://github.com/user-attachments/assets/3bb4c4db-b420-436a-98b4-45799cfb5492" />

A native Electron app that reproduces the core GitHub PR experience while being dramatically faster and optimized for power-review workflows. Fast GitHub PR and branch management optimized for teams building code with AI agents like Claude Code, Cursor, Devin, and Codex.

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

1. Fork (and star) the repository:

```bash
gh repo fork areibman/bottleneck --clone
git remote add upstream https://github.com/areibman/bottleneck.git
cd bottleneck
```

To fetch updates, run
```bash
git fetch upstream
```

2. Install dependencies:

```bash
npm install
```

Important: You must use npm. Bun is known not to work.

3. Run in development mode:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
npm run dist
```

To create smaller macOS installers that only target a single CPU architecture (instead of a large universal DMG), run one of the
following commands from a macOS machine:

```bash
npm run dist:mac:x64   # Intel Macs (~140MB DMG)
npm run dist:mac:arm64 # Apple Silicon Macs (~130MB DMG)
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
- `npm run dist:mac:x64` - Create an Intel-only macOS DMG (reduces installer size)
- `npm run dist:mac:arm64` - Create an Apple Silicon-only macOS DMG (reduces installer size)
- `npm run electron` - Run the built app

### React DevTools Profiler

If the React DevTools Profiler tab is missing inside Electron DevTools, walk through the following steps:

1. **Update the installer call** – In `src/main/index.ts` make sure the React DevTools installation includes `allowFileAccess` (and optionally `forceDownload` to refresh stale caches):

   ```ts
   await installExtension(REACT_DEVELOPER_TOOLS, {
     loadExtensionOptions: { allowFileAccess: true },
     forceDownload: true,
   });
   ```

2. **Clear the cached extension** – Remove the `fmkadmapgofadopljbjfkapdkoienihi` folder so Electron downloads the updated bundle on the next run.

   - macOS: `~/Library/Application Support/Electron/extensions/`
   - Windows: `%APPDATA%\Electron\extensions\`
   - Linux: `~/.config/Electron/extensions/`

   Delete only the React DevTools folder (keep other extensions if you rely on them).

3. **Restart the dev environment** – Run `npm run dev`, open the window, and press `Cmd/Ctrl + Option + I` to open DevTools. You should now see both **⚛️ Components** and **⚛️ Profiler** tabs.

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
