# API Reference - Okta SE Toolkit

This document describes the internal APIs and functions used throughout the Okta SE Toolkit.

## Table of Contents

- [Server Actions](#server-actions)
- [API Routes](#api-routes)
- [Context API](#context-api)
- [Type Definitions](#type-definitions)

---

## Server Actions

Server Actions are defined in `app/actions/oktaActions.ts` and handle all Okta Management API interactions.

### `enableFIDO2(config: OktaConfig): Promise<OktaActionResult>`

Enables the FIDO2/WebAuthn authenticator in the Okta org.

**Parameters:**
- `config` - Okta configuration with org URL and API token

**Returns:**
- `OktaActionResult` with success status and message

**Behavior:**
- Checks if FIDO2 authenticator exists
- Activates if found but inactive
- Creates new authenticator if not found
- Returns success if already enabled

**Okta API Endpoints:**
- `GET /api/v1/authenticators`
- `POST /api/v1/authenticators/{id}/lifecycle/activate`
- `POST /api/v1/authenticators`

**Required Permissions:**
- `okta.authenticators.manage`

---

### `createSuperAdminsGroup(config: OktaConfig): Promise<OktaActionResult>`

Creates a "Super Administrators" group for high-privilege admin access.

**Parameters:**
- `config` - Okta configuration

**Returns:**
- `OktaActionResult` with group ID in data field if successful

**Behavior:**
- Searches for existing "Super Administrators" group
- Returns existing group if found
- Creates new group if not found

**Okta API Endpoints:**
- `GET /api/v1/groups?q=Super%20Administrators`
- `POST /api/v1/groups`

**Required Permissions:**
- `okta.groups.manage`

---

### `assignSuperAdminRole(config: OktaConfig, groupId: string): Promise<OktaActionResult>`

Assigns the SUPER_ADMIN role to a specified group.

**Parameters:**
- `config` - Okta configuration
- `groupId` - ID of the group to assign the role to

**Returns:**
- `OktaActionResult` with success status

**Behavior:**
- Checks if group already has SUPER_ADMIN role
- Assigns role if not present
- Returns success if already assigned

**Okta API Endpoints:**
- `GET /api/v1/groups/{groupId}/roles`
- `POST /api/v1/groups/{groupId}/roles`

**Required Permissions:**
- `okta.roles.manage`
- Must have SUPER_ADMIN privileges to assign SUPER_ADMIN

---

### `updateAdminConsolePolicy(config: OktaConfig): Promise<OktaActionResult>`

Updates the Okta Admin Console access policy to require strong 2FA.

**Parameters:**
- `config` - Okta configuration

**Returns:**
- `OktaActionResult` with success status

**Behavior:**
- Locates the Okta Admin Console application
- Finds the ACCESS_POLICY (app sign-in policy)
- Creates or updates "Admin App Policy" rule with:
  - Phishing-resistant authentication
  - Hardware-protected keys
  - User presence verification
  - ASSURANCE mode (2FA required)

**Okta API Endpoints:**
- `GET /api/v1/apps` (filter by label)
- `GET /api/v1/apps/{appId}/policies`
- `GET /api/v1/policies/{policyId}/rules`
- `PUT /api/v1/policies/{policyId}/rules/{ruleId}`

**Required Permissions:**
- `okta.policies.manage`

---

### `populateDemoUsers(config: OktaConfig): Promise<OktaActionResult>`

Creates 15 realistic demo user accounts with varied attributes.

**Parameters:**
- `config` - Okta configuration

**Returns:**
- `OktaActionResult` with count of successfully created users

**Behavior:**
- Generates 15 users with:
  - Random first/last names from predefined lists
  - Email format: `{firstName}.{lastName}+demo@atko.email`
  - Department, title, city, state, street address
  - Title aligned with department
- Skips users that already exist (no error)
- Returns count of new users created

**Okta API Endpoints:**
- `POST /api/v1/users?activate=true` (x15)

**Required Permissions:**
- `okta.users.manage`

---

### `createStandardDepartmentGroups(config: OktaConfig): Promise<OktaActionResult>`

Creates standard department groups and auto-assignment rules.

**Parameters:**
- `config` - Okta configuration

**Returns:**
- `OktaActionResult` with details of created groups and rules

**Behavior:**
- Creates groups: Engineering, Sales, Marketing, Finance, Human Resources
- Creates group rules to assign users to these groups based on `user.department`
- Activates rules immediately
- Checks for existing groups/rules to avoid duplicates

**Okta API Endpoints:**
- `GET /api/v1/groups`
- `POST /api/v1/groups`
- `POST /api/v1/groups/rules`
- `POST /api/v1/groups/rules/{id}/lifecycle/activate`

**Required Permissions:**
- `okta.groups.manage`

---

### `createDeviceAssurancePolicies(config: OktaConfig): Promise<OktaActionResult>`

Creates device assurance policies for all platforms.

**Parameters:**
- `config` - Okta configuration

**Returns:**
- `OktaActionResult` with details of created policies

**Behavior:**
- Creates policies: Android, iOS, macOS, Windows
- Sets empty settings (no checks enabled)
- Checks for existing policies to avoid duplicates

**Okta API Endpoints:**
- `POST /api/v1/device-assurance-policies`

**Required Permissions:**
- `okta.policies.manage`

---

### `configureEntityRiskPolicy(config: OktaConfig): Promise<OktaActionResult>`

Configures Entity Risk Policy with rules for each detection type.

**Parameters:**
- `config` - Okta configuration

**Returns:**
- `OktaActionResult` with details of created rules

**Behavior:**
- Locates the "Continuous Access" (Entity Risk) policy
- Creates rules for: Session anomaly, IP anomaly, Device anomaly, Entity critical action, Entity behavior drift
- Sets action to "No Action" (Allow access)
- Checks for existing rules to avoid duplicates

**Okta API Endpoints:**
- `GET /api/v1/policies?type=continuous_access`
- `GET /api/v1/policies/{id}/rules`
- `POST /api/v1/policies/{id}/rules`

**Required Permissions:**
- `okta.policies.manage`

---

### `addSalesforceSAMLApp(config: OktaConfig): Promise<OktaActionResult>`

Adds Salesforce application from the Okta Integration Network with SAML 2.0 configuration.

**Parameters:**
- `config` - Okta configuration

**Returns:**
- `OktaActionResult` with app ID on success

**Behavior:**
- Creates Salesforce app with pre-configured SAML 2.0 settings
- Sets standard Salesforce SAML parameters
- Uses `salesforce` as catalog app name
- Returns success if already exists

**Okta API Endpoints:**
- `POST /api/v1/apps`

**Required Permissions:**
- `okta.apps.manage`

---

### `addBoxApp(config: OktaConfig): Promise<OktaActionResult>`

Adds Box application from the Okta Integration Network with SAML 2.0 configuration.

**Parameters:**
- `config` - Okta configuration

**Returns:**
- `OktaActionResult` with app ID on success

**Behavior:**
- Creates Box app with pre-configured SAML 2.0 settings
- Sets Box-specific SAML parameters
- Uses `boxnet` as catalog app name
- Returns success if already exists

**Okta API Endpoints:**
- `POST /api/v1/apps`

**Required Permissions:**
- `okta.apps.manage`

---

### `createAccessCertificationCampaign(config: OktaConfig): Promise<OktaActionResult>`

Creates a quarterly recurring access certification campaign for reviewing app assignments.

**Parameters:**
- `config` - Okta configuration

**Returns:**
- `OktaActionResult` with campaign ID on success

**Behavior:**
- Creates fallback reviewer user (`fallback.reviewer@atko.email`) if not exists
- Searches for existing fallback reviewer first
- Creates certification campaign with:
  - Name: "Quarterly Access Review - Manager"
  - Scope: All apps, active users only
  - Reviewers: Managers with fallback for users without managers
  - Start: 1 day from creation at 9 AM
  - Duration: 14 days
  - Recurrence: Quarterly (every 3 months)
  - Reminders: Weekly
- Returns success if campaign already exists

**Okta API Endpoints:**
- `GET /api/v1/users?search=profile.email eq "fallback.reviewer@atko.email"`
- `POST /api/v1/users?activate=true` (for fallback reviewer)
- `POST /api/v1/governance/campaigns`

**Required Permissions:**
- `okta.users.manage`
- `okta.governance.accessCertifications.manage`

**Prerequisites:**
- Okta Identity Governance must be enabled in the org

---

### `runAllScripts(config: OktaConfig): Promise<OktaActionResult>`

Executes all automation scripts in sequence.

**Parameters:**
- `config` - Okta configuration

**Returns:**
- `OktaActionResult` with individual results in data field

**Behavior:**
- Runs all scripts in order:
  1. Enable FIDO2
  2. Create Super Admins Group (with auto-assigned SUPER_ADMIN role)
  3. Update Admin Console Policy
  4. Populate Demo Users
  5. Create Standard Department Groups
  6. Create Device Assurance Policies
  7. Configure Entity Risk Policy
  8. Add Salesforce SAML App
  9. Add Box App
  10. Create Access Certification Campaign
- Continues on error (doesn't stop at first failure)
- Returns consolidated results

**Returns Data Structure:**
```typescript
{
  success: boolean,
  message: string,
  data: {
    enableFIDO2: OktaActionResult,
    createSuperAdminsGroup: OktaActionResult,
    updateAdminConsolePolicy: OktaActionResult,
    populateDemoUsers: OktaActionResult,
    createStandardDepartmentGroups: OktaActionResult,
    createDeviceAssurancePolicies: OktaActionResult,
    configureEntityRiskPolicy: OktaActionResult,
    addSalesforceSAMLApp: OktaActionResult,
    addBoxApp: OktaActionResult,
    createAccessCertificationCampaign: OktaActionResult
  }
}
```

---

## API Routes

### `POST /api/test-connection`

Tests connectivity to an Okta organization.

**Request Body:**
```json
{
  "orgUrl": "https://your-org.okta.com",
  "apiToken": "your_api_token"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "email": "admin@example.com"
}
```

**Error Response (400/502/500):**
```json
{
  "error": "Error message",
  "status": 400
}
```

**Behavior:**
- Validates org URL and API token
- Calls `GET /api/v1/users/me` on Okta
- Returns authenticated user's email
- Used by Settings page "Test Connection" button

---

## Context API

### `OktaContext`

React Context that provides Okta credentials throughout the application.

**Provider:** `OktaProvider`

Wrap your application:
```tsx
<OktaProvider>
  {children}
</OktaProvider>
```

**Hook:** `useOkta()`

Access credentials in any component:
```tsx
const { orgUrl, apiToken, setOrgUrl, setApiToken, resetConfig, isInitialized } = useOkta();
```

**Context Value:**
```typescript
interface OktaContextValue {
  orgUrl: string;              // Okta org URL
  apiToken: string;            // API token
  setOrgUrl: (value: string) => void;
  setApiToken: (value: string) => void;
  resetConfig: () => void;     // Clear all credentials
  isInitialized: boolean;      // localStorage loaded
}
```

**Storage:**
- Credentials stored in browser localStorage
- Keys: `oktaOrgUrl`, `oktaApiToken`
- Automatically persisted on change
- Loaded on mount (client-side only)

---

## Type Definitions

### `OktaConfig`

Configuration for Okta API connections.

```typescript
interface OktaConfig {
  orgUrl: string;    // Base URL: https://your-org.okta.com
  apiToken: string;  // API token for authentication
}
```

### `OktaActionResult<T>`

Standard result object from automation actions.

```typescript
interface OktaActionResult<T = any> {
  success: boolean;  // Whether operation succeeded
  message: string;   // Human-readable result message
  data?: T;         // Optional result data
}
```

### `AutomationScript`

Metadata for an automation script.

```typescript
interface AutomationScript {
  id: string;        // Unique identifier
  name: string;      // Display name
  description: string; // Brief description
}
```

---

## Helper Functions

### `normalizeOrgUrl(orgUrl: string): string`

Removes trailing slashes from org URL.

### `oktaHeaders(config: OktaConfig): HeadersInit`

Generates headers for Okta API requests:
```typescript
{
  'Authorization': 'SSWS {apiToken}',
  'Accept': 'application/json',
  'Content-Type': 'application/json'
}
```

### `safeJson<T>(res: Response): Promise<T | null>`

Safely parses JSON response, returns null on error.

---

## Error Handling

All Server Actions follow this pattern:

1. **API Errors**: Parse `errorSummary` from Okta response
2. **Network Errors**: Catch and return generic message
3. **Already Exists**: Return success (idempotent behavior)
4. **Partial Success**: Return counts/details of successes and failures

---

## Rate Limiting

Okta API rate limits vary by org tier. The toolkit does not implement rate limiting or retry logic. For bulk operations:

- Demo Users: 50 API calls

Consider implementing exponential backoff for production use.

---

## Security Best Practices

When extending the toolkit:

1. ✅ Validate all inputs before API calls
2. ✅ Never log API tokens
3. ✅ Use HTTPS for all Okta API calls
4. ✅ Parse error responses carefully (may contain sensitive info)
5. ✅ Implement proper error boundaries in UI
6. ✅ Use TypeScript strict mode

---

## Additional Resources

- [Okta Management API Reference](https://developer.okta.com/docs/reference/api/users/)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [React Context API](https://react.dev/reference/react/useContext)

---

**Last Updated**: December 11, 2025
