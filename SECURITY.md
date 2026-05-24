# Security Policy for Pixaroid

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.1.x   | :white_check_mark: |
| < 3.0   | :x:                |

## Reporting a Vulnerability

We take the security of Pixaroid seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Please do NOT report security vulnerabilities through public GitHub issues.**

### How to Report

1. **Email**: Send an email to `support@pixaroid.vercel.app` (or create a GitHub Security Advisory)
2. **Include**: 
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes

### What to Expect

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days
- **Resolution Timeline**: Depends on severity (critical: 24-72 hours)

## Security Features

### Browser-Based Processing
✅ **Zero Uploads**: All image processing happens locally in your browser  
✅ **No Server Storage**: Files never leave your device  
✅ **No Data Collection**: We don't collect or store user data  

### Technical Safeguards

- **Content Security Policy (CSP)**: Prevents XSS attacks
- **Service Worker Isolation**: Cached assets are versioned and isolated
- **HTTPS Only**: All connections are encrypted
- **No Third-Party Scripts**: Minimal external dependencies

### Known Limitations

⚠️ **Web Workers**: Processing happens in Web Workers, which have limited access to system resources  
⚠️ **Memory Constraints**: Large files may cause browser memory warnings  
⚠️ **Browser Compatibility**: Some features require modern browsers (Chrome 80+, Firefox 75+)  

## Bug Bounty Program

Currently, we do not offer monetary rewards for security reports. However, we will:

- Credit reporters in our security acknowledgments (unless they prefer anonymity)
- Provide early access to new features
- List contributors in our README

## Security Updates

Security patches are released as soon as possible. Users should:

1. Keep their browser updated
2. Clear cache if experiencing issues
3. Check the changelog for security updates

---

Last updated: May 2024
