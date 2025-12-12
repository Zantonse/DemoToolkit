# Okta SE Toolkit

A Next.js-based web application designed for Okta Sales Engineers to automate common setup and demo preparation tasks for Okta organizations.

## Overview

The Okta SE Toolkit streamlines repetitive setup work by providing a user-friendly interface to execute various Okta Management API operations without manual Admin Console navigation or CLI scripting.

**⚠️ Important**: This toolkit is designed for **internal SE use only** with single-user deployment. See [Security Considerations](#security-considerations) for production deployment guidance.

## Features

### 🔐 Credential Management
- Store Okta Org URL and API Token in browser localStorage
- Validate credentials format before saving
- Test connection to verify token permissions
- Clear/reset stored credentials

### 🤖 Automation Scripts

1. **Enable FIDO2 Authenticator** - Activate WebAuthn/FIDO2 authentication
2. **Create Super Administrators Group** - Create privileged admin group and auto-assign SUPER_ADMIN role
3. **Update Admin Console Policy** - Configure 2FA for admin access
4. **Populate Demo Users** - Create 50 realistic demo user accounts
5. **Add Salesforce SAML App** - Add Salesforce from catalog with SAML 2.0
6. **Add Box App** - Add Box from catalog with SAML 2.0

### ⚡ Bulk Execution
- **"Run All Scripts"** button executes all automations in sequence
- Individual success/error status for each script
- Consolidated execution summary
- Automatic dependency handling (e.g., creates group before assigning roles)



## Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm, yarn, pnpm, or bun
- An Okta organization with API access
- An API token with appropriate permissions (see [Required Permissions](#required-permissions))

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd okta-se-toolkit
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Configuration

1. Navigate to **Settings** (top-right corner)
2. Enter your **Okta Org URL** (e.g., `https://your-org.okta.com`)
3. Enter your **API Token**
4. Click **Test Connection** to verify credentials
5. Click **Save Settings**

Your credentials are stored in browser localStorage and persist across sessions.

## Required Permissions

The Okta API token must have these scopes:

| Script | Required Permissions |
|--------|---------------------|
| Enable FIDO2 | `okta.authenticators.manage` |
| Create Super Admins Group | `okta.groups.manage`, `okta.roles.manage` |
| Update Admin Console Policy | `okta.policies.manage` |
| Populate Demo Users | `okta.users.manage` |
| Add Salesforce SAML App | `okta.apps.manage` |
| Add Box App | `okta.apps.manage` |

**Recommended**: Create a token with `Super Administrator` privileges to ensure all scripts work correctly.

## Project Structure

```
okta-se-toolkit/
├── app/
│   ├── actions/             # Server Actions (Okta API calls)
│   │   └── oktaActions.ts
│   ├── api/                # API Routes
│   │   └── test-connection/
│   │       └── route.ts
│   ├── components/         # React components
│   │   ├── ScriptRunner.tsx
│   │   └── SettingsPanel.tsx
│   ├── context/            # React Context providers
│   │   └── OktaContext.tsx
│   ├── settings/           # Settings page
│   │   └── page.tsx
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── lib/
│   ├── data/               # Static data
│   │   └── automationScripts.ts
│   └── types/              # TypeScript types
│       ├── automation.ts
│       └── okta.ts
├── public/                 # Static assets
├── plan.md                 # Project documentation
└── README.md              # This file
```

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Technology Stack

- **Framework**: Next.js 16.0.7 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **State Management**: React Context API
- **Storage**: Browser localStorage (client-side)

## Security Considerations

### Current Implementation
- API tokens stored in browser localStorage (client-side only)
- Tokens never persisted on server
- HTTPS enforcement for org URLs
- Basic token validation

### Production Deployment Recommendations
- Server-side token encryption
- OAuth 2.0 token exchange instead of static tokens
- Role-based access control
- Audit logging of all API operations
- Token rotation policies

## Deployment

### Recommended Platforms
- **Vercel** - Zero-config deployment for Next.js
- **Netlify** - Edge Functions support
- **AWS Amplify** - Full-stack hosting

### Build & Deploy

```bash
npm run build
npm run start
```

No environment variables required - credentials are stored client-side.

## Troubleshooting

### Connection Test Fails
- Verify org URL format (must be `https://your-org.okta.com`)
- Check API token has not expired
- Confirm token has required scopes

### Script Fails with 403
- Token lacks required permission
- Org feature not enabled (e.g., EA features in preview org)

### Demo Users Already Exist
- Not an error - script skips existing users
- Use different email domain in code if needed

## Contributing

This is an internal Okta SE tool. For questions or improvements, contact the SE team.

## Resources

- [Okta Management API Documentation](https://developer.okta.com/docs/reference/api/users/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## License

Internal Okta SE tool - not for external distribution.

---

**Last Updated**: December 11, 2025
