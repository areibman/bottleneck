# Release Checklist

Use this checklist to ensure a smooth release process.

## Pre-Release Checklist

### First Time Setup
- [ ] Install dependencies: `npm install`
- [ ] Update repository URL in `package.json`
- [ ] Add application icons to `build/` directory
  - [ ] `icon.icns` for macOS (512x512+)
  - [ ] `icon.ico` for Windows (256x256+)
  - [ ] `icon.png` for Linux (512x512+)
- [ ] Read [RELEASE_QUICKSTART.md](../RELEASE_QUICKSTART.md)
- [ ] Test local build: `npm run dist`

### Before Every Release
- [ ] All changes committed and pushed
- [ ] Tests pass locally (if applicable)
- [ ] Build succeeds: `npm run build`
- [ ] Local distribution works: `npm run dist`
- [ ] CHANGELOG.md updated (if you maintain one)
- [ ] Version number decided (major/minor/patch)
- [ ] Release notes drafted

## Release Process

### 1. Version Bump
- [ ] Choose version type:
  - [ ] **Patch** (`0.1.5` → `0.1.6`) for bug fixes
  - [ ] **Minor** (`0.1.5` → `0.2.0`) for new features
  - [ ] **Major** (`0.1.5` → `1.0.0`) for breaking changes
  - [ ] **Beta** (`0.1.5` → `0.1.6-beta.1`) for pre-release
  - [ ] **Alpha** (`0.1.5` → `0.1.6-alpha.1`) for early testing

- [ ] Run version bump:
  ```bash
  npm run version:patch  # or minor/major
  # OR use interactive script
  node scripts/release.js
  ```

- [ ] Verify version updated in `package.json`
- [ ] Verify git tag created: `git tag -l`

### 2. Push Release
- [ ] Push commits: `git push origin main`
- [ ] Push tags: `git push origin --tags`
- [ ] OR push both: `git push origin main --tags`

### 3. Monitor Build
- [ ] Open GitHub Actions: `https://github.com/YOUR-USERNAME/bottleneck/actions`
- [ ] Verify workflow started
- [ ] Monitor build progress (~10-20 minutes)
- [ ] Check for errors:
  - [ ] Windows build succeeded
  - [ ] macOS build succeeded
  - [ ] Linux build succeeded
- [ ] Verify artifacts uploaded

### 4. Review Draft Release
- [ ] Go to GitHub Releases page
- [ ] Open the draft release
- [ ] Review generated changelog
- [ ] Edit release notes if needed
- [ ] Verify all assets are present:
  - [ ] Windows: `.exe`, `.msi`, `.zip`
  - [ ] macOS: `.dmg`, `.zip`
  - [ ] Linux: `.AppImage`, `.deb`, `.rpm`, `.snap`, `.tar.gz`
  - [ ] Checksums: `checksums-*.txt`

### 5. Publish Release
- [ ] Final review of release notes
- [ ] Click "Publish release"
- [ ] Verify release is now public
- [ ] Test download links work

## Post-Release Checklist

### Immediate
- [ ] Download and test installers:
  - [ ] Windows installer works
  - [ ] macOS DMG mounts and installs
  - [ ] Linux AppImage runs
- [ ] Test auto-update on previous version
- [ ] Verify app version in About dialog
- [ ] Check for console errors

### Communication
- [ ] Announce release (if applicable):
  - [ ] Twitter/Social media
  - [ ] Discord/Slack
  - [ ] Email newsletter
  - [ ] Website/blog
- [ ] Update documentation if needed
- [ ] Close related issues on GitHub
- [ ] Link PRs to release

### Monitoring
- [ ] Watch for user reports/issues
- [ ] Monitor GitHub issues for bugs
- [ ] Check download statistics
- [ ] Verify auto-updates working

## Rollback Plan

If critical issues are discovered:

### Quick Fix
1. [ ] Create hotfix branch
2. [ ] Fix the issue
3. [ ] Bump patch version
4. [ ] Release immediately

### Full Rollback
1. [ ] Delete the GitHub release
2. [ ] Delete the git tag:
   ```bash
   git tag -d vX.X.X
   git push origin :refs/tags/vX.X.X
   ```
3. [ ] Revert version in `package.json`
4. [ ] Commit and push
5. [ ] Communicate to users

## Common Issues

### Build Fails
- [ ] Check GitHub Actions logs
- [ ] Verify dependencies installed
- [ ] Test local build
- [ ] Check for TypeScript errors
- [ ] Verify electron-builder configuration

### Missing Assets
- [ ] Check if build completed
- [ ] Look for errors in upload step
- [ ] Verify platform built successfully
- [ ] Check artifact size limits

### Auto-Updates Not Working
- [ ] Verify release is published (not draft)
- [ ] Check repository URL in `package.json`
- [ ] Test with production build (not dev)
- [ ] Check updater configuration

### Code Signing Issues
- [ ] Verify certificates not expired
- [ ] Check secret variables in GitHub
- [ ] Verify base64 encoding correct
- [ ] Test certificate password

## Beta/Alpha Release Process

### Creating Beta Release
- [ ] Run: `node scripts/version-bump.js beta`
- [ ] Push: `git push origin main --tags`
- [ ] Mark release as "Pre-release" ✓
- [ ] Add warning in release notes
- [ ] Test thoroughly before stable

### Promoting Beta to Stable
- [ ] Test beta version thoroughly
- [ ] Fix any reported issues
- [ ] Run: `npm run version:patch` (or minor/major)
- [ ] Push: `git push origin main --tags`
- [ ] Mention beta testing in release notes

## Notes

### Version Numbering
- **0.x.x**: Development, breaking changes allowed
- **1.0.0**: First stable release
- **1.x.x**: Stable, maintain backwards compatibility
- **2.0.0**: Breaking changes

### Release Frequency
- **Patch**: As needed for bug fixes
- **Minor**: Every 2-4 weeks for features
- **Major**: When necessary for breaking changes
- **Beta**: 1 week before minor/major releases

### Best Practices
- ✅ Test locally before releasing
- ✅ Use semantic versioning correctly
- ✅ Write clear release notes
- ✅ Test auto-updates
- ✅ Communicate changes to users
- ✅ Monitor first 24 hours closely
- ✅ Have rollback plan ready

## Resources

- [RELEASE_QUICKSTART.md](../RELEASE_QUICKSTART.md) - Quick start guide
- [RELEASE.md](../RELEASE.md) - Comprehensive documentation
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [electron-builder docs](https://www.electron.build/)
- [Semantic Versioning](https://semver.org/)

---

**Remember**: Better to delay a release and get it right than to rush and have to rollback!
