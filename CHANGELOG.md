# Changelog

All notable changes to the Okta SE Toolkit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-11

### Initial Release

#### Added
- **Automation Scripts**
  - Enable FIDO2 Authenticator
  - Create Super Administrators Group
  - Assign Super Admin Role to group
  - Update Admin Console Policy with 2FA requirements
  - Populate 50 demo users with realistic data

- **Core Features**
  - Settings page for Okta Org URL and API Token configuration
  - Client-side credential storage in localStorage
  - Connection test functionality
  - Individual script execution with status tracking
  - "Run All Scripts" bulk execution
  - Real-time success/error status indicators
  - Visual feedback with loading spinners and badges

- **UI/UX**
  - Clean, modern interface with Tailwind CSS
  - Responsive grid layout for script cards
  - Connection status indicator
  - Show/hide toggle for API token
  - Contextual error messages
  - Settings and home page navigation

- **Technical**
  - Next.js 16 App Router architecture
  - TypeScript with strict type checking
  - React Context for state management
  - Server Actions for Okta API calls
  - Comprehensive error handling
  - JSDoc documentation throughout codebase

- **Documentation**
  - README.md with setup and usage instructions
  - plan.md with technical architecture details
  - CONTRIBUTING.md with development guidelines
  - LICENSE file for internal use
  - Inline code comments and JSDoc
  - .env.example for reference

### Security Considerations
- Client-side only credential storage (localStorage)
- No server-side token persistence
- HTTPS enforcement for Okta org URLs
- Token validation before API calls

---

## Future Releases

See `plan.md` for planned features and enhancements.

### Potential Features
- Import brand assets (logos, colors)
- Configure password policies
- Set up MFA policies
- Create sample applications (OIDC, SAML)
- Configure attribute mappings
- Execution history and logging
- Multi-org support
- Template system for reusable configurations
