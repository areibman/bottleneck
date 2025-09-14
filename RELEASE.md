# Bottleneck Release & Distribution Guide

## 📦 Overview

Bottleneck uses GitHub Releases for automated app distribution, providing official download links for Windows, macOS, and Linux. The release pipeline automatically builds, signs, and publishes binaries when version tags are pushed.

## 🚀 Quick Start

### Creating a Release

1. **Using the Release Script (Recommended)**
   ```bash
   npm run release
   ```
   This interactive script will guide you through:
   - Selecting release type (patch/minor/major/pre-release)
   - Entering release notes
   - Creating git tags
   - Pushing to GitHub to trigger the build

2. **Manual Release**
   ```bash
   # For patch release (1.0.0 -> 1.0.1)
   npm run release:patch

   # For minor release (1.0.0 -> 1.1.0)
   npm run release:minor

   # For major release (1.0.0 -> 2.0.0)
   npm run release:major
   ```

3. **Pre-release (Beta/Alpha)**
   ```bash
   # Manually set version
   npm version 1.0.0-beta.1
   git push origin main --tags
   ```

## 🔄 Automated Build Process

When a version tag is pushed (e.g., `v1.0.0`), GitHub Actions automatically:

1. **Builds** the application for all platforms
2. **Signs** the binaries (when certificates are configured)
3. **Generates** checksums for verification
4. **Creates** a GitHub Release with all artifacts
5. **Publishes** release notes from commits/PRs

## 🖥️ Supported Platforms

### Windows
- **Formats**: `.exe` installer, `.msi` package, `.zip` portable
- **Architectures**: x64, ARM64
- **Auto-update**: ✅ Supported
- **Code signing**: Requires certificate (see below)

### macOS
- **Formats**: `.dmg` disk image, `.zip` archive
- **Architectures**: Intel (x64), Apple Silicon (arm64), Universal
- **Auto-update**: ✅ Supported
- **Code signing**: Requires Apple Developer certificate
- **Notarization**: Automatic with credentials

### Linux
- **Formats**: `.AppImage`, `.deb`, `.rpm`, `.snap`, `.tar.gz`
- **Architectures**: x64, ARM64, ARMv7
- **Auto-update**: ✅ Supported (AppImage only)
- **Package managers**: apt, yum, snap

## 🔐 Code Signing Setup

### Windows Code Signing

1. Obtain a code signing certificate from a trusted CA
2. Add to GitHub Secrets:
   ```
   WINDOWS_CERTIFICATE        # Base64 encoded .pfx file
   WINDOWS_CERTIFICATE_PASSWORD # Certificate password
   WINDOWS_CERTIFICATE_NAME   # Certificate subject name
   ```

3. Convert certificate to base64:
   ```bash
   base64 -i certificate.pfx -o certificate.txt
   ```

### macOS Code Signing

1. Enroll in Apple Developer Program
2. Create certificates in Apple Developer Portal
3. Add to GitHub Secrets:
   ```
   MACOS_CERTIFICATE          # Base64 encoded .p12 file
   MACOS_CERTIFICATE_PASSWORD # Certificate password
   MACOS_KEYCHAIN_PASSWORD   # Temporary keychain password
   APPLE_ID                   # Apple ID for notarization
   APPLE_APP_SPECIFIC_PASSWORD # App-specific password
   APPLE_TEAM_ID             # Team ID from developer account
   ```

4. Export certificate:
   ```bash
   # From Keychain Access, export as .p12
   base64 -i certificate.p12 -o certificate.txt
   ```

## 🔄 Auto-Update Configuration

### For Users

The app automatically checks for updates:
- On startup (after 3 seconds)
- Every hour while running
- Manual check via Help menu

Update channels:
- **Stable**: Production releases
- **Beta**: Pre-release testing
- **Alpha**: Early development builds

### For Developers

Configure update behavior in Settings or via API:
```javascript
// Set update channel
window.electron.updater.setChannel('beta');

// Enable/disable auto-download
window.electron.updater.setAutoDownload(true);

// Manual update check
window.electron.updater.check(true);
```

## 📋 Installation Instructions

### Windows Installation

1. **Installer (Recommended)**
   - Download `Bottleneck-Setup-[version]-x64.exe`
   - Run installer and follow prompts
   - Auto-updates enabled by default

2. **MSI Package (Enterprise)**
   - Download `Bottleneck-[version]-x64.msi`
   - Deploy via Group Policy or SCCM
   - Silent install: `msiexec /i Bottleneck.msi /quiet`

3. **Portable Version**
   - Download `Bottleneck-[version]-win.zip`
   - Extract to desired location
   - Run `Bottleneck.exe`

### macOS Installation

1. **DMG (Recommended)**
   - Download `Bottleneck-[version]-universal.dmg`
   - Open DMG and drag to Applications
   - First run: Right-click → Open (Gatekeeper bypass)

2. **Homebrew (Coming Soon)**
   ```bash
   brew install --cask bottleneck
   ```

### Linux Installation

1. **AppImage (Universal)**
   ```bash
   chmod +x Bottleneck-[version]-x64.AppImage
   ./Bottleneck-[version]-x64.AppImage
   ```

2. **Debian/Ubuntu**
   ```bash
   sudo dpkg -i bottleneck_[version]_amd64.deb
   sudo apt-get install -f  # Install dependencies
   ```

3. **Fedora/RHEL**
   ```bash
   sudo rpm -i bottleneck-[version].x86_64.rpm
   ```

4. **Snap**
   ```bash
   sudo snap install bottleneck_[version]_amd64.snap --dangerous
   # Or from Snap Store (when published)
   sudo snap install bottleneck
   ```

## ✅ Verification

### Checksum Verification

All releases include SHA256 checksums:

**Linux/macOS:**
```bash
# Download checksums file
curl -LO https://github.com/[owner]/bottleneck/releases/download/v[version]/checksums.txt

# Verify download
sha256sum -c checksums.txt
```

**Windows (PowerShell):**
```powershell
# Calculate hash
$hash = Get-FileHash "Bottleneck-Setup.exe" -Algorithm SHA256

# Compare with published checksum
$hash.Hash -eq "PUBLISHED_HASH_HERE"
```

### Signature Verification

**macOS:**
```bash
codesign -dv --verbose=4 /Applications/Bottleneck.app
```

**Windows:**
```powershell
Get-AuthenticodeSignature "Bottleneck-Setup.exe"
```

## 🐛 Troubleshooting

### Update Issues

1. **Updates not detected**
   - Check internet connection
   - Verify update channel settings
   - Check firewall/proxy settings

2. **Update fails to install**
   - Ensure write permissions
   - Close all app instances
   - Download and install manually

### Installation Issues

1. **macOS: "App is damaged"**
   ```bash
   xattr -cr /Applications/Bottleneck.app
   ```

2. **Linux: Missing dependencies**
   ```bash
   # AppImage
   sudo apt install libfuse2  # Ubuntu 22.04+
   
   # Fix electron dependencies
   sudo apt install libnss3 libatk-bridge2.0-0
   ```

3. **Windows: SmartScreen warning**
   - Click "More info" → "Run anyway"
   - Or disable SmartScreen temporarily

## 📊 Release Metrics

Monitor release adoption:
- Download counts on GitHub Releases page
- Update success rate in telemetry (if enabled)
- Issue reports for specific versions

## 🔧 CI/CD Configuration

### GitHub Actions Secrets Required

```yaml
# Windows Code Signing
WINDOWS_CERTIFICATE
WINDOWS_CERTIFICATE_PASSWORD
WINDOWS_CERTIFICATE_NAME

# macOS Code Signing & Notarization
MACOS_CERTIFICATE
MACOS_CERTIFICATE_PASSWORD
MACOS_KEYCHAIN_PASSWORD
APPLE_ID
APPLE_APP_SPECIFIC_PASSWORD
APPLE_TEAM_ID

# GitHub Token (automatic)
GITHUB_TOKEN
```

### Build Matrix

The workflow builds for:
- **Windows**: x64, ARM64
- **macOS**: x64, ARM64, Universal
- **Linux**: x64, ARM64, ARMv7

### Release Workflow Triggers

- **Tag push**: `v*.*.*` pattern
- **Manual dispatch**: Via GitHub Actions UI
- **Pre-releases**: `v*.*.*-beta.*` or `v*.*.*-alpha.*`

## 📝 Version Management

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH[-PRERELEASE]`

- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes
- **PRERELEASE**: Beta/alpha versions

### Examples

```
1.0.0       # First stable release
1.0.1       # Bug fix
1.1.0       # New feature
2.0.0       # Breaking change
1.1.0-beta.1 # Beta release
1.1.0-alpha.3 # Alpha release
```

## 🚢 Release Checklist

- [ ] All tests passing
- [ ] Version bumped in package.json
- [ ] Release notes prepared
- [ ] Breaking changes documented
- [ ] Migration guide (if needed)
- [ ] Security vulnerabilities checked
- [ ] Dependencies updated
- [ ] Documentation updated
- [ ] Translations complete
- [ ] Manual testing on all platforms

## 🔗 Related Documentation

- [GitHub Actions Workflow](.github/workflows/release.yml)
- [Electron Builder Config](package.json#L87)
- [Auto-updater Module](src/main/updater.ts)
- [Release Script](scripts/release.js)

## 📞 Support

For release-related issues:
1. Check [Troubleshooting](#-troubleshooting) section
2. Search [existing issues](https://github.com/[owner]/bottleneck/issues)
3. Create a new issue with:
   - Platform and version
   - Error messages/logs
   - Steps to reproduce

## 🎯 Future Enhancements

- [ ] Differential updates for smaller downloads
- [ ] Staged rollouts with percentage control
- [ ] A/B testing for new features
- [ ] Homebrew cask for macOS
- [ ] Chocolatey package for Windows
- [ ] Flatpak support for Linux
- [ ] Auto-update rollback on failure
- [ ] Update metrics dashboard