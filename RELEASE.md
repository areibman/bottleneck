# Release Management Guide

This guide covers the automated release and distribution system for Bottleneck.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Version Management](#version-management)
4. [Creating a Release](#creating-a-release)
5. [GitHub Actions Workflow](#github-actions-workflow)
6. [Auto-Update System](#auto-update-system)
7. [Code Signing](#code-signing)
8. [Troubleshooting](#troubleshooting)

## Overview

Bottleneck uses an automated release pipeline that:

- Builds applications for Windows, macOS, and Linux
- Creates GitHub Releases with downloadable binaries
- Generates checksums for security verification
- Supports semantic versioning with pre-release channels
- Provides automatic updates to users

## Prerequisites

### Required Repository Secrets

No additional secrets are required for basic releases! The workflow uses the built-in `GITHUB_TOKEN`.

### Optional: Code Signing (Recommended for Production)

For production releases, you should set up code signing:

#### macOS Code Signing

1. Export your Apple Developer certificate and provisioning profile
2. Add these secrets to your repository:
   - `CSC_LINK`: Base64-encoded .p12 certificate
   - `CSC_KEY_PASSWORD`: Password for the certificate
   - `APPLE_ID`: Your Apple ID email
   - `APPLE_ID_PASSWORD`: App-specific password
   - `APPLE_TEAM_ID`: Your Apple Developer Team ID

#### Windows Code Signing

1. Obtain a code signing certificate
2. Add these secrets:
   - `CSC_LINK`: Base64-encoded .pfx certificate
   - `CSC_KEY_PASSWORD`: Password for the certificate

## Version Management

Bottleneck follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Incompatible API changes
- **MINOR** version: New functionality (backwards compatible)
- **PATCH** version: Bug fixes (backwards compatible)
- **Pre-release**: Alpha or Beta versions

### Version Bump Commands

```bash
# Patch release (bug fixes): 0.1.5 → 0.1.6
npm run version:patch

# Minor release (new features): 0.1.5 → 0.2.0
npm run version:minor

# Major release (breaking changes): 0.1.5 → 1.0.0
npm run version:major
```

### Manual Version Bumping

```bash
# Using the version-bump script directly
node scripts/version-bump.js patch
node scripts/version-bump.js minor
node scripts/version-bump.js major
node scripts/version-bump.js beta   # Creates 0.1.6-beta.1
node scripts/version-bump.js alpha  # Creates 0.1.6-alpha.1
```

The script will:
1. Update `package.json` with the new version
2. Create a git commit with the version bump
3. Create a git tag (e.g., `v0.1.6`)
4. Display instructions for pushing

## Creating a Release

### Method 1: Interactive Release Script (Recommended)

```bash
node scripts/release.js
```

This interactive script will guide you through:
1. Checking for uncommitted changes
2. Selecting the release type
3. Bumping the version
4. Optionally pushing to GitHub

### Method 2: Manual Process

```bash
# 1. Bump version
npm run version:patch  # or minor/major

# 2. Push commits and tags
git push origin main
git push origin v0.1.6  # Replace with your version

# Or push both at once
git push origin main --tags
```

### Method 3: GitHub UI

1. Go to your repository on GitHub
2. Click "Releases" → "Draft a new release"
3. Create a new tag (e.g., `v0.1.6`)
4. Fill in release details
5. Click "Publish release"

## GitHub Actions Workflow

The release workflow (`.github/workflows/release.yml`) automatically triggers when you push a version tag.

### Workflow Steps

1. **Create Release**: Creates a draft GitHub Release with changelog
2. **Build Matrix**: Builds for Windows, macOS, and Linux in parallel
3. **Generate Checksums**: Creates SHA256 checksums for all binaries
4. **Upload Assets**: Uploads all binaries to the GitHub Release
5. **Finalize Release**: Publishes the draft release

### Supported Platforms and Formats

#### Windows
- `.exe` - NSIS installer (recommended)
- `.msi` - Windows Installer
- `.zip` - Portable version

#### macOS
- `.dmg` - Disk image (recommended)
- `.zip` - Compressed application
- Universal binary (Intel + Apple Silicon)

#### Linux
- `.AppImage` - Universal Linux package (recommended)
- `.deb` - Debian/Ubuntu package
- `.rpm` - RedHat/Fedora package
- `.snap` - Snap package
- `.tar.gz` - Compressed archive

### Monitoring Releases

View build progress at:
```
https://github.com/yourusername/bottleneck/actions
```

View releases at:
```
https://github.com/yourusername/bottleneck/releases
```

## Auto-Update System

Bottleneck includes built-in automatic updates using `electron-updater`.

### How It Works

1. App checks for updates on startup (after 5 seconds)
2. Checks for updates every 6 hours
3. Notifies users when updates are available
4. Downloads updates in the background
5. Prompts to install and restart

### User Experience

When an update is available:
1. User sees a notification dialog
2. Can choose to download now or later
3. Progress bar shows download status
4. After download, prompted to restart
5. Update installs automatically on restart

### Update Channels

Support for multiple release channels:

- **Stable**: Production releases (default)
- **Beta**: Pre-release testing (tag: `v1.0.0-beta.1`)
- **Alpha**: Early testing (tag: `v1.0.0-alpha.1`)

Users can switch channels in settings:

```typescript
// In renderer process
await window.electron.invoke('updater:set-channel', 'beta');
```

### Update Configuration

Controlled in `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "releaseType": "release"
    }
  }
}
```

### Manual Update Checks

Users can manually check for updates:

```typescript
// Check for updates
const result = await window.electron.invoke('updater:check-for-updates');

// Download update
await window.electron.invoke('updater:download-update');

// Install and restart
await window.electron.invoke('updater:quit-and-install');
```

### Update Events

Listen for update status in renderer:

```typescript
window.electron.on('update-status', (event, data) => {
  switch (data.status) {
    case 'checking-for-update':
      console.log('Checking for updates...');
      break;
    case 'update-available':
      console.log('Update available:', data.version);
      break;
    case 'update-not-available':
      console.log('No updates available');
      break;
    case 'download-progress':
      console.log('Download progress:', data.percent);
      break;
    case 'update-downloaded':
      console.log('Update downloaded, ready to install');
      break;
    case 'update-error':
      console.error('Update error:', data.error);
      break;
  }
});
```

## Code Signing

Code signing ensures users can trust your application.

### Why Code Sign?

- **Windows**: Prevents SmartScreen warnings
- **macOS**: Required for Gatekeeper and notarization
- **Trust**: Users can verify the application authenticity

### macOS Setup

1. **Get Apple Developer Account** ($99/year)
2. **Create Certificates** in Xcode or developer portal
3. **Export Certificate**:
   ```bash
   # Export .p12 file from Keychain Access
   # Convert to base64
   base64 -i certificate.p12 | pbcopy
   ```
4. **Add to GitHub Secrets**:
   - `CSC_LINK`: Paste the base64 certificate
   - `CSC_KEY_PASSWORD`: Certificate password
   - `APPLE_ID`: Your Apple ID
   - `APPLE_ID_PASSWORD`: App-specific password
   - `APPLE_TEAM_ID`: Team ID from developer portal

5. **Update workflow**:
   ```yaml
   - name: Build Electron app (macOS)
     env:
       CSC_LINK: ${{ secrets.CSC_LINK }}
       CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
       APPLE_ID: ${{ secrets.APPLE_ID }}
       APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
       APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
   ```

6. **Enable notarization** in `package.json`:
   ```json
   {
     "mac": {
       "notarize": {
         "teamId": "YOUR_TEAM_ID"
       }
     }
   }
   ```

### Windows Setup

1. **Get Code Signing Certificate** (from Digicert, Sectigo, etc.)
2. **Export as .pfx file**
3. **Convert to base64**:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pfx")) | Set-Clipboard
   ```
4. **Add to GitHub Secrets**:
   - `CSC_LINK`: Paste the base64 certificate
   - `CSC_KEY_PASSWORD`: Certificate password

5. **Update workflow**:
   ```yaml
   - name: Build Electron app (Windows)
     env:
       CSC_LINK: ${{ secrets.CSC_LINK }}
       CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
   ```

### Testing Without Code Signing

For development/testing, code signing is optional. The workflow is configured to work without certificates.

## Troubleshooting

### Build Fails on GitHub Actions

**Problem**: Build fails with "Module not found" errors

**Solution**: 
```bash
# Ensure all dependencies are in package.json
npm install --save-dev electron-builder electron-updater
```

### Updates Not Working

**Problem**: App doesn't detect updates

**Solutions**:
1. Ensure you've published a release (not draft)
2. Check `package.json` has correct repository URL
3. Verify `publish` configuration in `package.json`
4. Updates don't work in development mode

### Code Signing Errors

**Problem**: "Certificate not found" or "Invalid password"

**Solutions**:
1. Verify secrets are correctly base64 encoded
2. Check certificate isn't expired
3. Ensure password is correct
4. For macOS, verify Team ID matches

### Release Assets Missing

**Problem**: Some platform builds are missing

**Solutions**:
1. Check Actions logs for specific platform failures
2. Verify runner has necessary dependencies
3. For macOS, ensure Xcode Command Line Tools installed
4. For Linux, check system package dependencies

### Large Binary Sizes

**Problem**: Application binaries are very large

**Solutions**:
1. Enable compression in `package.json`:
   ```json
   {
     "build": {
       "compression": "maximum"
     }
   }
   ```
2. Use `asar` packaging (default)
3. Exclude unnecessary files:
   ```json
   {
     "build": {
       "files": [
         "dist/**/*",
         "!node_modules/**/{test,tests,*.md}"
       ]
     }
   }
   ```

### Auto-Update Downloads Failing

**Problem**: Updates download but fail to install

**Solutions**:
1. Check file permissions
2. Verify checksums match
3. Ensure sufficient disk space
4. Check antivirus isn't blocking

## Best Practices

### Before Releasing

1. ✅ Test thoroughly on all platforms
2. ✅ Update CHANGELOG.md
3. ✅ Update version in package.json
4. ✅ Commit all changes
5. ✅ Verify CI/CD passes
6. ✅ Create release notes

### Release Notes

Good release notes should include:

```markdown
## 🎉 New Features
- Feature description

## 🐛 Bug Fixes
- Fixed issue with...

## 🔧 Improvements
- Performance improvements

## ⚠️ Breaking Changes
- API changes (for major versions)

## 📦 Dependencies
- Updated dependency X to version Y
```

### Version Numbering

- **0.x.x**: Early development, breaking changes allowed
- **1.0.0**: First stable release
- **1.x.x**: Stable with backwards compatibility
- **x.0.0**: Major version with breaking changes

### Testing Pre-releases

```bash
# Create beta release
npm run version:beta
git push origin main --tags

# Test beta
# Then promote to stable
npm run version:patch
git push origin main --tags
```

## Additional Resources

- [Electron Builder Documentation](https://www.electron.build/)
- [electron-updater Documentation](https://www.electron.build/auto-update)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)

## Support

For issues with the release system:

1. Check the [GitHub Actions logs](https://github.com/yourusername/bottleneck/actions)
2. Review this documentation
3. Check [electron-builder issues](https://github.com/electron-userland/electron-builder/issues)
4. Open an issue in the repository

---

**Happy Releasing! 🚀**
