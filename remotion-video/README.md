# Bottleneck Promotional Video

This is a Remotion-based promotional video for Bottleneck, a GitHub PR review tool designed for the AI codegen era.

## Video Structure

The video is a 15-second promotional piece showcasing:

1. **Title Sequence (0-3s)**: Animated Bottleneck logo and tagline
2. **Feature Showcase (2-8s)**: Four key features with animated cards
3. **AI Era Section (7-12s)**: Highlights AI-specific capabilities
4. **Call to Action (11-15s)**: Final message with download button

## Features Highlighted

- ⚡ Lightning Fast PR Reviews
- 🌳 Smart Branch Management  
- 💻 Integrated Terminal
- 🔗 GitHub Integration
- 🤖 AI Codegen Support

## Development

### Install Dependencies
```bash
npm install
```

### Start Remotion Studio
```bash
npm start
```

This will open the Remotion Studio where you can preview and edit the video in real-time.

### Render Video
```bash
npm run build
```

This will render the video to `out/video.mp4`.

### Render with Custom Settings
```bash
# Render at different quality
npx remotion render src/index.tsx BottleneckPromo out/video.mp4 --jpeg-quality 95

# Render specific frame range
npx remotion render src/index.tsx BottleneckPromo out/video.mp4 --frames 0-90

# Render as GIF
npx remotion render src/index.tsx BottleneckPromo out/video.gif --codec gif
```

## Customization

### Colors
The video uses a dark theme with blue and purple accents matching Bottleneck's branding:
- Primary: #3b82f6 (blue)
- Secondary: #8b5cf6 (purple)
- Success: #10b981 (green)
- Background: Dark gradient (#0f172a to #334155)

### Timing
Each section has overlapping transitions for smooth flow. Adjust the `from` and `durationInFrames` props in `BottleneckPromo.tsx` to change timing.

### Content
- Edit feature cards in `components/FeatureShowcase.tsx`
- Modify AI benefits in `components/AIEraSection.tsx`
- Update CTA text in `components/CallToAction.tsx`

## Tech Stack

- **Remotion**: React-based video creation framework
- **React**: Component library
- **TypeScript**: Type safety
- **@remotion/transitions**: Smooth transitions between scenes
- **@remotion/gif**: GIF support (if needed)

## Video Specs

- Resolution: 1920x1080 (Full HD)
- Frame Rate: 30 FPS
- Duration: 15 seconds (450 frames)
- Format: MP4 (H.264)

## License

MIT