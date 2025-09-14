# Release Process

This document describes the automated release process for Bottleneck, including how to create releases, manage versions, and configure the build pipeline.

## Overview

Bottleneck uses an automated release pipeline that:
- Builds the app for Windows, macOS, and Linux
- Creates GitHub releases with proper assets
- Handles code signing and notarization
- Provides automatic updates to users
- Generates changelogs and release notes

## Version Management

### Semantic Versioning

We follow [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Prerelease Versions

- **alpha**: Early development builds
- **beta**: Feature-complete, testing phase
- **rc**: Release candidate (final testing)

### Version Commands

```bash
# Patch release (0.1.0 -> 0.1.1)
npm run release

# Minor release (0.1.0 -> 0.2.0)
npm run release:minor

# Major release (0.1.0 -> 1.0.0)
npm run release:major

# Prerelease versions
npm run release:alpha
npm run release:beta
npm run release:rc
```

## Release Process

### 1. Create a Release

1. **Update version and create tag:**
   ```bash
   npm run release:minor  # or patch, major, alpha, beta, rc
   ```

2. **Push the tag to trigger the release:**
   ```bash
   git push origin --tags
   ```

3. **GitHub Actions will automatically:**
   - Build the app for all platforms
   - Create a GitHub release
   - Upload platform-specific binaries
   - Generate release notes from commits

### 2. Manual Release (if needed)

You can also create a release manually:

1. Go to [GitHub Releases](https://github.com/YOUR_GITHUB_USERNAME/bottleneck/releases)
2. Click "Create a new release"
3. Choose a tag or create a new one
4. Fill in the release title and description
5. Upload the built binaries from the `release/` directory

## Build Configuration

### Supported Platforms

| Platform | Formats | Architectures |
|----------|---------|---------------|
| **Windows** | .exe, .msi, .zip | x64, ia32 |
| **macOS** | .dmg, .zip | x64, arm64 (Universal) |
| **Linux** | .AppImage, .deb, .rpm, .snap, .tar.gz | x64, arm64 |

### Build Commands

```bash
# Build for all platforms
npm run dist

# Build for specific platforms
npm run dist:win
npm run dist:mac
npm run dist:linux
```

## Code Signing

### Windows

For Windows code signing, you need:
1. A code signing certificate (.p12 file)
2. Set the following secrets in GitHub:
   - `CSC_LINK`: Base64-encoded certificate
   - `CSC_KEY_PASSWORD`: Certificate password

### macOS

For macOS code signing and notarization:
1. Apple Developer account
2. App-specific password
3. Set the following secrets in GitHub:
   - `CSC_LINK`: Certificate (.p12 file)
   - `CSC_KEY_PASSWORD`: Certificate password
   - `APPLE_ID`: Your Apple ID
   - `APPLE_PASSWORD`: App-specific password
   - `APPLE_TEAM_ID`: Your team ID

## Auto-Updates

### Configuration

The app includes automatic update functionality:
- Checks for updates on startup (production builds only)
- Downloads updates in the background
- Prompts user to install when ready
- Supports differential updates

### Update Settings

Users can configure auto-updates in Settings > Updates:
- Enable/disable automatic updates
- Manual update checks
- View skipped versions
- Download and install updates

## Release Assets

Each release includes:

### Windows
- `Bottleneck-Setup-{version}.exe` - Windows installer
- `Bottleneck-{version}.msi` - MSI package
- `Bottleneck-{version}-win.zip` - Portable version

### macOS
- `Bottleneck-{version}.dmg` - macOS disk image
- `Bottleneck-{version}-mac.zip` - ZIP archive

### Linux
- `Bottleneck-{version}.AppImage` - Portable AppImage
- `bottleneck_{version}_amd64.deb` - Debian package
- `bottleneck-{version}.x86_64.rpm` - RPM package
- `bottleneck_{version}.snap` - Snap package
- `bottleneck-{version}-linux.tar.gz` - TAR.GZ archive

### Verification
- `checksums.txt` - SHA256 checksums for all assets

## Changelog Generation

The release process automatically generates changelogs from git commits:

1. **For patch releases**: Commits since the last tag
2. **For major/minor releases**: All commits since the last major/minor version
3. **Format**: Markdown list with commit messages and hashes

### Manual Changelog

You can also manually update `CHANGELOG.md` before creating a release.

## Troubleshooting

### Build Failures

1. **Check GitHub Actions logs** for specific error messages
2. **Verify secrets** are properly set in repository settings
3. **Test locally** with `npm run dist`
4. **Check dependencies** are up to date

### Code Signing Issues

1. **Windows**: Verify certificate is valid and not expired
2. **macOS**: Check Apple Developer account status and team ID
3. **Secrets**: Ensure all required secrets are set correctly

### Update Issues

1. **Check network connectivity** for update checks
2. **Verify GitHub releases** are accessible
3. **Check app permissions** for downloading/installing updates

## Security Considerations

- All releases are code-signed and notarized
- Checksums are provided for verification
- Updates are downloaded over HTTPS
- Certificate pinning prevents man-in-the-middle attacks

## Monitoring

- **Download statistics** are available in GitHub Releases
- **Update adoption** can be tracked through analytics
- **Error reporting** helps identify issues

## Best Practices

1. **Test releases** thoroughly before publishing
2. **Use semantic versioning** consistently
3. **Write clear release notes** describing changes
4. **Monitor user feedback** after releases
5. **Keep dependencies updated** for security

## Support

For issues with the release process:
1. Check the [GitHub Issues](https://github.com/YOUR_GITHUB_USERNAME/bottleneck/issues)
2. Review the [GitHub Actions logs](https://github.com/YOUR_GITHUB_USERNAME/bottleneck/actions)
3. Contact the maintainers

---

For more information, see the main [README.md](README.md) and [SETUP.md](SETUP.md) files.