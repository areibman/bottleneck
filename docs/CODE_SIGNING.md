# Code Signing Guide for Bottleneck

This guide provides detailed instructions for setting up code signing certificates for Windows and macOS builds.

## 🔐 Why Code Signing?

Code signing is essential for:
- **Trust**: Users can verify the app comes from a known developer
- **Security**: Prevents tampering with the application
- **OS Integration**: Avoids security warnings on Windows and macOS
- **Auto-updates**: Required for seamless update experience

## 🪟 Windows Code Signing

### Prerequisites

1. **Code Signing Certificate** from a trusted Certificate Authority (CA):
   - DigiCert
   - Sectigo (formerly Comodo)
   - GlobalSign
   - SSL.com

2. **Certificate Types**:
   - **EV Certificate** (Extended Validation) - Recommended, instant SmartScreen reputation
   - **OV Certificate** (Organization Validation) - Requires reputation building

### Setting Up Windows Signing

#### Step 1: Obtain Certificate

1. Purchase from a trusted CA (~$200-500/year)
2. Complete validation process (business documents required)
3. Receive certificate file (.pfx or .p12)

#### Step 2: Convert to Base64

```powershell
# Using PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pfx")) | Out-File certificate_base64.txt

# Or using certutil
certutil -encode certificate.pfx certificate_base64.txt
```

#### Step 3: Add to GitHub Secrets

1. Go to Repository Settings → Secrets → Actions
2. Add new secrets:
   - `WINDOWS_CERTIFICATE`: Contents of certificate_base64.txt
   - `WINDOWS_CERTIFICATE_PASSWORD`: Your certificate password
   - `WINDOWS_CERTIFICATE_NAME`: Subject name (e.g., "My Company, Inc.")

#### Step 4: Verify in Workflow

The workflow automatically uses these secrets during build:
```yaml
env:
  WIN_CSC_LINK: ${{ secrets.WINDOWS_CERTIFICATE }}
  WIN_CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
```

### Testing Windows Signing Locally

```powershell
# Sign manually with signtool
signtool sign /f certificate.pfx /p PASSWORD /t http://timestamp.digicert.com Bottleneck.exe

# Verify signature
signtool verify /pa Bottleneck.exe
```

## 🍎 macOS Code Signing & Notarization

### Prerequisites

1. **Apple Developer Account** ($99/year)
2. **Developer ID Application Certificate**
3. **Developer ID Installer Certificate** (optional)
4. **App-specific password** for notarization

### Setting Up macOS Signing

#### Step 1: Create Certificates

1. Log in to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to Certificates, IDs & Profiles
3. Create new certificate:
   - Type: "Developer ID Application"
   - Follow the CSR generation process
4. Download and install in Keychain Access

#### Step 2: Export Certificate

1. Open Keychain Access
2. Find your Developer ID certificate
3. Right-click → Export
4. Save as .p12 with password

#### Step 3: Convert to Base64

```bash
# Convert to base64
base64 -i DeveloperID.p12 -o certificate_base64.txt

# On Linux
base64 DeveloperID.p12 > certificate_base64.txt
```

#### Step 4: Create App-Specific Password

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in → Security → App-Specific Passwords
3. Generate password for "Bottleneck CI"
4. Save the password securely

#### Step 5: Add to GitHub Secrets

Add these secrets to your repository:
- `MACOS_CERTIFICATE`: Base64 encoded certificate
- `MACOS_CERTIFICATE_PASSWORD`: Certificate export password
- `MACOS_KEYCHAIN_PASSWORD`: Any secure password (for temp keychain)
- `APPLE_ID`: Your Apple ID email
- `APPLE_APP_SPECIFIC_PASSWORD`: Generated app-specific password
- `APPLE_TEAM_ID`: Your Team ID (found in developer portal)

### Testing macOS Signing Locally

```bash
# Sign the app
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name (TEAMID)" \
  --options runtime \
  --entitlements entitlements.plist \
  Bottleneck.app

# Verify signature
codesign --verify --verbose Bottleneck.app
spctl -a -t exec -vv Bottleneck.app

# Notarize (requires Xcode tools)
xcrun notarytool submit Bottleneck.dmg \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAMID" \
  --wait

# Staple the notarization
xcrun stapler staple Bottleneck.dmg
```

## 🐧 Linux Signing (Optional)

While not required, you can GPG sign Linux packages:

### GPG Signing for .deb/.rpm

```bash
# Generate GPG key
gpg --gen-key

# Export public key
gpg --armor --export your@email.com > public.key

# Sign packages
dpkg-sig --sign builder package.deb
rpm --addsign package.rpm
```

## 🔧 Troubleshooting

### Windows Issues

**Problem**: "Publisher Unknown" warning
- **Solution**: Ensure EV certificate or build SmartScreen reputation

**Problem**: Certificate not found during build
- **Solution**: Check base64 encoding, verify secret names

**Problem**: Timestamp server timeout
- **Solution**: Use alternative timestamp servers:
  - http://timestamp.sectigo.com
  - http://timestamp.comodoca.com
  - http://tsa.starfieldtech.com

### macOS Issues

**Problem**: "App is damaged and can't be opened"
- **Solution**: App not notarized, check notarization logs

**Problem**: Gatekeeper blocks the app
- **Solution**: Ensure hardened runtime and proper entitlements

**Problem**: Notarization fails
- **Solution**: Check for issues:
  ```bash
  xcrun notarytool log <submission-id> \
    --apple-id "your@email.com" \
    --password "app-specific-password" \
    --team-id "TEAMID"
  ```

## 📋 Certificate Management Best Practices

### Security

1. **Never commit certificates** to version control
2. **Use strong passwords** for certificate protection
3. **Rotate certificates** before expiration
4. **Limit access** to GitHub secrets
5. **Use separate certificates** for development and production

### Expiration Handling

1. **Monitor expiration dates** (typically 1-3 years)
2. **Renew 30 days before** expiration
3. **Test new certificates** in a staging environment
4. **Update GitHub secrets** with new certificates
5. **Keep old certificates** until all users update

### Backup Strategy

1. **Secure backup** of all certificates
2. **Document passwords** in password manager
3. **Export from Keychain** regularly
4. **Store in multiple** secure locations
5. **Test restore process** periodically

## 🔄 Renewal Process

### Windows Certificate Renewal

1. Purchase renewal from same CA
2. Generate new CSR if required
3. Download new certificate
4. Update GitHub secrets
5. Test signing with new certificate

### Apple Certificate Renewal

1. Create new certificate in developer portal
2. Download and install in Keychain
3. Export as .p12
4. Update GitHub secrets
5. Submit test build for notarization

## 📚 Additional Resources

### Windows
- [Microsoft Authenticode Signing](https://docs.microsoft.com/en-us/windows/win32/seccrypto/authenticode)
- [Electron Builder - Code Signing](https://www.electron.build/code-signing)
- [EV Certificate Providers](https://docs.microsoft.com/en-us/windows-hardware/drivers/dashboard/get-a-code-signing-certificate)

### macOS
- [Apple Developer - Notarizing Apps](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Hardened Runtime](https://developer.apple.com/documentation/security/hardened_runtime)
- [Entitlements](https://developer.apple.com/documentation/bundleresources/entitlements)

### Tools
- [SignTool (Windows)](https://docs.microsoft.com/en-us/windows/win32/seccrypto/signtool)
- [codesign (macOS)](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
- [electron-builder](https://www.electron.build/)

## ❓ FAQ

**Q: Can I test without certificates?**
A: Yes, but users will see security warnings. Use `"sign": false` in electron-builder config for testing.

**Q: How much do certificates cost?**
A: Windows: $200-500/year, macOS: $99/year (Apple Developer Program)

**Q: Can I use self-signed certificates?**
A: Only for internal testing. Production apps require trusted certificates.

**Q: What about Linux code signing?**
A: Optional. Most Linux users rely on package repository signatures.

**Q: How long does notarization take?**
A: Usually 5-15 minutes, can take up to an hour during peak times.