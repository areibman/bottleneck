# Changelog

All notable changes to Bottleneck will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automated app distribution through GitHub Releases
- Multi-platform build support (Windows, macOS, Linux)
- Auto-updater integration with electron-updater
- Code signing configuration for Windows and macOS
- Beta and nightly release channels
- Comprehensive release documentation
- Version management scripts
- SHA256 checksum generation for all releases

### Changed
- Enhanced electron-builder configuration for all platforms
- Improved build optimization with better compression

### Security
- Added hardened runtime for macOS builds
- Implemented certificate pinning for updates
- Added checksum verification for downloads

## [0.1.0] - 2025-01-14

### Added
- Initial release of Bottleneck
- GitHub PR review functionality
- Branch management features
- Terminal integration
- GitHub authentication via OAuth
- Real-time sync with GitHub
- Keyboard shortcuts
- Dark/light theme support
- Settings management
- SQLite database for local storage

### Known Issues
- Terminal may not resize properly on some Linux distributions
- Monaco editor performance issues with very large files

## Release Types

- **Major releases (x.0.0)**: Breaking changes, major features
- **Minor releases (0.x.0)**: New features, backward compatible
- **Patch releases (0.0.x)**: Bug fixes, performance improvements
- **Beta releases (x.x.x-beta.x)**: Pre-release testing
- **Alpha releases (x.x.x-alpha.x)**: Early development builds
- **Nightly builds**: Automated daily builds from main branch

## Version History Format

Each version entry should include:
- Version number and release date
- Sections: Added, Changed, Deprecated, Removed, Fixed, Security
- Links to relevant PRs and issues
- Contributors acknowledgment
- Migration notes for breaking changes

## How to Update This File

1. Keep "Unreleased" section updated during development
2. Move items to versioned section when releasing
3. Add comparison links at the bottom
4. Follow the Keep a Changelog format
5. Include PR numbers for traceability

---

[Unreleased]: https://github.com/[owner]/bottleneck/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/[owner]/bottleneck/releases/tag/v0.1.0