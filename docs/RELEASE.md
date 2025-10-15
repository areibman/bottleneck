# Release & Auto-Update Setup Guide

This guide explains how to create signed releases on GitHub and enable auto-updates for users.

## 🎯 Overview

**What's Set Up:**
- ✅ Code signing with Apple Developer ID
- ✅ Notarization with Apple
- ✅ Auto-updates via GitHub releases
- ✅ Automated GitHub Actions workflow

**User Experience:**
1. User downloads Bottleneck once from GitHub releases
2. App automatically checks for updates on launch
3. When a new version is available, user gets a notification
4. User clicks "Restart" and gets the latest version
5. No manual downloads needed!

---

## 📋 One-Time Setup: GitHub Secrets

You need to add these secrets to your GitHub repository for automated releases to work.

### Step 1: Export Your Certificate

On your Mac (the one where you set up code signing):

```bash
# 1. Open Keychain Access
# 2. Find "Developer ID Application: Alex Reibman (KQHSQY486C)"
# 3. Right-click → Export "Developer ID Application: Alex Reibman"
# 4. Save as: certificate.p12
# 5. Set a password (you'll need this)
```

### Step 2: Convert Certificate to Base64

```bash
base64 -i certificate.p12 -o certificate-base64.txt
```

This creates a text file with your certificate encoded.

### Step 3: Add Secrets to GitHub

Go to: **https://github.com/areibman/bottleneck/settings/secrets/actions**

Click **"New repository secret"** and add these:

| Secret Name | Value | Where to Get It |
|-------------|-------|-----------------|
| `MACOS_CERTIFICATE` | Contents of `certificate-base64.txt` | The base64 file you just created |
| `MACOS_CERTIFICATE_PASSWORD` | Password you set when exporting | The password from Step 1 |
| `KEYCHAIN_PASSWORD` | Any secure password | Make up a strong password (only used in CI) |
| `APPLE_ID` | `areibman@gmail.com` | Your Apple ID |
| `APPLE_APP_SPECIFIC_PASSWORD` | Your app-specific password | Same one from `.env.local` |
| `APPLE_TEAM_ID` | `KQHSQY486C` | Your Apple Team ID |

**Security Note:** After adding these secrets to GitHub, **delete the local files**:
```bash
rm certificate.p12 certificate-base64.txt
```

---

## 🚀 Creating a Release

### Option 1: Using Git Tags (Recommended)

```bash
# 1. Update version in package.json
npm version patch  # or minor, or major

# 2. Push with tags
git push && git push --tags

# 3. GitHub Actions automatically builds and releases!
```

### Option 2: Manual Tag

```bash
# 1. Update version in package.json manually to 0.1.7

# 2. Commit changes
git add package.json
git commit -m "Release v0.1.7"

# 3. Create and push tag
git tag v0.1.7
git push && git push --tags
```

### What Happens Next:

1. **GitHub Actions triggers** when you push a tag
2. **Builds the app** on macOS runner
3. **Signs with your certificate** (from secrets)
4. **Notarizes with Apple** (using your credentials)
5. **Creates GitHub release** with signed DMG files
6. **Updates are now available** to all users!

---

## 👥 How Users Get Updates

### First Installation:
1. User downloads `Bottleneck-{version}-arm64.dmg` from GitHub releases
2. Drags to Applications folder
3. Opens Bottleneck
4. App launches instantly (signed & notarized!)

### Auto-Updates:
1. User opens Bottleneck (any version after 0.1.7)
2. App checks GitHub for new releases
3. If update available, downloads in background
4. Shows notification: "Update Ready - Restart to apply"
5. User clicks "Restart"
6. App updates automatically!

**No manual downloading ever again!** 🎉

---

## 🔍 Monitoring Releases

### Check Build Status:
**https://github.com/areibman/bottleneck/actions**

You'll see:
- ✅ Green check = Build succeeded, release created
- ❌ Red X = Build failed, check logs
- 🟡 Yellow = Build in progress

### Check Releases:
**https://github.com/areibman/bottleneck/releases**

Each release shows:
- Version number
- Release notes
- Download links for both Intel and Apple Silicon
- Auto-update metadata (`latest-mac.yml`)

---

## 🐛 Troubleshooting

### Build Fails with "Certificate not found"

**Problem:** GitHub can't find your certificate

**Solution:** 
1. Re-export certificate from Keychain Access
2. Make sure you include the private key
3. Re-encode to base64
4. Update `MACOS_CERTIFICATE` secret on GitHub

### Build Fails with "Notarization failed"

**Problem:** Apple credentials are wrong

**Solution:**
1. Verify `APPLE_ID` secret matches your Apple ID
2. Verify `APPLE_APP_SPECIFIC_PASSWORD` is correct (not your regular password!)
3. Verify `APPLE_TEAM_ID` is correct: `KQHSQY486C`

### Build Succeeds but No Release Created

**Problem:** GitHub token doesn't have permissions

**Solution:**
1. Go to repo **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select **"Read and write permissions"**
4. Click **Save**

### Users Not Getting Updates

**Problem:** App not checking for updates

**Solutions:**
1. Make sure they downloaded version 0.1.7 or later
2. App only checks in production (not dev mode)
3. Check GitHub releases has `latest-mac.yml` file
4. User might have disabled auto-update notifications

---

## 📝 Release Checklist

Before creating a new release:

- [ ] Test the app locally
- [ ] Update CHANGELOG or release notes
- [ ] Update version in `package.json`
- [ ] Commit all changes
- [ ] Create and push git tag
- [ ] Monitor GitHub Actions build
- [ ] Verify release was created on GitHub
- [ ] Download and test the released DMG
- [ ] Announce release to users

---

## 🔄 Version Strategy

**Semantic Versioning (semver):**

- **Patch** (0.1.6 → 0.1.7): Bug fixes, minor changes
  ```bash
  npm version patch
  ```

- **Minor** (0.1.7 → 0.2.0): New features, backwards compatible
  ```bash
  npm version minor
  ```

- **Major** (0.2.0 → 1.0.0): Breaking changes
  ```bash
  npm version major
  ```

---

## 📊 Stats & Analytics

### Track Releases:
- **Total Downloads:** Check each release on GitHub
- **Update Adoption:** Most users auto-update within 24 hours
- **Build Time:** ~15-20 minutes per release (includes notarization)

### Cost Summary:
- **Apple Developer Account:** $99/year
- **GitHub Actions:** Free for public repos
- **Total:** $99/year for unlimited signed releases!

---

## 🎓 Advanced: Pre-releases

Test releases before going live:

```bash
# Create pre-release tag
git tag v0.1.7-beta.1
git push --tags
```

Then on GitHub:
1. Go to the release
2. Check **"This is a pre-release"**
3. Only users who opt-in will get beta updates

---

## 📚 Additional Resources

- [Electron Builder Publishing](https://www.electron.build/configuration/publish)
- [Electron Updater Documentation](https://www.electron.build/auto-update)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)

---

## 🤝 Support

If you run into issues:
1. Check the GitHub Actions logs
2. Verify all secrets are set correctly
3. Test local build first: `./build-signed.sh`
4. Check Apple's notarization status at https://appstoreconnect.apple.com

---

**Next Steps:**
1. Set up GitHub secrets (see above)
2. Test with a new version tag
3. Distribute to users
4. Enjoy automatic updates! 🚀

