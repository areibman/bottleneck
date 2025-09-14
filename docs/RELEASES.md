# Release Management Guide

This document outlines the release process for Bottleneck.

## Release Process Overview

Bottleneck uses automated releases through GitHub Actions with semantic versioning.

### Release Types

- **Major** (`x.0.0`): Breaking changes, major new features
- **Minor** (`x.y.0`): New features, backwards compatible
- **Patch** (`x.y.z`): Bug fixes, security updates
- **Pre-release** (`x.y.z-beta.n`): Beta versions for testing

## Creating a Release

### Prerequisites

1. Ensure all changes are merged to `main` branch
2. All tests pass
3. Documentation is updated
4. CHANGELOG.md is ready for new entry

### Automated Release Process

#### Using Release Scripts

```bash
# Patch release (bug fixes)
npm run release:patch

# Minor release (new features)
npm run release:minor

# Major release (breaking changes)
npm run release:major

# Dry run to preview changes
npm run release:dry
```

#### Manual Process

1. **Prepare the release**:
   ```bash
   # Update version and changelog
   node scripts/release.js patch
   
   # Or specify exact version
   node scripts/release.js 1.2.3
   ```

2. **Push the tag**:
   ```bash
   git push origin main --tags
   ```

3. **GitHub Actions will**:
   - Build for all platforms
   - Sign binaries
   - Create GitHub Release
   - Upload assets
   - Generate checksums

### Release Workflow

1. **Tag Creation**: Push tag triggers release workflow
2. **Build Matrix**: Builds on Windows, macOS, and Linux
3. **Code Signing**: Signs binaries with certificates
4. **Asset Upload**: Uploads all platform binaries
5. **Release Publication**: Creates public GitHub release

## Platform-Specific Builds

### Windows
- **Formats**: `.exe` installer, `.msi`, portable `.zip`
- **Code Signing**: Uses Windows code signing certificate
- **Architecture**: x64

### macOS
- **Formats**: `.dmg`, `.zip`
- **Code Signing**: Apple Developer certificate + notarization
- **Architecture**: Universal binary (Intel + Apple Silicon)

### Linux
- **Formats**: AppImage, `.deb`, `.rpm`, `.snap`, `.tar.gz`
- **Architecture**: x64
- **Distribution**: Works on most modern Linux distributions

## Code Signing Setup

### Windows Code Signing

Set these repository secrets:
- `WIN_CSC_LINK`: Base64 encoded certificate
- `WIN_CSC_KEY_PASSWORD`: Certificate password

### macOS Code Signing

Set these repository secrets:
- `CSC_LINK`: Base64 encoded certificate
- `CSC_KEY_PASSWORD`: Certificate password
- `APPLE_ID`: Apple ID for notarization
- `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: Apple Team ID

## Auto-Updates

### Configuration

Auto-updater is configured in `package.json`:
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-github-username",
      "repo": "bottleneck"
    }
  }
}
```

### Update Channels

- **Stable**: Latest release
- **Beta**: Pre-release versions
- **Alpha**: Development builds (not implemented)

### Update Process

1. App checks for updates on startup
2. Downloads update in background
3. Notifies user when ready
4. Installs on restart

## Security Considerations

### Checksum Verification

Each release includes SHA256 checksums:
- Generated automatically during build
- Available as `.sha256` files
- Used for integrity verification

### Secure Update Channel

- Updates served over HTTPS
- Code signing verification
- Certificate pinning (recommended)

## Beta Releases

### Creating Beta Releases

```bash
# Create beta tag
git tag -a v1.2.0-beta.1 -m "Beta release v1.2.0-beta.1"
git push origin v1.2.0-beta.1
```

### Beta Channel Configuration

Users can opt into beta updates in settings.

## Release Checklist

### Pre-Release

- [ ] All features complete and tested
- [ ] Documentation updated
- [ ] Version bumped appropriately
- [ ] Changelog updated
- [ ] All tests passing
- [ ] Security review completed

### Release

- [ ] Tag created and pushed
- [ ] CI/CD pipeline successful
- [ ] All platform builds completed
- [ ] Code signing successful
- [ ] Assets uploaded to GitHub
- [ ] Release notes published

### Post-Release

- [ ] Auto-updater tested
- [ ] Download links verified
- [ ] Installation tested on all platforms
- [ ] Community notified
- [ ] Documentation site updated

## Rollback Procedure

### If Release Has Issues

1. **Mark release as pre-release** in GitHub
2. **Create hotfix** if possible
3. **Release new version** with fixes
4. **Communicate** with users about the issue

### Emergency Rollback

1. Delete the problematic release
2. Revert the tag if necessary
3. Release previous stable version with higher version number

## Monitoring

### Release Metrics

Track these metrics:
- Download counts per platform
- Update adoption rates
- Error reports
- User feedback

### Tools

- GitHub Insights for download statistics
- Error tracking (Sentry, etc.)
- User analytics (if implemented)

## Troubleshooting Releases

### Common Issues

1. **Build failures**: Check platform-specific dependencies
2. **Code signing failures**: Verify certificates and secrets
3. **Upload failures**: Check network and permissions
4. **Auto-update issues**: Verify release configuration

### Debug Information

When reporting release issues, include:
- Build logs from GitHub Actions
- Platform and architecture
- Error messages
- Steps to reproduce

## Release Schedule

### Regular Releases

- **Patch releases**: As needed for critical bugs
- **Minor releases**: Monthly or bi-monthly
- **Major releases**: Quarterly or bi-annually

### Security Releases

- Critical security fixes released immediately
- Security advisories published
- Users notified through all channels

## Contributing to Releases

### For Maintainers

1. Follow semantic versioning strictly
2. Maintain comprehensive changelog
3. Test releases thoroughly
4. Communicate changes clearly

### For Contributors

1. Follow contribution guidelines
2. Include tests with changes
3. Update documentation
4. Consider impact on releases