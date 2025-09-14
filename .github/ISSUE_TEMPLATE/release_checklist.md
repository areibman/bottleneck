---
name: Release Checklist
about: Checklist for preparing a new release
title: 'Release v[VERSION]'
labels: release
assignees: ''
---

## Release Checklist for v[VERSION]

### Pre-Release Checks
- [ ] All tests passing on main branch
- [ ] No critical bugs in issue tracker
- [ ] Dependencies updated to latest stable versions
- [ ] Security audit completed (`npm audit`)
- [ ] Performance benchmarks acceptable

### Code Quality
- [ ] Code review completed for all changes
- [ ] ESLint warnings resolved
- [ ] TypeScript errors fixed
- [ ] Dead code removed
- [ ] Console.logs removed from production code

### Documentation
- [ ] README.md updated with new features
- [ ] API documentation current
- [ ] CHANGELOG.md updated
- [ ] Migration guide written (if breaking changes)
- [ ] Screenshots/GIFs updated

### Platform Testing
- [ ] Windows 10/11 tested
  - [ ] Installation works
  - [ ] Auto-update works
  - [ ] Uninstall clean
- [ ] macOS tested (Intel & Apple Silicon)
  - [ ] Installation works
  - [ ] Gatekeeper/notarization OK
  - [ ] Auto-update works
- [ ] Linux tested
  - [ ] AppImage works
  - [ ] .deb package installs
  - [ ] .rpm package installs

### Feature Testing
- [ ] GitHub authentication works
- [ ] PR list loads correctly
- [ ] PR review functionality works
- [ ] Terminal integration works
- [ ] Settings persist correctly
- [ ] Keyboard shortcuts work
- [ ] Dark/light theme works

### Release Preparation
- [ ] Version bumped in package.json
- [ ] Release notes drafted
- [ ] Breaking changes documented
- [ ] Contributors acknowledged
- [ ] Milestone closed in GitHub

### Release Process
- [ ] Run `npm run release` script
- [ ] Verify git tag created
- [ ] Push to GitHub
- [ ] Monitor GitHub Actions build
- [ ] Verify all platform builds succeed

### Post-Release
- [ ] Release published on GitHub
- [ ] Download links work
- [ ] Auto-update notification appears in previous version
- [ ] Social media announcement posted
- [ ] Discord/Slack notification sent
- [ ] Close this issue

### Rollback Plan
If critical issues found:
- [ ] Revert tag: `git tag -d v[VERSION] && git push origin :refs/tags/v[VERSION]`
- [ ] Delete GitHub release
- [ ] Notify users of rollback
- [ ] Fix issues and re-release

## Notes
<!-- Add any additional notes or concerns here -->

## Related PRs
<!-- List PRs included in this release -->

## Known Issues
<!-- List any known issues that will be addressed in future releases -->