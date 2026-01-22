/**
 * Automation Scripts Metadata
 * 
 * Defines the list of available automation scripts and their metadata.
 * These scripts are displayed in the UI and mapped to their corresponding
 * handler functions in app/actions/oktaActions.ts
 * 
 * ⚠️ IMPORTANT: Script IDs must match the ScriptId type in ScriptRunner.tsx
 * and the corresponding handler function names.
 */

import type { AutomationScript } from '../types/automation';

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
    description: "Creates entitlements, SoD risk rule, and entitlement bundles for a Separation of Duties demo. Requires OAuth credentials with OIG scopes. Works with any OIN app with governance enabled.",
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
  }
];
