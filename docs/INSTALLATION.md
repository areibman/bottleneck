# Installation Guide

This guide covers how to install Bottleneck on different operating systems.

## Download

### Official Releases

Download the latest release from the [GitHub Releases page](https://github.com/your-github-username/bottleneck/releases).

### Platform-Specific Downloads

#### Windows
- **Installer (Recommended)**: `Bottleneck-{version}-win-x64.exe`
- **MSI Package**: `Bottleneck-{version}-win-x64.msi`
- **Portable**: `Bottleneck-{version}-win-x64.zip`

#### macOS
- **DMG (Recommended)**: `Bottleneck-{version}-mac-universal.dmg`
- **ZIP**: `Bottleneck-{version}-mac-universal.zip`

#### Linux
- **AppImage (Recommended)**: `Bottleneck-{version}-linux-x64.AppImage`
- **Debian Package**: `Bottleneck-{version}-linux-x64.deb`
- **RPM Package**: `Bottleneck-{version}-linux-x64.rpm`
- **Snap Package**: `Bottleneck-{version}-linux-x64.snap`
- **Tarball**: `Bottleneck-{version}-linux-x64.tar.gz`

## Installation Instructions

### Windows

#### Using the Installer (Recommended)
1. Download `Bottleneck-{version}-win-x64.exe`
2. Run the installer as Administrator
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

#### Using MSI Package
1. Download `Bottleneck-{version}-win-x64.msi`
2. Double-click to run the MSI installer
3. Follow the installation prompts

#### Portable Version
1. Download `Bottleneck-{version}-win-x64.zip`
2. Extract to your preferred directory
3. Run `Bottleneck.exe` from the extracted folder

### macOS

#### Using DMG (Recommended)
1. Download `Bottleneck-{version}-mac-universal.dmg`
2. Open the DMG file
3. Drag Bottleneck to the Applications folder
4. Launch from Applications or Spotlight

#### Using ZIP
1. Download `Bottleneck-{version}-mac-universal.zip`
2. Extract the ZIP file
3. Move the app to Applications folder
4. Launch the app (you may need to allow it in Security & Privacy settings)

**Note**: On first launch, you may see a security warning. Go to System Preferences > Security & Privacy and click "Open Anyway".

### Linux

#### AppImage (Recommended)
1. Download `Bottleneck-{version}-linux-x64.AppImage`
2. Make it executable: `chmod +x Bottleneck-{version}-linux-x64.AppImage`
3. Run: `./Bottleneck-{version}-linux-x64.AppImage`

#### Debian/Ubuntu (.deb)
```bash
wget https://github.com/your-github-username/bottleneck/releases/download/v{version}/Bottleneck-{version}-linux-x64.deb
sudo dpkg -i Bottleneck-{version}-linux-x64.deb
sudo apt-get install -f  # Fix dependencies if needed
```

#### Red Hat/Fedora (.rpm)
```bash
wget https://github.com/your-github-username/bottleneck/releases/download/v{version}/Bottleneck-{version}-linux-x64.rpm
sudo rpm -i Bottleneck-{version}-linux-x64.rpm
```

#### Snap
```bash
sudo snap install bottleneck --dangerous Bottleneck-{version}-linux-x64.snap
```

#### Tarball
```bash
wget https://github.com/your-github-username/bottleneck/releases/download/v{version}/Bottleneck-{version}-linux-x64.tar.gz
tar -xzf Bottleneck-{version}-linux-x64.tar.gz
cd bottleneck-{version}
./bottleneck
```

## System Requirements

### Minimum Requirements
- **OS**: Windows 10, macOS 10.14, or Linux (64-bit)
- **RAM**: 4 GB
- **Storage**: 500 MB free space
- **Network**: Internet connection for GitHub API access

### Recommended Requirements
- **OS**: Windows 11, macOS 12+, or modern Linux distribution
- **RAM**: 8 GB or more
- **Storage**: 1 GB free space
- **Network**: Stable broadband connection

## Verification

### Checksum Verification
Each release includes SHA256 checksums. To verify your download:

#### Windows (PowerShell)
```powershell
Get-FileHash Bottleneck-{version}-win-x64.exe -Algorithm SHA256
```

#### macOS/Linux
```bash
sha256sum Bottleneck-{version}-linux-x64.AppImage
```

Compare the output with the checksum in the corresponding `.sha256` file.

## Auto-Updates

Bottleneck includes an automatic update system that will:
- Check for updates on startup
- Notify you when updates are available
- Download and install updates in the background
- Restart the application to apply updates

You can disable auto-updates in the application settings if preferred.

## Uninstallation

### Windows
- **Installer version**: Use "Add or Remove Programs" in Windows Settings
- **Portable version**: Simply delete the application folder

### macOS
- Move the application from Applications to Trash
- Clean up preferences: `~/Library/Preferences/com.bottleneck.app.plist`
- Clean up app data: `~/Library/Application Support/Bottleneck`

### Linux
- **AppImage**: Delete the AppImage file
- **Package managers**: Use the appropriate uninstall command
  - Debian/Ubuntu: `sudo apt remove bottleneck`
  - Red Hat/Fedora: `sudo rpm -e bottleneck`
  - Snap: `sudo snap remove bottleneck`

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

## Support

- **Issues**: [GitHub Issues](https://github.com/your-github-username/bottleneck/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-github-username/bottleneck/discussions)
- **Documentation**: [Wiki](https://github.com/your-github-username/bottleneck/wiki)