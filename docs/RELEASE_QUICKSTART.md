# Release Quick Start Guide

## 🎯 Goal
Enable automated signed releases on GitHub with auto-updates for users.

---

## ⚡ Quick Setup (15 minutes)

### Step 1: Export Your Certificate for GitHub Actions

Run the helper script:
```bash
./scripts/export-certificate.sh
```

This will:
- Export your Developer ID certificate
- Convert it to base64
- Show you exactly what to add to GitHub secrets

### Step 2: Add Secrets to GitHub

Go to: https://github.com/areibman/bottleneck/settings/secrets/actions

Add these 6 secrets (copy from the script output):
1. `MACOS_CERTIFICATE` - Base64 encoded certificate
2. `MACOS_CERTIFICATE_PASSWORD` - Password you set during export
3. `KEYCHAIN_PASSWORD` - Any secure password (make one up)
4. `APPLE_ID` - areibman@gmail.com
5. `APPLE_APP_SPECIFIC_PASSWORD` - From your `.env.local`
6. `APPLE_TEAM_ID` - KQHSQY486C

### Step 3: Enable GitHub Actions Permissions

1. Go to: https://github.com/areibman/bottleneck/settings/actions
2. Scroll to **"Workflow permissions"**
3. Select **"Read and write permissions"**
4. Click **Save**

### Step 4: Create Your First Release

```bash
# Update version
npm version patch  # This creates v0.1.7

# Push with tags
git push && git push --tags
```

GitHub Actions will automatically:
- Build the app
- Sign it with your certificate
- Notarize it with Apple
- Create a release on GitHub

### Step 5: Monitor the Build

Watch it here: https://github.com/areibman/bottleneck/actions

Takes ~15-20 minutes for first build (notarization is slow).

---

## 🎉 Done!

Now when you release v0.1.8, v0.1.9, etc.:
1. Users on v0.1.7+ automatically get notified of updates
2. They click "Restart" and get the new version
3. No manual downloads needed!

---

## 📖 Need More Details?

See: [RELEASE.md](RELEASE.md) for comprehensive documentation.

---

## 🐛 Troubleshooting

**Build fails?**
- Check GitHub Actions logs
- Verify all 6 secrets are set correctly
- Make sure workflow permissions are enabled

**Users not getting updates?**
- They need to be on v0.1.7 or later
- Updates only work in production (not dev mode)
- Check that `latest-mac.yml` exists in your release

---

## 🚀 Future Releases

Just run:
```bash
npm version patch && git push --tags
```

That's it! GitHub Actions handles the rest.

