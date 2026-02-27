/**
 * Automation Scripts Metadata
 *
 * Defines the list of available automation scripts and their metadata.
 * These scripts are displayed in the UI and mapped to their corresponding
 * handler functions in app/actions/
 *
 * The ScriptId type is automatically derived from this array, so adding
 * a new script here automatically updates the type system.
 */

import type { AutomationScript } from '../types/automation';

/**
 * All valid script IDs as a const tuple for type derivation
 */
export const SCRIPT_IDS = [
  'enable-fido2',
  'create-super-admins-group',
  'populate-demo-users',
  'create-standard-department-groups',
  'create-device-assurance-policies',
  'configure-entity-risk-policy',
  'add-salesforce-saml-app',
  'add-box-app',
  'create-access-certification-campaign',
  'setup-realms',
  'add-new-administrator',
  'run-policy-simulation',
  'setup-sod-demo',
  'create-entitlement-bundles',
  'create-network-zone',
  'list-network-zones',
  'create-trusted-origin',
  'list-trusted-origins',
  'create-auth-server',
  'add-custom-claim',
  'add-custom-scope',
  'add-google-social-idp',
  'apply-customer-branding',
  'configure-authenticators',
  'configure-threat-insight',
  'reset-demo-user-pool',
  'create-authentication-policy',
  'setup-behavior-detection',
  'create-password-policy',
  'create-enrollment-policy',
  'enable-self-service-registration',
  'create-custom-admin-role',
  'setup-event-hooks',
  'create-oidc-app',
  'configure-auth-server-policy',
  'customize-activation-email',
] as const;

/**
 * Union type of all valid script IDs - derived from SCRIPT_IDS
 * Use this type instead of manually maintaining a union type
 */
export type ScriptId = (typeof SCRIPT_IDS)[number];

/**
 * Array of all available automation scripts
 * Order determines display order in the UI
 */
export const automationScripts: AutomationScript[] = [
  {
    id: "enable-fido2",
    name: "Enable FIDO2 Authenticator",
    description: "Configures and activates FIDO2 WebAuthn as an authentication option.",
    category: "Security & Policies"
  },
  {
    id: "create-super-admins-group",
    name: "Create Super Administrators Group",
    description: "Creates a high-privilege admin group and automatically assigns SUPER_ADMIN role.",
    category: "Setup & Users"
  },
  {
    id: "populate-demo-users",
    name: "Populate Demo Users",
    description: "Creates demo end-users and assigns them to standard groups.",
    category: "Setup & Users"
  },
  {
    id: "create-standard-department-groups",
    name: "Create Standard Department Groups",
    description: "Creates groups for Sales, Engineering, Marketing, Finance, HR, Partners, Contractors and adds rules to auto-assign users.",
    category: "Setup & Users"
  },
  {
    id: "create-device-assurance-policies",
    name: "Create Device Assurance Policies",
    description: "Creates device assurance policies for Android, iOS, macOS, and Windows. Requires Okta Identity Engine (OIE).",
    category: "Security & Policies"
  },
  {
    id: "configure-entity-risk-policy",
    name: "Review Entity Risk Policy",
    description: "Reviews the Entity Risk Policy and displays existing rules. Note: Entity Risk Policy rules are system-managed and must be configured in the Admin Console (Security > Entity Risk). Requires OIE with Risk-based authentication.",
    category: "Security & Policies"
  },
  {
    id: "add-salesforce-saml-app",
    name: "Add Salesforce SAML App",
    description: "Adds Salesforce from the app catalog with SAML 2.0 authentication.",
    category: "Applications"
  },
  {
    id: "add-box-app",
    name: "Add Box App",
    description: "Adds Box from the app catalog with SAML 2.0 authentication.",
    category: "Applications"
  },
  {
    id: "create-access-certification-campaign",
    name: "Create Access Certification Campaign",
    description: "Creates a quarterly recurring campaign to review all app assignments for active users. Managers review their reports' access with a fallback reviewer.",
    category: "Governance"
  },
  {
    id: "setup-realms",
    name: "Setup Realms",
    description: "Renames default realm to 'Employees' and creates 'Partners' and 'Contractors' realms.",
    category: "Setup & Users"
  },
  {
    id: "add-new-administrator",
    name: "Add New Administrator",
    description: "Creates a new admin user and adds them to the Super Administrators group.",
    category: "Setup & Users",
    requiresInput: true,
    inputFields: [
      {
        name: "firstName",
        label: "First Name",
        type: "text",
        placeholder: "John",
        required: true
      },
      {
        name: "lastName",
        label: "Last Name",
        type: "text",
        placeholder: "Doe",
        required: true
      },
      {
        name: "email",
        label: "Email / Username",
        type: "email",
        placeholder: "john.doe@example.com",
        required: true
      }
    ]
  },
  {
    id: "run-policy-simulation",
    name: "Run Policy Simulation",
    description: "Simulates policy evaluation for a selected application. Choose an app and policy types to see which policies and rules would apply. Leave policy types empty to simulate all types. Requires Okta Identity Engine (OIE).",
    category: "Security & Policies",
    requiresInput: true,
    inputFields: [
      {
        name: "appInstance",
        label: "Select Application",
        type: "select",
        required: true,
        dynamicOptions: true,
        placeholder: "Choose an application..."
      },
      {
        name: "policyTypes",
        label: "Policy Types to Simulate (Optional - leave empty for all)",
        type: "select",
        required: false,
        multiple: true,
        options: [
          { value: "ACCESS_POLICY", label: "App Sign-On Policy (ACCESS_POLICY)" },
          { value: "MFA_ENROLL", label: "Authenticator Enrollment Policy (MFA_ENROLL)" },
          { value: "OKTA_SIGN_ON", label: "Global Session Policy (OKTA_SIGN_ON)" },
          { value: "PROFILE_ENROLLMENT", label: "Profile Enrollment Policy (PROFILE_ENROLLMENT)" }
        ]
      }
    ]
  },
  {
    id: "setup-sod-demo",
    name: "Setup SoD Demo (NetSuite)",
    description: "Creates entitlements and SoD risk rule for a Separation of Duties demo. Requires OAuth credentials with OIG scopes. Works with any OIN app with governance enabled.",
    category: "Governance",
    requiresInput: true,
    inputFields: [
      {
        name: "appId",
        label: "Application Instance ID",
        type: "text",
        placeholder: "0oaxxxxxxxxxxxxxxxx",
        required: true
      },
      {
        name: "entitlementName",
        label: "Entitlement Name",
        type: "text",
        placeholder: "NetSuite Role",
        required: false
      },
      {
        name: "role1Name",
        label: "Role 1 (Creator Role)",
        type: "text",
        placeholder: "Payroll Administrator",
        required: false
      },
      {
        name: "role2Name",
        label: "Role 2 (Approver Role)",
        type: "text",
        placeholder: "Payroll Approver",
        required: false
      }
    ]
  },
  {
    id: "create-entitlement-bundles",
    name: "Create Entitlement Bundles",
    description: "Creates entitlement bundles for Access Requests. Use after setting up entitlements with the SoD Demo script - copy the IDs from that script's output. Requires OAuth credentials with OIG scopes.",
    category: "Governance",
    requiresInput: true,
    inputFields: [
      {
        name: "entitlementId",
        label: "Entitlement ID (from SoD Demo output)",
        type: "text",
        placeholder: "espxxxxxxxxxxxxxxxx",
        required: true
      },
      {
        name: "bundle1Name",
        label: "Bundle 1 Name (e.g., role name)",
        type: "text",
        placeholder: "Payroll Administrator",
        required: true
      },
      {
        name: "bundle1ValueId",
        label: "Bundle 1 Entitlement Value ID (from SoD Demo output)",
        type: "text",
        placeholder: "esvxxxxxxxxxxxxxxxx",
        required: true
      },
      {
        name: "bundle2Name",
        label: "Bundle 2 Name (Optional)",
        type: "text",
        placeholder: "Payroll Approver",
        required: false
      },
      {
        name: "bundle2ValueId",
        label: "Bundle 2 Entitlement Value ID (Optional)",
        type: "text",
        placeholder: "esvxxxxxxxxxxxxxxxx",
        required: false
      }
    ]
  },
  {
    id: "create-network-zone",
    name: "Create Network Zone",
    description: "Creates an IP-based network zone with specified CIDR ranges. Checks for an existing zone with the same name before creating.",
    category: "Security & Policies",
    requiresInput: true,
    inputFields: [
      {
        name: "name",
        label: "Zone Name",
        type: "text",
        placeholder: "Corporate Network",
        required: true
      },
      {
        name: "gateways",
        label: "Gateway CIDRs (comma-separated)",
        type: "text",
        placeholder: "10.0.0.0/8, 192.168.1.0/24",
        required: true
      }
    ]
  },
  {
    id: "list-network-zones",
    name: "List Network Zones",
    description: "Lists all configured network zones, including name, type, status, and number of gateways.",
    category: "Security & Policies"
  },
  {
    id: "create-trusted-origin",
    name: "Create Trusted Origin",
    description: "Creates a trusted origin for CORS and/or Redirect (sign-in/sign-out) flows. Checks for an existing origin with the same URL before creating.",
    category: "Security & Policies",
    requiresInput: true,
    inputFields: [
      {
        name: "name",
        label: "Origin Name",
        type: "text",
        placeholder: "My App Origin",
        required: true
      },
      {
        name: "origin",
        label: "Origin URL",
        type: "text",
        placeholder: "https://example.com",
        required: true
      },
      {
        name: "scopes",
        label: "Scope Types",
        type: "select",
        required: true,
        multiple: true,
        options: [
          { value: "CORS", label: "CORS (Cross-Origin Resource Sharing)" },
          { value: "REDIRECT", label: "Redirect (Sign-in/Sign-out)" }
        ]
      }
    ]
  },
  {
    id: "list-trusted-origins",
    name: "List Trusted Origins",
    description: "Lists all configured trusted origins, including name, URL, enabled scopes, and status.",
    category: "Security & Policies"
  },
  {
    id: "create-auth-server",
    name: "Create Authorization Server",
    description: "Creates a custom OAuth 2.0 authorization server with specified audiences. Checks for an existing server with the same name before creating.",
    category: "Applications",
    requiresInput: true,
    inputFields: [
      {
        name: "name",
        label: "Server Name",
        type: "text",
        placeholder: "My API Authorization Server",
        required: true
      },
      {
        name: "audiences",
        label: "Audiences (comma-separated)",
        type: "text",
        placeholder: "api://myapp, https://api.example.com",
        required: true
      },
      {
        name: "description",
        label: "Description (optional)",
        type: "text",
        placeholder: "Authorization server for my application",
        required: false
      }
    ]
  },
  {
    id: "add-custom-claim",
    name: "Add Custom Claim",
    description: "Adds a custom claim to an authorization server using an Okta expression. The claim can target access tokens (RESOURCE) or ID tokens (IDENTITY).",
    category: "Applications",
    requiresInput: true,
    inputFields: [
      {
        name: "authServerId",
        label: "Authorization Server",
        type: "select",
        required: true,
        dynamicOptions: true,
        placeholder: "Choose an authorization server..."
      },
      {
        name: "claimName",
        label: "Claim Name",
        type: "text",
        placeholder: "email",
        required: true
      },
      {
        name: "valueExpression",
        label: "Value Expression",
        type: "text",
        placeholder: "user.email",
        required: true
      },
      {
        name: "claimType",
        label: "Claim Type",
        type: "select",
        required: true,
        options: [
          { value: "RESOURCE", label: "Access Token (RESOURCE)" },
          { value: "IDENTITY", label: "ID Token (IDENTITY)" }
        ]
      }
    ]
  },
  {
    id: "add-custom-scope",
    name: "Add Custom Scope",
    description: "Adds a custom OAuth 2.0 scope to an authorization server. Scopes can require explicit user consent or be granted implicitly.",
    category: "Applications",
    requiresInput: true,
    inputFields: [
      {
        name: "authServerId",
        label: "Authorization Server",
        type: "select",
        required: true,
        dynamicOptions: true,
        placeholder: "Choose an authorization server..."
      },
      {
        name: "scopeName",
        label: "Scope Name",
        type: "text",
        placeholder: "read:profile",
        required: true
      },
      {
        name: "description",
        label: "Description (optional)",
        type: "text",
        placeholder: "Read user profile information",
        required: false
      },
      {
        name: "consent",
        label: "Consent",
        type: "select",
        required: true,
        options: [
          { value: "IMPLICIT", label: "Implicit (no user consent required)" },
          { value: "REQUIRED", label: "Required (user must consent)" }
        ]
      }
    ]
  },
  {
    id: "add-google-social-idp",
    name: "Add Google Social IdP",
    description: "Adds Google as a social identity provider for social login. Checks for an existing Google IdP before creating. Activates the IdP after creation.",
    category: "Applications",
    requiresInput: true,
    inputFields: [
      {
        name: "clientId",
        label: "Google Client ID",
        type: "text",
        placeholder: "1234567890-abc.apps.googleusercontent.com",
        required: true
      },
      {
        name: "clientSecret",
        label: "Google Client Secret",
        type: "text",
        placeholder: "GOCSPX-...",
        required: true
      }
    ]
  },
  {
    id: "apply-customer-branding",
    name: "Apply Customer Branding",
    description: "Updates the default brand theme with custom primary and secondary colors. Requires the Okta Brands API. Logo upload requires a separate multipart POST (not supported in this version).",
    category: "Customization",
    requiresInput: true,
    inputFields: [
      {
        name: "primaryColor",
        label: "Primary Color (hex)",
        type: "text",
        placeholder: "#1662DD",
        required: true
      },
      {
        name: "secondaryColor",
        label: "Secondary Color (hex, optional)",
        type: "text",
        placeholder: "#EB5757",
        required: false
      },
      {
        name: "logoUrl",
        label: "Logo URL (optional — note: logo upload not supported in this version)",
        type: "text",
        placeholder: "https://example.com/logo.png",
        required: false
      }
    ]
  },
  {
    id: "configure-authenticators",
    name: "Configure Authenticators",
    description: "Activates or deactivates selected authenticators in bulk. Skips authenticators that are already in the desired state.",
    category: "Security & Policies",
    requiresInput: true,
    inputFields: [
      {
        name: "authenticators",
        label: "Authenticators",
        type: "select",
        required: true,
        multiple: true,
        options: [
          { value: "okta_verify", label: "Okta Verify" },
          { value: "okta_email", label: "Okta Email" },
          { value: "phone_number", label: "Phone (SMS / Voice)" },
          { value: "security_question", label: "Security Question" },
          { value: "google_otp", label: "Google Authenticator" }
        ]
      },
      {
        name: "action",
        label: "Action",
        type: "select",
        required: true,
        options: [
          { value: "activate", label: "Activate" },
          { value: "deactivate", label: "Deactivate" }
        ]
      }
    ]
  },
  {
    id: "configure-threat-insight",
    name: "Configure ThreatInsight",
    description: "Displays the current ThreatInsight configuration and updates it to the selected action. Optionally excludes specific network zones from ThreatInsight evaluation.",
    category: "Security & Policies",
    requiresInput: true,
    inputFields: [
      {
        name: "action",
        label: "ThreatInsight Action",
        type: "select",
        required: true,
        options: [
          { value: "none", label: "None (disabled)" },
          { value: "audit", label: "Audit (log only)" },
          { value: "block", label: "Block (deny suspicious requests)" }
        ]
      },
      {
        name: "excludeZones",
        label: "Excluded Zone IDs (comma-separated, optional)",
        type: "text",
        placeholder: "nzo1abc, nzo2def",
        required: false
      }
    ]
  },
  {
    id: "reset-demo-user-pool",
    name: "Reset Demo User Pool",
    description: "Expires passwords and/or resets MFA factors for all active users in a group, making them ready for a fresh demo run.",
    category: "Setup & Users",
    requiresInput: true,
    inputFields: [
      {
        name: "groupName",
        label: "Group Name (leave blank for Everyone)",
        type: "text",
        placeholder: "Demo Users",
        required: false
      },
      {
        name: "resetPasswords",
        label: "Expire Passwords",
        type: "select",
        required: true,
        options: [
          { value: "yes", label: "Yes — expire passwords" },
          { value: "no", label: "No — keep passwords" }
        ]
      },
      {
        name: "resetFactors",
        label: "Reset MFA Factors",
        type: "select",
        required: true,
        options: [
          { value: "yes", label: "Yes — reset all enrolled factors" },
          { value: "no", label: "No — keep enrolled factors" }
        ]
      }
    ]
  },
  {
    id: "create-authentication-policy",
    name: "Create Authentication Policy",
    description: "Creates an app sign-on (ACCESS_POLICY) with a preset rule (phishing-resistant, passwordless, or step-up on new device) and assigns it to a selected application. Requires Okta Identity Engine (OIE).",
    category: "Security & Policies",
    requiresInput: true,
    inputFields: [
      {
        name: "name",
        label: "Policy Name",
        type: "text",
        placeholder: "Phishing Resistant MFA",
        required: true
      },
      {
        name: "preset",
        label: "Policy Preset",
        type: "select",
        required: true,
        options: [
          { value: "phishing-resistant", label: "Phishing-Resistant MFA (hardware key / passkey)" },
          { value: "passwordless", label: "Passwordless (device-bound possession factor)" },
          { value: "step-up-new-device", label: "Step-Up on New Device (2FA required for new devices)" }
        ]
      },
      {
        name: "appInstance",
        label: "Assign to Application",
        type: "select",
        required: true,
        dynamicOptions: true,
        placeholder: "Choose an application..."
      }
    ]
  },
  {
    id: "setup-behavior-detection",
    name: "Setup Behavior Detection",
    description: "Creates and activates the four standard Okta behavior detection rules: Velocity, New Device, New Geo-Location, and New IP. Skips any that already exist. Requires Okta Identity Engine (OIE).",
    category: "Security & Policies"
  },
  {
    id: "create-password-policy",
    name: "Create Password Policy",
    description: "Creates a Password Policy based on a compliance preset (NIST 800-63, PCI-DSS, or Strict) and optionally targets a specific group.",
    category: "Security & Policies",
    requiresInput: true,
    inputFields: [
      {
        name: "name",
        label: "Policy Name",
        type: "text",
        placeholder: "NIST 800-63 Password Policy",
        required: true
      },
      {
        name: "preset",
        label: "Compliance Preset",
        type: "select",
        required: true,
        options: [
          { value: "nist", label: "NIST 800-63 (min 8 chars, no forced rotation, dictionary check)" },
          { value: "pci", label: "PCI-DSS (min 12 chars, 90-day rotation, history, complexity)" },
          { value: "strict", label: "Strict (min 16 chars, no rotation, history 10, lockout after 5)" }
        ]
      },
      {
        name: "groupName",
        label: "Target Group Name (optional — leave blank for Everyone)",
        type: "text",
        placeholder: "Everyone",
        required: false
      }
    ]
  },
  {
    id: "create-enrollment-policy",
    name: "Create Authenticator Enrollment Policy",
    description: "Creates an MFA enrollment (MFA_ENROLL) policy that sets required and optional authenticators, then applies it to everyone. Requires Okta Identity Engine (OIE).",
    category: "Security & Policies",
    requiresInput: true,
    inputFields: [
      {
        name: "name",
        label: "Policy Name",
        type: "text",
        placeholder: "Standard MFA Enrollment",
        required: true
      },
      {
        name: "requiredAuthenticators",
        label: "Required Authenticators",
        type: "select",
        required: true,
        multiple: true,
        options: [
          { value: "okta_email", label: "Okta Email" },
          { value: "okta_verify", label: "Okta Verify" },
          { value: "phone_number", label: "Phone (SMS / Voice)" },
          { value: "webauthn", label: "WebAuthn (FIDO2)" }
        ]
      },
      {
        name: "optionalAuthenticators",
        label: "Optional Authenticators",
        type: "select",
        required: false,
        multiple: true,
        options: [
          { value: "okta_email", label: "Okta Email" },
          { value: "okta_verify", label: "Okta Verify" },
          { value: "phone_number", label: "Phone (SMS / Voice)" },
          { value: "webauthn", label: "WebAuthn (FIDO2)" },
          { value: "security_question", label: "Security Question" },
          { value: "google_otp", label: "Google Authenticator" }
        ]
      }
    ]
  },
  {
    id: "enable-self-service-registration",
    name: "Enable Self-Service Registration",
    description: "Creates a Profile Enrollment policy with self-registration enabled (email, firstName, lastName attributes) and assigns it to a selected application. Optionally requires email verification. Requires Okta Identity Engine (OIE).",
    category: "Security & Policies",
    requiresInput: true,
    inputFields: [
      {
        name: "appInstance",
        label: "Assign to Application",
        type: "select",
        required: true,
        dynamicOptions: true,
        placeholder: "Choose an application..."
      },
      {
        name: "requireEmailVerification",
        label: "Require Email Verification",
        type: "select",
        required: true,
        options: [
          { value: "yes", label: "Yes — require email verification" },
          { value: "no", label: "No — skip email verification" }
        ]
      }
    ]
  },
  {
    id: "create-custom-admin-role",
    name: "Create Custom Admin Role",
    description: "Creates a custom IAM administrator role with specific permissions. Resource sets and bindings can be configured separately in the Admin Console.",
    category: "Governance",
    requiresInput: true,
    inputFields: [
      {
        name: "label",
        label: "Role Label",
        type: "text",
        placeholder: "UserCreator",
        required: true
      },
      {
        name: "description",
        label: "Description",
        type: "text",
        placeholder: "Can only create and read users",
        required: true
      },
      {
        name: "permissions",
        label: "Permissions",
        type: "select",
        required: true,
        multiple: true,
        options: [
          { value: "okta.users.create", label: "okta.users.create" },
          { value: "okta.users.read", label: "okta.users.read" },
          { value: "okta.users.manage", label: "okta.users.manage" },
          { value: "okta.groups.read", label: "okta.groups.read" },
          { value: "okta.groups.manage", label: "okta.groups.manage" },
          { value: "okta.apps.read", label: "okta.apps.read" },
          { value: "okta.apps.manage", label: "okta.apps.manage" }
        ]
      }
    ]
  },
  {
    id: "setup-event-hooks",
    name: "Setup Event Hooks",
    description: "Creates and activates an Okta event hook that delivers selected event notifications to a specified webhook URL.",
    category: "Tools",
    requiresInput: true,
    inputFields: [
      {
        name: "webhookUrl",
        label: "Webhook URL",
        type: "text",
        placeholder: "https://your-webhook.example.com/hook",
        required: true
      },
      {
        name: "authHeader",
        label: "Authorization Header (optional)",
        type: "text",
        placeholder: "Bearer your-secret-token",
        required: false
      },
      {
        name: "events",
        label: "Events to Subscribe",
        type: "select",
        required: true,
        multiple: true,
        options: [
          { value: "user.lifecycle.create", label: "user.lifecycle.create" },
          { value: "user.lifecycle.deactivate", label: "user.lifecycle.deactivate" },
          { value: "user.lifecycle.suspend", label: "user.lifecycle.suspend" },
          { value: "group.user_membership.add", label: "group.user_membership.add" },
          { value: "group.user_membership.remove", label: "group.user_membership.remove" },
          { value: "user.account.lock", label: "user.account.lock" },
          { value: "user.mfa.factor.activate", label: "user.mfa.factor.activate" }
        ]
      }
    ]
  },
  {
    id: "create-oidc-app",
    name: "Create OIDC Application",
    description: "Creates an OIDC application (web, SPA, or service/M2M) and returns the client credentials. PKCE is enforced for web and SPA app types.",
    category: "Applications",
    requiresInput: true,
    inputFields: [
      {
        name: "label",
        label: "Application Name",
        type: "text",
        placeholder: "My OIDC App",
        required: true
      },
      {
        name: "appType",
        label: "Application Type",
        type: "select",
        required: true,
        options: [
          { value: "web", label: "Web (authorization_code + refresh_token)" },
          { value: "spa", label: "SPA / Browser (authorization_code, PKCE only)" },
          { value: "service", label: "Service / M2M (client_credentials)" }
        ]
      },
      {
        name: "redirectUris",
        label: "Redirect URIs (comma-separated, required for web/SPA)",
        type: "text",
        placeholder: "https://example.com/callback",
        required: false
      },
      {
        name: "postLogoutUris",
        label: "Post-Logout Redirect URIs (comma-separated, optional)",
        type: "text",
        placeholder: "https://example.com",
        required: false
      }
    ]
  },
  {
    id: "configure-auth-server-policy",
    name: "Configure Auth Server Access Policy",
    description: "Creates an access policy and default rule on an authorization server with configurable token lifetimes and allowed grant types.",
    category: "Applications",
    requiresInput: true,
    inputFields: [
      {
        name: "authServerId",
        label: "Authorization Server",
        type: "select",
        required: true,
        dynamicOptions: true,
        placeholder: "Choose an authorization server..."
      },
      {
        name: "policyName",
        label: "Policy Name",
        type: "text",
        placeholder: "API Access Policy",
        required: true
      },
      {
        name: "accessTokenLifetimeMinutes",
        label: "Access Token Lifetime (minutes)",
        type: "text",
        placeholder: "60",
        required: true
      },
      {
        name: "refreshTokenLifetimeMinutes",
        label: "Refresh Token Lifetime (minutes, 0 = unlimited)",
        type: "text",
        placeholder: "0",
        required: false
      },
      {
        name: "grantTypes",
        label: "Allowed Grant Types",
        type: "select",
        required: true,
        multiple: true,
        options: [
          { value: "authorization_code", label: "authorization_code" },
          { value: "client_credentials", label: "client_credentials" },
          { value: "refresh_token", label: "refresh_token" },
          { value: "implicit", label: "implicit" }
        ]
      }
    ]
  },
  {
    id: "customize-activation-email",
    name: "Customize Activation Email",
    description: "Creates or updates the user activation email template for the default brand. Uses the Okta Brands API. The body must include ${activationLink}.",
    category: "Customization",
    requiresInput: true,
    inputFields: [
      {
        name: "subject",
        label: "Email Subject",
        type: "text",
        placeholder: "Welcome to {{orgName}}!",
        required: true
      },
      {
        name: "body",
        label: "Email Body HTML (optional — leave blank for default template)",
        type: "text",
        placeholder: "<html>...(must include ${activationLink})</html>",
        required: false
      }
    ]
  }
];
