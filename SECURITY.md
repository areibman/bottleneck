# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| 0.x.x   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Create a Public Issue

Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.

### 2. Report Privately

Instead, please report security vulnerabilities by emailing us at:
**security@bottleneck-app.com** (replace with your actual security contact)

### 3. Include Details

Please include as much of the following information as possible:
- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

### 4. Response Timeline

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will provide a more detailed response within 7 days indicating the next steps
- We will keep you informed of the progress towards a fix and announcement
- We may ask for additional information or guidance

### 5. Responsible Disclosure

We ask that you:
- Give us reasonable time to investigate and fix the issue before making any information public
- Make a good faith effort to avoid privacy violations, destruction of data, and interruption or degradation of our services
- Only interact with accounts you own or with explicit permission of the account holder

## Security Features

### Code Signing
- Windows binaries are signed with a valid code signing certificate
- macOS applications are signed and notarized with Apple
- Checksums (SHA256) are provided for all releases

### Auto-Updates
- Updates are delivered over HTTPS
- Update packages are verified using code signatures
- Users can verify update authenticity before installation

### Data Protection
- Local data is stored in encrypted SQLite databases where possible
- GitHub tokens are stored securely using the system keychain
- No sensitive data is logged or transmitted to third parties

## Security Best Practices

### For Users
- Always download from official sources (GitHub Releases)
- Verify checksums of downloaded files
- Keep the application updated to the latest version
- Review permissions requested by the application

### For Developers
- Follow secure coding practices
- Run security scans on dependencies
- Use the principle of least privilege
- Validate all inputs and sanitize outputs

## Known Security Considerations

### Electron Security
- We follow Electron security best practices
- Context isolation is enabled
- Node.js integration is disabled in renderer processes
- Content Security Policy (CSP) is implemented

### Third-Party Dependencies
- Dependencies are regularly audited using `npm audit`
- Automated dependency updates are configured
- Security patches are applied promptly

## Security Updates

Security updates will be:
- Released as soon as possible after verification
- Announced through GitHub Security Advisories
- Documented in the changelog with appropriate severity levels
- Available through the auto-update mechanism

## Contact

For security-related questions that are not vulnerabilities, you can:
- Open a discussion on GitHub
- Contact the maintainers directly
- Email: security@bottleneck-app.com (replace with actual contact)

## Recognition

We appreciate security researchers who help keep our users safe. With your permission, we will:
- Credit you in our security advisories
- Include you in our acknowledgments
- Provide recognition in our documentation