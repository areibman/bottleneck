# Bottleneck Release Process

## Overview

This document describes the automated release pipeline for Bottleneck, which publishes built Electron app binaries to GitHub Releases across multiple platforms.

## Features

- 🚀 **Automated Multi-Platform Builds**: Windows, macOS, and Linux
- 📦 **Multiple Distribution Formats**: 
  - Windows: `.exe`, `.msi`, `.zip` (portable)
  - macOS: `.dmg`, `.zip`, Universal binaries (Intel + Apple Silicon)
  - Linux: `.AppImage`, `.deb`, `.rpm`, `.snap`, `.tar.gz`
- 🔐 **Code Signing**: Automated signing for Windows and macOS builds
- 🔄 **Auto-Updates**: Built-in auto-updater with differential updates
- 📝 **Release Notes**: Automatic changelog generation from commits
- 🏷️ **Version Management**: Semantic versioning with pre-release support
- ✅ **Checksums**: SHA256 checksums for all artifacts

## Quick Start

### Creating a Release

1. **Update Version & Create Release**:
   ```bash
   # For patch release (0.1.5 -> 0.1.6)
   npm run release
   
   # For minor release (0.1.5 -> 0.2.0)
   npm run release:minor
   
   # For major release (0.1.5 -> 1.0.0)
   npm run release:major
   
   # For beta release (0.1.5 -> 0.1.6-beta.0)
   npm run release:beta
   
   # For alpha release (0.1.5 -> 0.1.6-alpha.0)
   npm run release:alpha
   ```

2. **Manual Version Management**:
   ```bash
   # Check current version
   npm run version:current
   
   # Bump version manually
   npm run version:patch
   npm run version:minor
   npm run version:major
   
   # Create pre-release versions
   npm run version:alpha
   npm run version:beta
   
   # Promote pre-release to stable
   npm run version:release
   
   # Create git tag
   npm run version:tag
   ```

3. **Push to GitHub**:
   The version script will prompt to create and push git tags automatically.
   If you skip this, manually push:
   ```bash
   git push origin main
   git push origin --tags
   ```

4. **Automatic Build & Release**:
   GitHub Actions will automatically:
   - Trigger on version tags (v*)
   - Build for all platforms
   - Sign and notarize apps
   - Create GitHub Release
   - Upload all artifacts
   - Generate release notes

## GitHub Actions Workflow

### Trigger Events

The release workflow triggers on:
- Push of tags matching `v*.*.*` pattern
- Manual workflow dispatch with release type selection

### Build Matrix

| Platform | Architecture | Formats |
|----------|-------------|---------|
| Windows | x64, ia32 | .exe (NSIS), .msi, .zip (portable) |
| macOS | x64, arm64 | .dmg, .zip, Universal binary |
| Linux | x64, arm64 | .AppImage, .deb, .rpm, .snap, .tar.gz |

### Required Secrets

Configure these secrets in GitHub repository settings:

#### Windows Code Signing
- `WINDOWS_CERT_BASE64`: Base64-encoded certificate (.pfx)
- `WINDOWS_CERT_PASSWORD`: Certificate password
- `WINDOWS_CERT_SUBJECT`: Certificate subject name
- `WINDOWS_CERT_SHA1`: Certificate SHA1 thumbprint

#### macOS Code Signing & Notarization
- `APPLE_CERT_BASE64`: Base64-encoded certificate (.p12)
- `APPLE_CERT_PASSWORD`: Certificate password
- `APPLE_TEAM_ID`: Apple Developer Team ID
- `APPLE_ID`: Apple ID email
- `APPLE_ID_PASSWORD`: App-specific password

## Auto-Updater

### Configuration

The app includes electron-updater for automatic updates:

- **Update Channels**: `latest`, `beta`, `alpha`
- **Update Check Interval**: Every 60 minutes
- **Differential Updates**: Enabled for smaller downloads
- **Rollback Support**: Previous versions kept for rollback

### User Experience

1. **Automatic Checks**: Updates checked on app start and periodically
2. **User Notification**: Toast notification when update available
3. **Download Progress**: Visual progress bar during download
4. **Install Options**: 
   - Install immediately
   - Install on next restart
   - Skip version

### Testing Updates

1. **Local Testing**:
   ```bash
   # Build and test locally
   npm run dist
   
   # Test update flow with local server
   npm run dist -- --publish=never
   ```

2. **Beta Channel Testing**:
   ```bash
   # Create beta release
   npm run version:beta
   git push origin --tags
   ```

## Version Management

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH[-PRERELEASE]`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes
- **PRERELEASE**: Alpha/Beta versions

### Pre-release Workflow

1. **Alpha Release** (Internal testing):
   ```bash
   npm run version:alpha  # 0.1.5 -> 0.1.6-alpha.0
   npm run version:alpha  # 0.1.6-alpha.0 -> 0.1.6-alpha.1
   ```

2. **Beta Release** (Public testing):
   ```bash
   npm run version:beta   # 0.1.6-alpha.1 -> 0.1.6-beta.0
   npm run version:beta   # 0.1.6-beta.0 -> 0.1.6-beta.1
   ```

3. **Stable Release**:
   ```bash
   npm run version:release  # 0.1.6-beta.1 -> 0.1.6
   ```

## Build Configuration

### electron-builder.yml

The build configuration supports:
- Multi-platform targets
- Code signing
- Auto-updater
- File associations
- Protocol handlers
- Custom icons and metadata

### Platform-Specific Settings

#### Windows
- NSIS installer with options
- MSI for enterprise deployment
- Portable version (no install)
- Differential updates

#### macOS
- DMG with custom background
- Universal binary support
- Hardened runtime
- Notarization ready

#### Linux
- AppImage (universal)
- DEB (Debian/Ubuntu)
- RPM (Fedora/RHEL)
- Snap (confined)

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check Node.js version (v18+ required)
   - Clear node_modules and reinstall
   - Check native dependencies compilation

2. **Code Signing Issues**:
   - Verify certificates are valid
   - Check certificate passwords
   - Ensure proper entitlements

3. **Update Issues**:
   - Check GitHub Release is published
   - Verify update feed URL
   - Check firewall/proxy settings

### Debug Mode

Enable debug logging:
```bash
# Windows
set DEBUG=electron-builder,electron-updater
npm run dist

# macOS/Linux
DEBUG=electron-builder,electron-updater npm run dist
```

## CI/CD Pipeline

### Local Development
```bash
npm run dev           # Start development server
npm run build        # Build production assets
npm run dist         # Package for current platform
```

### GitHub Actions
- Automated on tag push
- Matrix builds for all platforms
- Artifact upload to releases
- Checksum generation

### Release Checklist

- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Commit version changes
- [ ] Create and push version tag
- [ ] Verify GitHub Actions build
- [ ] Test auto-updater
- [ ] Publish release notes

## Security Considerations

1. **Code Signing**:
   - Always sign production builds
   - Keep certificates secure
   - Rotate certificates regularly

2. **Update Security**:
   - HTTPS-only update feeds
   - Signature verification
   - Checksum validation

3. **Dependencies**:
   - Regular dependency updates
   - Security audit (`npm audit`)
   - Lock file commits

## Support

For issues or questions:
1. Check [Release Issues](https://github.com/your-org/bottleneck/issues?q=label:release)
2. Review [GitHub Actions logs](https://github.com/your-org/bottleneck/actions)
3. Contact the development team

## License

This release process is part of the Bottleneck project, licensed under MIT.