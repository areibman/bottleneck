# Release Flow Diagram

Visual representation of the automated release pipeline.

## 📊 Complete Release Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         DEVELOPER                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1. Version Bump
                              ▼
                    ┌──────────────────┐
                    │  npm run         │
                    │  version:patch   │
                    └──────────────────┘
                              │
                              │ Updates package.json
                              │ Creates git commit
                              │ Creates git tag (v0.1.6)
                              ▼
                    ┌──────────────────┐
                    │  git push        │
                    │  origin --tags   │
                    └──────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                      GITHUB ACTIONS                              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ 2. Workflow Triggered
                              ▼
                    ┌──────────────────┐
                    │  Tag Detected    │
                    │  v*.*.*          │
                    └──────────────────┘
                              │
                    ┌─────────┴────────┐
                    │                  │
                    ▼                  ▼
        ┌────────────────────┐  ┌────────────────┐
        │  Parse Version     │  │  Generate      │
        │  Check Pre-release │  │  Changelog     │
        └────────────────────┘  └────────────────┘
                    │                  │
                    └─────────┬────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Create Draft    │
                    │  GitHub Release  │
                    └──────────────────┘
                              │
                              │ 3. Matrix Build
                              ▼
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│   WINDOWS    │      │    MACOS     │     │    LINUX     │
│ windows-     │      │  macos-      │     │  ubuntu-     │
│ latest       │      │  latest      │     │  latest      │
└──────────────┘      └──────────────┘     └──────────────┘
        │                     │                     │
        │ 4. Install Deps     │                     │
        ├─────────────────────┼─────────────────────┤
        │     npm ci           │                     │
        │                     │                     │
        │ 5. Build App        │                     │
        ├─────────────────────┼─────────────────────┤
        │  npm run build      │                     │
        │                     │                     │
        │ 6. Package          │                     │
        ├─────────────────────┼─────────────────────┤
        │ electron-builder    │                     │
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│  .exe        │      │  .dmg        │     │  .AppImage   │
│  .msi        │      │  .zip        │     │  .deb        │
│  .zip        │      │  (Universal) │     │  .rpm        │
│              │      │              │     │  .snap       │
│              │      │              │     │  .tar.gz     │
└──────────────┘      └──────────────┘     └──────────────┘
        │                     │                     │
        │ 7. Checksums        │                     │
        ├─────────────────────┼─────────────────────┤
        │ SHA256              │                     │
        │                     │                     │
        │ 8. Upload Assets    │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  All Assets      │
                    │  Uploaded to     │
                    │  Draft Release   │
                    └──────────────────┘
                              │
                              │ 9. Finalize
                              ▼
                    ┌──────────────────┐
                    │  Publish         │
                    │  Release         │
                    └──────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    GITHUB RELEASES                               │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│   Download   │      │   Download   │     │   Download   │
│   Windows    │      │    macOS     │     │    Linux     │
│   Binaries   │      │   Binaries   │     │   Binaries   │
└──────────────┘      └──────────────┘     └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                       END USERS                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 🔄 Auto-Update Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER'S INSTALLED APP                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ App Starts
                              ▼
                    ┌──────────────────┐
                    │  Wait 5 seconds  │
                    │  (Allow startup) │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Check GitHub    │
                    │  Releases API    │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌────────────────────┐  ┌────────────────┐
        │  Update Available  │  │  Up to Date    │
        │  (Newer version)   │  │  (Latest)      │
        └────────────────────┘  └────────────────┘
                    │                   │
                    │                   │ Schedule next check
                    │                   │ (in 6 hours)
                    │                   └───────┐
                    ▼                           │
        ┌────────────────────┐                 │
        │  Show Dialog:      │                 │
        │  "Update           │                 │
        │   Available!"      │                 │
        │  [Download][Later] │                 │
        └────────────────────┘                 │
                    │                           │
        ┌───────────┴────────────┐             │
        │                        │             │
        ▼                        ▼             │
┌─────────────┐        ┌─────────────┐        │
│  Download   │        │  Dismiss    │        │
│  Clicked    │        │  (Later)    │        │
└─────────────┘        └─────────────┘        │
        │                        │             │
        │                        └─────────────┤
        │                                      │
        ▼                                      │
┌─────────────┐                               │
│  Download   │                               │
│  Update     │                               │
│  (Background)│                              │
└─────────────┘                               │
        │                                      │
        │ Show progress bar                   │
        ▼                                      │
┌─────────────┐                               │
│  Progress:  │                               │
│  ████░░░░░  │                               │
│  45%        │                               │
└─────────────┘                               │
        │                                      │
        │ Download complete                   │
        ▼                                      │
┌─────────────┐                               │
│  Show Dialog│                               │
│  "Ready to  │                               │
│   Install!" │                               │
│[Restart][Later]│                            │
└─────────────┘                               │
        │                                      │
┌───────┴────────────┐                        │
│                    │                        │
▼                    ▼                        │
┌─────────────┐  ┌─────────────┐            │
│  Restart    │  │  Later      │            │
│  Clicked    │  │  (Deferred) │            │
└─────────────┘  └─────────────┘            │
        │                    │                │
        │                    └────────────────┤
        ▼                                     │
┌─────────────┐                              │
│  Quit &     │                              │
│  Install    │                              │
└─────────────┘                              │
        │                                     │
        ▼                                     │
┌─────────────┐                              │
│  App        │                              │
│  Restarts   │                              │
│  (New Ver)  │                              │
└─────────────┘                              │
        │                                     │
        └─────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  User now has    │
              │  latest version  │
              └──────────────────┘
```

## 🎯 Version Bump Flow

```
┌──────────────────────────────────────────┐
│          npm run version:patch           │
└──────────────────────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  scripts/              │
        │  version-bump.js       │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Read package.json     │
        │  Current: 0.1.5        │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Parse version         │
        │  {major: 0,            │
        │   minor: 1,            │
        │   patch: 5}            │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Increment patch       │
        │  {major: 0,            │
        │   minor: 1,            │
        │   patch: 6}            │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Format: 0.1.6         │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Write package.json    │
        │  version: "0.1.6"      │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  git add package.json  │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  git commit -m         │
        │  "chore: bump v0.1.6"  │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  git tag -a v0.1.6     │
        │  -m "Release v0.1.6"   │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Display instructions: │
        │  git push origin main  │
        │  git push origin v0.1.6│
        └────────────────────────┘
```

## 🏗️ Build Process Details

```
┌──────────────────────────────────────────┐
│        electron-builder --mac            │
└──────────────────────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Read electron-        │
        │  builder.yml           │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Bundle application:   │
        │  - dist/main/          │
        │  - dist/preload/       │
        │  - dist/renderer/      │
        │  - node_modules/       │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Create .app bundle    │
        │  (macOS)               │
        └────────────────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐
│  Create DMG     │    │  Create ZIP     │
│  - Universal    │    │  - Universal    │
│  - x64          │    │  - x64          │
│  - arm64        │    │  - arm64        │
└─────────────────┘    └─────────────────┘
        │                        │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Generate checksums    │
        │  SHA256                │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Files in release/:    │
        │  - .dmg files          │
        │  - .zip files          │
        │  - checksums.txt       │
        └────────────────────────┘
```

## 🌐 Channel Flow

```
                ┌─────────────┐
                │   MAIN      │
                │   BRANCH    │
                └─────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   v1.0.0    │ │  v1.1.0     │ │  v1.1.0     │
│   Stable    │ │  -alpha.1   │ │  -beta.1    │
└─────────────┘ └─────────────┘ └─────────────┘
        │              │              │
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   STABLE    │ │   ALPHA     │ │    BETA     │
│   CHANNEL   │ │   CHANNEL   │ │   CHANNEL   │
└─────────────┘ └─────────────┘ └─────────────┘
        │              │              │
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Production  │ │  Internal   │ │   Testing   │
│    Users    │ │   Testing   │ │    Users    │
└─────────────┘ └─────────────┘ └─────────────┘
```

## 📈 Timeline Example

```
Day 1: Development
├── Feature work
├── Bug fixes
└── Testing

Day 2: Alpha Release
├── npm run version:alpha → v0.2.0-alpha.1
├── git push origin --tags
├── GitHub Actions builds (~15 min)
└── Internal testing begins

Day 5: Beta Release
├── Fixes from alpha testing
├── npm run version:beta → v0.2.0-beta.1
├── git push origin --tags
└── Beta testers notified

Day 10: Stable Release
├── All tests passed
├── npm run version:minor → v0.2.0
├── git push origin --tags
├── Release published
└── All users auto-update
```

## 🔧 Configuration Flow

```
Developer Changes
        │
        ▼
┌────────────────────┐
│  package.json      │
│  build: {}         │
└────────────────────┘
        │
        ▼
┌────────────────────┐
│  electron-         │
│  builder.yml       │
└────────────────────┘
        │
        ▼
┌────────────────────┐
│  electron-builder  │
│  reads config      │
└────────────────────┘
        │
        ▼
┌────────────────────┐
│  Builds for each   │
│  platform/target   │
└────────────────────┘
```

---

**Legend:**
- `│` Flow continues
- `▼` Next step
- `┌─┐` Process/Action
- `├──┤` Parallel processes
- `└──┘` End of process

**Next**: Follow [RELEASE_QUICKSTART.md](../RELEASE_QUICKSTART.md) to start releasing!
