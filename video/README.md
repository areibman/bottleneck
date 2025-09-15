# Bottleneck Promotional Video

This is a Remotion-based promotional video for the Bottleneck app, showcasing its features for fast GitHub PR reviews in the AI codegen era.

## Video Structure

The video is approximately 33 seconds long and consists of 5 main scenes:

1. **Hook Scene (5s)** - Introduces the problem of slow code reviews in the AI era
2. **Intro Scene (4s)** - Presents Bottleneck as the solution
3. **Features Scene (10s)** - Showcases key features with animated cards
4. **Demo Scene (8s)** - Shows a mockup of the Bottleneck UI in action
5. **Call to Action (3s)** - Encourages viewers to get started

Smooth transitions (fade and wipe effects) connect each scene.

## Features Highlighted

- ⚡ Lightning Fast navigation and diff rendering
- 🔄 Smart Sync with intelligent caching
- 👥 Bulk Actions for batch operations
- 🏷️ Smart Grouping by PR prefixes
- ⌨️ Keyboard-first design for power users
- 💾 Offline support with SQLite caching

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the Remotion studio:
   \`\`\`bash
   npm start
   \`\`\`

3. Preview a single frame:
   \`\`\`bash
   npx remotion still src/index.ts --id=BottleneckPromo --frame=100 --output=preview.png
   \`\`\`

4. Render the full video:
   \`\`\`bash
   npx remotion render src/index.ts BottleneckPromo out/video.mp4
   \`\`\`

## Customization

The video is built with modular components in the `src/scenes/` directory:

- `HookScene.tsx` - Opening hook about AI codegen challenges
- `IntroScene.tsx` - Bottleneck logo and introduction
- `FeaturesScene.tsx` - Animated feature showcase
- `DemoScene.tsx` - UI mockup demonstration
- `CallToActionScene.tsx` - Final call to action

Each scene can be customized independently. The main composition is in `BottleneckPromo.tsx`.

## Technical Details

- **Duration**: 980 frames (32.7 seconds at 30fps)
- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 30fps
- **Transitions**: Fade and wipe effects between scenes
- **Animations**: Spring-based animations for smooth motion

## Color Scheme

The video uses a modern gradient color scheme:
- Primary: Blue gradients (#667eea, #764ba2, #1e3c72, #2a5298)
- Background: Dark blues (#0f0f23, #1a1a3e, #2a2a5e)
- Accent: Purple (#4f46e5)
- Text: White with various opacities

This creates a professional, tech-forward aesthetic that matches the Bottleneck brand.