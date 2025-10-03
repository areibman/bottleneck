## 🎉 What's New

<!-- Describe new features added in this release -->

## 🐛 Bug Fixes

<!-- List bug fixes -->

## 🔧 Improvements

<!-- List improvements and optimizations -->

## ⚠️ Breaking Changes

<!-- List any breaking changes (if applicable) -->

## 📦 Installation

### Windows

**Recommended**: Download `Bottleneck-VERSION-win-x64.exe` (NSIS Installer)

- **NSIS Installer**: `Bottleneck-VERSION-win-x64.exe` - Full featured installer with Start Menu and Desktop shortcuts
- **MSI Installer**: `Bottleneck-VERSION-win-x64.msi` - Windows Installer package
- **Portable**: `Bottleneck-VERSION-win-x64.zip` - No installation required, extract and run

### macOS

**Recommended**: Download `Bottleneck-VERSION-mac-universal.dmg`

- **DMG Image**: `Bottleneck-VERSION-mac-universal.dmg` - Drag to Applications folder
- **ZIP Archive**: `Bottleneck-VERSION-mac-universal.zip` - Extract and move to Applications

**Note**: Universal builds support both Intel and Apple Silicon Macs.

**First Launch**: If you see "App is damaged and can't be opened", run:
```bash
xattr -cr /Applications/Bottleneck.app
```

### Linux

**Recommended**: Download `Bottleneck-VERSION-linux-x64.AppImage`

- **AppImage**: `Bottleneck-VERSION-linux-x64.AppImage` - Universal Linux package
  ```bash
  chmod +x Bottleneck-VERSION-linux-x64.AppImage
  ./Bottleneck-VERSION-linux-x64.AppImage
  ```

- **Debian/Ubuntu**: `Bottleneck-VERSION-linux-x64.deb`
  ```bash
  sudo dpkg -i Bottleneck-VERSION-linux-x64.deb
  ```

- **RedHat/Fedora**: `Bottleneck-VERSION-linux-x64.rpm`
  ```bash
  sudo rpm -i Bottleneck-VERSION-linux-x64.rpm
  ```

- **Snap**: `Bottleneck-VERSION-linux-x64.snap`
  ```bash
  sudo snap install Bottleneck-VERSION-linux-x64.snap --dangerous
  ```

- **Archive**: `Bottleneck-VERSION-linux-x64.tar.gz`
  ```bash
  tar -xzf Bottleneck-VERSION-linux-x64.tar.gz
  ```

## 🔒 Checksums

SHA256 checksums are provided for verification:

- `checksums-win.txt` - Windows checksums
- `checksums-mac.txt` - macOS checksums
- `checksums-linux.txt` - Linux checksums

To verify (Linux/macOS):
```bash
sha256sum -c checksums-*.txt
```

To verify (Windows PowerShell):
```powershell
Get-FileHash Bottleneck-VERSION-win-x64.exe -Algorithm SHA256
```

## 🔄 Auto-Updates

After installing this version, future updates will be automatically downloaded and you'll be notified when they're ready to install.

## 📝 Changelog

<!-- Detailed changelog -->

**Full Changelog**: https://github.com/OWNER/REPO/compare/PREVIOUS_TAG...VERSION

## 🆘 Support

- 📖 [Documentation](https://github.com/OWNER/REPO#readme)
- 🐛 [Report a Bug](https://github.com/OWNER/REPO/issues/new?template=bug_report.md)
- 💡 [Request a Feature](https://github.com/OWNER/REPO/issues/new?template=feature_request.md)
- 💬 [Discussions](https://github.com/OWNER/REPO/discussions)

---

**Thank you for using Bottleneck! 🙏**

If you find this project useful, please consider:
- ⭐ Starring the repository
- 🐦 Sharing with others
- 🤝 Contributing to the project
