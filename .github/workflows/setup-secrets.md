# GitHub Secrets Setup

This document describes the required GitHub secrets for the automated release pipeline.

## Required Secrets

### For All Platforms
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

### For Windows Code Signing
- `CSC_LINK` - Base64-encoded code signing certificate (.p12 file)
- `CSC_KEY_PASSWORD` - Password for the code signing certificate

### For macOS Code Signing and Notarization
- `CSC_LINK` - Base64-encoded code signing certificate (.p12 file)
- `CSC_KEY_PASSWORD` - Password for the code signing certificate
- `APPLE_ID` - Your Apple ID email
- `APPLE_PASSWORD` - App-specific password (not your Apple ID password)
- `APPLE_TEAM_ID` - Your Apple Developer Team ID

## How to Set Up Secrets

1. Go to your repository on GitHub
2. Click on "Settings" tab
3. Click on "Secrets and variables" in the left sidebar
4. Click on "Actions"
5. Click "New repository secret" for each secret above
6. Enter the secret name and value
7. Click "Add secret"

## How to Get the Required Values

### Windows Code Signing Certificate

1. Purchase a code signing certificate from a trusted CA (e.g., DigiCert, Sectigo)
2. Export the certificate as a .p12 file
3. Convert to base64:
   ```bash
   base64 -i certificate.p12 -o certificate.txt
   ```
4. Copy the contents of certificate.txt to the `CSC_LINK` secret

### macOS Code Signing Certificate

1. Log into your Apple Developer account
2. Go to "Certificates, Identifiers & Profiles"
3. Create a "Developer ID Application" certificate
4. Download and install the certificate
5. Export as .p12 file from Keychain Access
6. Convert to base64 (same as Windows)

### Apple ID and Team ID

1. **Apple ID**: Your Apple Developer account email
2. **Team ID**: Found in your Apple Developer account under "Membership"
3. **App-specific password**: 
   - Go to appleid.apple.com
   - Sign in with your Apple ID
   - Go to "Sign-In and Security" > "App-Specific Passwords"
   - Generate a new password for "Bottleneck"

## Testing Without Code Signing

If you don't have code signing certificates yet, you can still test the release pipeline:

1. The builds will complete but won't be signed
2. Users will see security warnings when installing
3. This is fine for development and testing

## Security Notes

- Never commit certificates or passwords to the repository
- Use GitHub secrets for all sensitive information
- Rotate certificates and passwords regularly
- Monitor for any security issues

## Troubleshooting

### Common Issues

1. **Certificate expired**: Update the certificate and secret
2. **Wrong Team ID**: Double-check the Team ID in Apple Developer account
3. **App-specific password issues**: Generate a new app-specific password
4. **Base64 encoding issues**: Ensure the certificate is properly encoded

### Getting Help

- Check the GitHub Actions logs for specific error messages
- Verify all secrets are set correctly
- Test locally with `npm run dist` first