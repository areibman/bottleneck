# Bottleneck Setup Guide

## Quick Start

1. **Install dependencies:**

```bash
npm install
```

2. **Create GitHub OAuth App:**

   - Go to https://github.com/settings/developers
   - Click "New OAuth App"
   - Fill in:
     - Application name: Bottleneck Dev
     - Homepage URL: http://localhost:3000
     - Authorization callback URL: http://localhost:3000/callback
   - Copy the Client ID and Client Secret

3. **Configure environment:**
   Create a `.env` file in the project root:

```env
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

4. **Run in development mode:**

```bash
npm run dev
```

5. **Build for production:**

```bash
npm run build
npm run dist
```

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run dist` - Package the app for distribution
- `npm run dev:main` - Watch and compile main process only
- `npm run dev:renderer` - Start Vite dev server only
- `npm run electron` - Run the built app

## Project Structure

```
bottleneck/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts     # Main entry point
│   │   ├── database.ts  # SQLite operations
│   │   ├── auth.ts      # GitHub OAuth
│   │   ├── git.ts       # Git operations
│   │   ├── menu.ts      # Application menu
│   │   └── preload.ts   # Preload script
│   ├── renderer/        # React app
│   │   ├── components/  # UI components
│   │   ├── views/       # Page views
│   │   ├── stores/      # Zustand stores
│   │   ├── services/    # API services
│   │   ├── styles/      # CSS styles
│   │   └── utils/       # Utilities
│   └── shared/          # Shared types/constants
├── dist/                # Compiled output
├── release/             # Packaged apps
└── scripts/             # Build scripts
```

## Features Implemented

### Core Features

- ✅ GitHub OAuth authentication
- ✅ SQLite database for local caching
- ✅ PR list view with filtering and search
- ✅ PR detail view with conversation and files tabs
- ✅ Monaco-based diff viewer
- ✅ Branch management view
- ✅ Settings page
- ✅ Keyboard shortcuts
- ✅ Bulk actions for PRs
- ✅ Prefix-based PR grouping

### UI Components

- ✅ Sidebar navigation
- ✅ Top bar with sync status
- ✅ Right panel for PR details
- ✅ Command palette
- ✅ Dark theme with Tailwind CSS

### Performance Optimizations

- ✅ Virtualized lists
- ✅ Incremental data syncing
- ✅ Local caching with SQLite
- ✅ React Query for API state management
- ✅ Zustand for UI state management

## Known Limitations (v0.1.0)

1. GitHub OAuth device flow is used (no backend required)
2. Some advanced Git operations may require command-line tools
3. Large repositories may require initial sync time
4. Monaco editor decorations for inline comments are simplified

## Troubleshooting

### Build Issues

- If you encounter SQLite build errors, ensure you have build tools installed:
  - macOS: Install Xcode Command Line Tools
  - Windows: Install windows-build-tools
  - Linux: Install build-essential

### Authentication Issues

- Ensure your GitHub OAuth app is properly configured
- Check that the callback URL matches exactly
- Verify the required scopes are granted

### Performance Issues

- Clear the cache in Settings > Advanced > Clear Cache
- Reduce sync frequency in Settings > General
- Close unused PR tabs

## Contributing

See README.md for contribution guidelines.
