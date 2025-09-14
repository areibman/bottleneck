# Troubleshooting Guide

This guide helps resolve common issues with Bottleneck.

## Common Issues

### Installation Issues

#### Windows: "Windows protected your PC" warning
**Problem**: SmartScreen blocks the installer
**Solution**: 
1. Click "More info" on the warning dialog
2. Click "Run anyway"
3. Alternatively, right-click the installer and select "Properties" > "Unblock"

#### Windows: Installation fails with permissions error
**Problem**: Insufficient permissions
**Solution**: 
1. Right-click the installer and select "Run as administrator"
2. Try installing to a different directory with write permissions

#### macOS: "App can't be opened because it is from an unidentified developer"
**Problem**: macOS Gatekeeper blocks the app
**Solution**: 
1. Go to System Preferences > Security & Privacy
2. Click "Open Anyway" for Bottleneck
3. Or use Terminal: `sudo spctl --master-disable` (not recommended for security)

#### macOS: App is damaged and can't be opened
**Problem**: Quarantine attribute on downloaded app
**Solution**: 
```bash
sudo xattr -rd com.apple.quarantine /Applications/Bottleneck.app
```

#### Linux: AppImage won't run
**Problem**: Missing permissions or FUSE
**Solution**: 
1. Make executable: `chmod +x Bottleneck-*.AppImage`
2. Install FUSE: 
   - Ubuntu/Debian: `sudo apt install fuse`
   - Fedora: `sudo dnf install fuse`
   - Arch: `sudo pacman -S fuse2`

### Authentication Issues

#### Can't authenticate with GitHub
**Problem**: Authentication flow fails
**Solutions**: 
1. Check internet connection
2. Verify GitHub is accessible
3. Try authenticating through browser manually
4. Check if corporate firewall blocks GitHub OAuth
5. Clear app data and try again

#### Token expired or invalid
**Problem**: GitHub token is no longer valid
**Solutions**: 
1. Sign out and sign in again
2. Revoke token in GitHub settings and re-authenticate
3. Clear stored credentials: Delete app data folder

### Performance Issues

#### App starts slowly
**Possible causes and solutions**: 
1. **Large repository list**: 
   - Reduce number of watched repositories
   - Clear local database and re-sync
2. **Network issues**: 
   - Check internet connection speed
   - Try different network
3. **System resources**: 
   - Close other applications
   - Restart the app
   - Restart your computer

#### High memory usage
**Solutions**: 
1. Restart the application
2. Clear cache in Settings
3. Reduce number of open PR tabs
4. Check for memory leaks (report as bug)

#### Slow PR loading
**Solutions**: 
1. Check GitHub API rate limits
2. Verify network connection
3. Try refreshing the PR list
4. Clear local cache

### Update Issues

#### Updates fail to download
**Problem**: Network or permissions issues
**Solutions**: 
1. Check internet connection
2. Try manual update from releases page
3. Check firewall/antivirus settings
4. Run as administrator (Windows) or with sudo (Linux)

#### Auto-update disabled
**Problem**: Updates don't check automatically
**Solutions**: 
1. Enable auto-updates in Settings
2. Check if running in development mode
3. Verify GitHub releases are accessible

#### Update downloaded but won't install
**Problem**: Permissions or file corruption
**Solutions**: 
1. Restart the application
2. Run as administrator
3. Download fresh installer from releases page
4. Check available disk space

### Git Integration Issues

#### Git operations fail
**Problem**: Git not found or misconfigured
**Solutions**: 
1. Install Git if not present
2. Verify Git is in PATH
3. Configure Git credentials
4. Check repository permissions

#### Clone operations fail
**Problem**: SSH keys or HTTPS authentication
**Solutions**: 
1. Set up SSH keys for GitHub
2. Use HTTPS URLs instead of SSH
3. Configure Git credentials helper
4. Check network connectivity

### Terminal Issues

#### Terminal doesn't open
**Problem**: PTY allocation fails
**Solutions**: 
1. Restart the application
2. Check system permissions
3. Verify shell is available
4. Try different terminal shell

#### Terminal commands don't work
**Problem**: PATH or environment issues
**Solutions**: 
1. Check system PATH
2. Restart terminal session
3. Verify shell configuration
4. Check environment variables

### Data Issues

#### Lost settings or data
**Problem**: App data corruption or deletion
**Solutions**: 
1. Check app data location:
   - Windows: `%APPDATA%/Bottleneck`
   - macOS: `~/Library/Application Support/Bottleneck`
   - Linux: `~/.config/Bottleneck`
2. Restore from backup if available
3. Reconfigure settings manually

#### Database errors
**Problem**: SQLite database corruption
**Solutions**: 
1. Delete database file (will lose local data)
2. Clear app data and re-sync
3. Check disk space and permissions

## Diagnostic Information

### Collecting Logs

#### Application Logs
1. Open Developer Tools (Ctrl/Cmd + Shift + I)
2. Go to Console tab
3. Copy error messages

#### System Information
Include this information when reporting issues:
- Operating System and version
- Bottleneck version
- Node.js version (for development)
- Error messages
- Steps to reproduce

### App Data Locations

#### Windows
- Settings: `%APPDATA%/Bottleneck`
- Logs: `%APPDATA%/Bottleneck/logs`

#### macOS
- Settings: `~/Library/Application Support/Bottleneck`
- Logs: `~/Library/Logs/Bottleneck`

#### Linux
- Settings: `~/.config/Bottleneck`
- Logs: `~/.local/share/Bottleneck/logs`

## Reset Options

### Soft Reset (Keep Settings)
1. Close application
2. Delete cache folder only
3. Restart application

### Hard Reset (Clear All Data)
1. Close application
2. Delete entire app data folder
3. Restart application
4. Reconfigure settings

### Factory Reset
1. Uninstall application
2. Delete app data folder
3. Reinstall from latest release
4. Reconfigure from scratch

## Getting Help

### Before Reporting Issues
1. Check this troubleshooting guide
2. Search existing GitHub issues
3. Try the latest version
4. Collect diagnostic information

### Reporting Bugs
Create a new issue with:
- Detailed description
- Steps to reproduce
- Expected vs actual behavior
- System information
- Screenshots if applicable
- Log files if relevant

### Feature Requests
Use GitHub Discussions for:
- Feature suggestions
- Workflow improvements
- Integration requests

### Community Support
- GitHub Discussions for questions
- Stack Overflow with `bottleneck-app` tag
- Community Discord (if available)

## Known Issues

### Windows
- Some antivirus software may flag the application (false positive)
- Windows Defender SmartScreen warnings on first run

### macOS
- First launch may be slow due to security scanning
- Gatekeeper warnings for unsigned builds

### Linux
- AppImage may require FUSE installation
- Some distributions may need additional dependencies

## Performance Tips

### Optimize Performance
1. **Reduce API calls**: 
   - Increase refresh intervals
   - Limit number of repositories
2. **Memory management**: 
   - Close unused PR tabs
   - Restart periodically
3. **Network optimization**: 
   - Use wired connection when possible
   - Configure proxy settings if needed

### System Requirements
- Ensure minimum system requirements are met
- Close resource-intensive applications
- Keep system updated
- Monitor disk space