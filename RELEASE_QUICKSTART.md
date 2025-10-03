# Release Quick Start Guide

Get your first release published in 5 minutes! 🚀

## Prerequisites

- [x] Git repository initialized
- [x] Push access to your GitHub repository
- [x] Node.js and npm installed

## Step 1: Update Repository URL

Edit `package.json` and update the repository URL:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR-USERNAME/bottleneck.git"
  }
}
```

Replace `YOUR-USERNAME` with your actual GitHub username or organization.

## Step 2: Install Dependencies

```bash
npm install
```

This will install all necessary dependencies including `electron-updater` and `electron-log`.

## Step 3: Add Application Icons (Optional but Recommended)

Add these icons to the `build/` directory:

- `icon.icns` - macOS icon (512x512 or larger)
- `icon.ico` - Windows icon (256x256 or larger)
- `icon.png` - Linux icon (512x512 or larger)

You can create icons from a single PNG using online tools or skip this for now (default icons will be used).

## Step 4: Commit Your Changes

```bash
git add .
git commit -m "feat: Add automated release system"
git push origin main
```

## Step 5: Create Your First Release

### Option A: Using the Interactive Script (Recommended)

```bash
node scripts/release.js
```

Follow the prompts:
1. Choose release type (start with "Patch")
2. Confirm the version bump
3. Choose "yes" to push

### Option B: Manual Release

```bash
# Bump version to 0.1.6 (or your desired version)
npm run version:patch

# Push to GitHub
git push origin main --tags
```

## Step 6: Monitor the Build

1. Go to your repository on GitHub
2. Click on "Actions" tab
3. Watch the release workflow build your app
4. Build takes about 10-20 minutes (all platforms)

## Step 7: Publish the Release

1. Once the workflow completes, go to "Releases"
2. You'll see a draft release
3. Review the release notes
4. Click "Publish release"

🎉 **Done!** Your app is now available for download!

## What Gets Built?

After the workflow completes, users can download:

### Windows
- `Bottleneck-0.1.6-win-x64.exe` - Installer
- `Bottleneck-0.1.6-win-x64.msi` - MSI installer
- `Bottleneck-0.1.6-win-x64.zip` - Portable

### macOS
- `Bottleneck-0.1.6-mac-universal.dmg` - Universal app
- `Bottleneck-0.1.6-mac-universal.zip` - Universal zip

### Linux
- `Bottleneck-0.1.6-linux-x64.AppImage` - AppImage
- `Bottleneck-0.1.6-linux-x64.deb` - Debian package
- `Bottleneck-0.1.6-linux-x64.rpm` - RPM package
- `Bottleneck-0.1.6-linux-x64.snap` - Snap package
- `Bottleneck-0.1.6-linux-x64.tar.gz` - Archive

## Testing Auto-Updates

After publishing your first release:

1. Install the app from the release
2. Create and publish a new release (0.1.7)
3. Open the installed app
4. You should see an update notification within a few seconds!

## Next Releases

For subsequent releases:

```bash
# For bug fixes
npm run version:patch

# For new features
npm run version:minor

# For breaking changes
npm run version:major

# Then push
git push origin main --tags
```

## Troubleshooting

### Build Fails?

- Check the Actions logs for specific errors
- Ensure all dependencies are installed
- Verify package.json is valid JSON

### No Draft Release Created?

- Check that the tag starts with 'v' (e.g., v0.1.6)
- Verify GitHub Actions has write permissions
- Check workflow logs for errors

### Updates Not Working?

- Ensure repository URL in package.json is correct
- Release must be published (not draft)
- Updates only work in production builds (not development)

## Optional: Code Signing

For production apps, set up code signing:

### macOS
1. Get an Apple Developer account ($99/year)
2. Create certificates in Xcode
3. Add secrets to GitHub repository settings:
   - `CSC_LINK`
   - `CSC_KEY_PASSWORD`
   - `APPLE_ID`
   - `APPLE_ID_PASSWORD`
   - `APPLE_TEAM_ID`

### Windows
1. Purchase a code signing certificate
2. Add secrets to GitHub repository settings:
   - `CSC_LINK`
   - `CSC_KEY_PASSWORD`

See [RELEASE.md](./RELEASE.md) for detailed code signing instructions.

## Need Help?

- 📚 Full documentation: [RELEASE.md](./RELEASE.md)
- 🐛 Check issues: [GitHub Issues](https://github.com/electron-userland/electron-builder/issues)
- 💬 Ask questions: Open an issue in your repository

## Tips

1. **Start Simple**: Don't worry about code signing for your first release
2. **Test Locally**: Run `npm run dist` to test building before pushing
3. **Use Beta Releases**: Test with `npm run version:beta` for pre-releases
4. **Automate**: Once working, releases are just `git push origin main --tags`
5. **Monitor**: Keep an eye on GitHub Actions for build status

---

**Happy Shipping! 🚀**

Next: Read [RELEASE.md](./RELEASE.md) for advanced features like code signing, pre-release channels, and troubleshooting.
