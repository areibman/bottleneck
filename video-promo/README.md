# Bottleneck Promotional Video

This is a Remotion-based promotional video for Bottleneck, showcasing its key features for easier code review in the AI codegen era.

## Features Highlighted

- ⚡ **Lightning Fast** - Near-instant navigation and diff rendering
- 🔄 **Smart Sync** - Incremental updates with intelligent caching  
- 👥 **Bulk Actions** - Multi-select PRs for batch operations
- 🏷️ **Prefix Grouping** - Auto-groups PRs by common prefixes
- 📝 **Monaco Editor** - VSCode-powered diff viewer
- ⌨️ **Keyboard First** - Comprehensive shortcuts for power users

## Performance Targets

- PR List Render: <300ms from cache
- First Diff Paint: <150ms for typical files
- Handle 1k+ files / 50k+ lines smoothly
- 60 FPS scrolling in all views

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

Start the Remotion preview:

```bash
npm run start
```

This will open a preview in your browser where you can see the video and scrub through frames.

### Rendering

Render the final video:

```bash
npm run build
```

This will create a high-quality MP4 file in the `out/` directory.

## Video Structure

The video is 30 seconds long (900 frames at 30fps) and consists of:

1. **Title Screen** (4 seconds) - Introduction with animated title
2. **Features Section** (10 seconds) - Showcase of key features with icons
3. **Performance Section** (10 seconds) - Performance metrics and targets
4. **Call to Action** (6 seconds) - Final call to action with GitHub link

## Customization

You can modify the video by editing:

- `src/BottleneckPromo.tsx` - Main video component
- `src/Root.tsx` - Video composition settings
- `remotion.config.ts` - Rendering configuration

## Technical Details

- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 30 FPS
- **Duration**: 30 seconds
- **Codec**: H.264
- **Background**: Gradient backgrounds with glassmorphism effects
- **Animations**: Spring-based animations with smooth transitions

## Dependencies

- Remotion 4.0+ for video rendering
- React 18+ for component structure
- @remotion/transitions for smooth transitions
- TypeScript for type safety