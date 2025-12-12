# plan.md

## Project Overview

**Okta SE Toolkit** is a Next.js-based web application designed for Okta Sales Engineers to automate common setup and demo preparation tasks for Okta organizations. The toolkit provides a user-friendly interface to execute various Okta Management API operations without manual Admin Console navigation or CLI scripting.

## Purpose

This toolkit streamlines the repetitive setup work that SEs perform when:
- Preparing demo environments
- Configuring proof-of-concept (POC) organizations
- Setting up customer trial environments
- Testing new Okta features and configurations

By automating these tasks, SEs can:
- Save time on manual configuration
- Ensure consistent, repeatable setups
- Reduce human error in configuration
- Quickly enable Early Access features for experimentation

---

## Architecture

### Technology Stack
- **Framework**: Next.js 16.0.7 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **State Management**: React Context API
- **Storage**: Browser localStorage (client-side)
- **API**: Okta Management API v1

### Key Components

#### Frontend
- `app/page.tsx` - Home page with script runner interface
- `app/settings/page.tsx` - Configuration page for Okta credentials
- `app/components/ScriptRunner.tsx` - Main automation interface with script cards
- `app/components/SettingsPanel.tsx` - Credential management and connection testing
- `app/context/OktaContext.tsx` - Global state for Okta org URL and API token

#### Backend
- `app/actions/oktaActions.ts` - Server Actions that call Okta Management API
- `app/api/test-connection/route.ts` - API route for testing Okta connectivity

#### Types & Data
- `lib/types/okta.ts` - TypeScript interfaces for Okta config and results
- `lib/types/automation.ts` - TypeScript interfaces for automation scripts
- `lib/data/automationScripts.ts` - Metadata for available automation scripts

---

## Features

### 1. Credential Management
- Store Okta Org URL and API Token in browser localStorage
- Validate credentials format before saving
- Test connection to verify token permissions
- Clear/reset stored credentials

### 2. Automation Scripts

The toolkit provides ten automation scripts:

#### a. Enable FIDO2 Authenticator
- **Purpose**: Activate WebAuthn/FIDO2 as an authentication option
- **Implementation**: Creates or activates the `webauthn` authenticator via `/api/v1/authenticators`
- **Handles**: Already-enabled scenarios gracefully

#### b. Create Super Administrators Group
- **Purpose**: Create a privileged admin group and automatically assign SUPER_ADMIN role
- **Implementation**: 
  - Creates group named "Super Administrators" via `/api/v1/groups`
  - Automatically assigns SUPER_ADMIN role via `/api/v1/groups/{groupId}/roles`
  - Checks if role is already assigned to avoid duplicates
- **Handles**: 
  - Existing group detection by name
  - Already-assigned role scenarios
- **Smart Messaging**:
  - "Group created and SUPER_ADMIN role assigned" (new group)
  - "Group already exists with SUPER_ADMIN role" (no changes needed)
  - "Group exists, SUPER_ADMIN role assigned" (role was added to existing group)

#### c. Update Admin Console Policy
- **Purpose**: Configure authentication policy for Okta Admin Console access
- **Implementation**: 
  - Locates ACCESS_POLICY (app sign-in policy)
  - Creates/updates "Admin App Policy" rule with:
    - 2FA requirement (ASSURANCE mode)
    - Phishing-resistant factors
    - Hardware-protected authenticators
    - User presence and verification required
- **Use Case**: Enforce strong authentication for admin access

#### d. Populate Demo Users
- **Purpose**: Create 15 realistic demo user accounts
- **Implementation**:
  - Generates users with firstName, lastName, email, department, title, city, state, streetAddress
  - Aligns titles with departments (Engineering, Sales, Marketing, Finance, HR)
  - Distributes users across multiple US cities
  - Uses `+demo` email convention for synthetic accounts
- **Handles**: "User already exists" scenarios gracefully

#### e. Create Standard Department Groups
- **Purpose**: Create groups for standard departments and auto-assign users
- **Implementation**:
  - Creates groups: Engineering, Sales, Marketing, Finance, Human Resources
  - Creates group rules to assign users based on `user.department` attribute
  - Activates rules immediately
- **Handles**: Existing groups and rules gracefully

#### f. Create Device Assurance Policies
- **Purpose**: Create device assurance policies for all platforms
- **Implementation**:
  - Creates policies: Android, iOS, macOS, Windows
  - Sets empty settings (no checks enabled)
- **Handles**: Existing policies gracefully

#### g. Configure Entity Risk Policy
- **Purpose**: Configure Entity Risk Policy with rules for each detection type
- **Implementation**:
  - Locates the "Continuous Access" (Entity Risk) policy
  - Creates rules for: Session anomaly, IP anomaly, Device anomaly, Entity critical action, Entity behavior drift
  - Sets action to "No Action" (Allow access)
- **Handles**: Existing rules gracefully

#### h. Add Salesforce SAML App
- **Purpose**: Add Salesforce application from the Okta Integration Network
- **Implementation**:
  - Creates Salesforce app via `/api/v1/apps`
  - Configures SAML 2.0 authentication
  - Sets standard SAML parameters (ACS URL, audience, etc.)
  - Uses email as NameID format
- **Handles**: Already-added app scenarios gracefully

#### i. Add Box App
- **Purpose**: Add Box application from the Okta Integration Network
- **Implementation**:
  - Creates Box app via `/api/v1/apps`
  - Configures SAML 2.0 authentication
  - Sets Box-specific SAML parameters
  - Uses email as NameID format
- **Handles**: Already-added app scenarios gracefully

#### j. Create Access Certification Campaign
- **Purpose**: Set up a quarterly recurring access certification campaign for Identity Governance and Administration (IGA) demos
- **Implementation**:
  - Creates fallback reviewer user (`fallback.reviewer@atko.email`) if not exists
  - Creates certification campaign via `/api/v1/governance/campaigns`
  - Reviews all app assignments for all active users
  - Assigns managers as reviewers with fallback reviewer for users without managers
  - Starts 1 day from creation, runs for 14 days
  - Recurs quarterly (every 3 months)
  - Enables weekly reminders
- **Configuration**:
  - Campaign Name: "Quarterly Access Review - Manager"
  - Resource Type: All apps
  - User Status: Active users only
  - Reviewer Type: Manager with fallback
  - Duration: 14 days per campaign
  - Recurrence: Quarterly
- **Handles**: Already-created campaign scenarios gracefully
- **Use Case**: Demonstrates Identity Governance capabilities for access reviews

### 3. Bulk Execution
- **"Run All Scripts"** button executes all ten scripts in sequence
- Displays individual success/error status for each script
- Provides consolidated summary of overall execution

### 4. User Experience
- Visual status indicators (success/error badges) on each script card
- Loading spinners during execution
- Disabled state management (prevents concurrent runs)
- Contextual error messages with specific failure details
- Credential validation warnings
- Connection test with authenticated user email display

---

## Data Flow

### Configuration Flow
1. User enters Okta Org URL and API Token in Settings
2. Credentials stored in browser localStorage via `OktaContext`
3. Optional connection test via `/api/test-connection`
4. Credentials persisted across sessions

### Automation Flow
1. User clicks "Run" on a script or "Run All Scripts"
2. `ScriptRunner` validates credentials exist
3. Builds `OktaConfig` from context
4. Calls corresponding function in `oktaActions.ts`
5. Server Action executes Okta Management API calls
6. Returns `OktaActionResult` with success/failure status
7. UI updates with status badge and message

---

## Security Considerations

### Current Implementation
- **Client-side storage**: API tokens stored in browser localStorage
- **No server-side persistence**: Tokens never stored on server
- **HTTPS enforcement**: Org URL must start with `https://`
- **Token validation**: Basic length and format checks

### Security Notes
⚠️ **Important**: This toolkit is designed for **internal SE use only** and assumes:
- Users have legitimate access to the Okta org
- API tokens have appropriate scopes for operations
- Tokens are kept secure by the SE (single-user context)

### Production Considerations
For production or multi-user deployments, consider:
- Server-side token encryption
- OAuth 2.0 token exchange instead of static tokens
- Role-based access control
- Audit logging of all API operations
- Token rotation policies

---

## API Permissions Required

The Okta API token must have these scopes/permissions:

| Script | Required Permissions |
|--------|---------------------|
| Enable FIDO2 | `okta.authenticators.manage` |
| Create Super Admins Group | `okta.groups.manage`, `okta.roles.manage` (for SUPER_ADMIN assignment) |
| Update Admin Console Policy | `okta.policies.manage` |
| Populate Demo Users | `okta.users.manage` |
| Create Standard Department Groups | `okta.groups.manage` |
| Create Device Assurance Policies | `okta.policies.manage` |
| Configure Entity Risk Policy | `okta.policies.manage` |
| Add Salesforce SAML App | `okta.apps.manage` |
| Add Box App | `okta.apps.manage` |
| Create Access Certification Campaign | `okta.users.manage`, `okta.governance.accessCertifications.manage` |

**Recommended Token Type**: Create a token with `Super Administrator` privileges or ensure all scopes above are granted.

**Note**: The Access Certification Campaign script requires the Okta Identity Governance feature to be enabled in your org.

---

## Error Handling

### Graceful Degradation
- **Already exists**: Scripts detect existing resources and report success without error
- **Already enabled**: Features already active are skipped with success status
- **Partial failures**: Bulk operations (demo users, EA features) report per-item success/failure

### Error Reporting
- HTTP status codes from Okta API surfaced to user
- `errorSummary` from Okta response displayed in UI
- Unexpected errors caught and displayed with generic message
- Console logging for debugging server-side issues

---

## Future Enhancements

### Potential Features
1. **Additional Scripts**
   - Import brand assets (logos, colors)
   - Configure password policies
   - Set up MFA policies
   - Create sample applications (OIDC, SAML)
   - Configure attribute mappings

2. **Script Customization**
   - Configurable demo user count
   - Custom department/title sets
   - Selective EA feature enabling (allow-list)

3. **Execution History**
   - Log of all script runs with timestamps
   - Export logs for troubleshooting
   - Undo/rollback capabilities

4. **Multi-Org Support**
   - Save multiple Okta org profiles
   - Quick-switch between orgs
   - Bulk operations across orgs

5. **Templates**
   - Save script configurations as templates
   - Share templates with team
   - Import/export template definitions

---

## Development

### Running Locally
```bash
npm install
npm run dev
```

Application runs at `http://localhost:3000`

### Project Structure
```
okta-se-toolkit/
├── app/
│   ├── actions/         # Server Actions (Okta API calls)
│   ├── api/            # API Routes (connection testing)
│   ├── components/     # React components
│   ├── context/        # React Context providers
│   ├── settings/       # Settings page
│   ├── layout.tsx      # Root layout with OktaProvider
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── lib/
│   ├── data/           # Static data (script definitions)
│   └── types/          # TypeScript type definitions
└── public/             # Static assets
```

### Type Safety
- All Okta API responses typed with TypeScript interfaces
- Strict mode enabled in `tsconfig.json`
- No implicit `any` types allowed

---

## Deployment

### Recommended Platforms
- **Vercel** (Next.js creator, zero-config deployment)
- **Netlify** (Edge Functions support)
- **AWS Amplify** (full-stack hosting)

### Environment Variables
None required - credentials stored client-side

### Build Command
```bash
npm run build
npm run start
```

---

## Maintenance

### Dependencies
- Keep Next.js updated for security patches
- Monitor Okta API v1 deprecation notices
- Test against new Okta API versions

### Known Limitations
- Okta API rate limits apply (varies by tier)
- Some EA features may require additional permissions
- SUPER_ADMIN role assignment may fail without adequate token privileges
- Admin Console policy updates assume specific policy structure

---

## Support

### Troubleshooting
1. **Connection Test Fails**
   - Verify org URL format (must be `https://your-org.okta.com`)
   - Check API token has not expired
   - Confirm token has required scopes

2. **Script Fails with 403**
   - Token lacks required permission
   - Org feature not enabled (e.g., EA features in preview org)

3. **Demo Users Already Exist**
   - Not an error - script skips existing users
   - Use different email domain in code if needed

### Resources
- [Okta Management API Documentation](https://developer.okta.com/docs/reference/api/users/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## License

Internal Okta SE tool - not for external distribution

---

## Contributors

Developed for Okta Sales Engineering team

**Last Updated**: December 11, 2025
