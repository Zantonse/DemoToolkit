// app/actions/oktaActions.ts
'use server';

import type { OktaConfig, OktaActionResult } from '../../lib/types/okta';
import {
  normalizeOrgUrl,
  oktaHeaders,
  safeJson,
  oktaFetch,
  type OktaAuthenticator,
  type OktaGroup,
  type OktaRoleAssignment,
} from './helpers';
import { getOAuthAccessToken, oigFetch } from './helpers/oauth';

/**
 * 1. Enable FIDO2/WebAuthn via Authenticators API
 * - If FIDO2 authenticator exists and is ACTIVE → no-op
 * - If exists but INACTIVE → activate via lifecycle
 * - If missing → create and activate
 */
export async function enableFIDO2(
  config: OktaConfig
): Promise<OktaActionResult> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const headers = oktaHeaders(config);

  try {
    // List authenticators
    const listRes = await fetch(`${baseUrl}/api/v1/authenticators`, {
      headers,
      cache: 'no-store',
    });

    if (!listRes.ok) {
      const body = await safeJson<any>(listRes);
      throw new Error(
        `Failed to list authenticators (${listRes.status}): ${
          body?.errorSummary || listRes.statusText
        }`
      );
    }

    const authenticators = (await listRes.json()) as OktaAuthenticator[];

    let webauthn = authenticators.find(
      (a) => a.key === 'webauthn' || a.key === 'security_key'
    );

    // If authenticator already exists and is active, we’re done.
    if (webauthn && webauthn.status === 'ACTIVE') {
      return {
        success: true,
        message: 'FIDO2 (WebAuthn) authenticator is already active.',
        data: webauthn,
      };
    }

    // If authenticator exists but is inactive, activate via lifecycle
    if (webauthn && webauthn.status !== 'ACTIVE') {
      const activateRes = await fetch(
        `${baseUrl}/api/v1/authenticators/${webauthn.id}/lifecycle/activate`,
        {
          method: 'POST',
          headers,
        }
      );

      if (!activateRes.ok) {
        const body = await safeJson<any>(activateRes);
        throw new Error(
          `Failed to activate FIDO2 authenticator (${activateRes.status}): ${
            body?.errorSummary || activateRes.statusText
          }`
        );
      }

      const data = await safeJson<any>(activateRes);
      return {
        success: true,
        message: 'FIDO2 (WebAuthn) authenticator activated.',
        data,
      };
    }

    // Otherwise, create the authenticator (if not present at all)
    const createRes = await fetch(`${baseUrl}/api/v1/authenticators`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        key: 'webauthn',
        name: 'FIDO2 (WebAuthn)',
        status: 'ACTIVE',
        type: 'webauthn',
      }),
    });

    if (!createRes.ok) {
      const body = await safeJson<any>(createRes);
      throw new Error(
        `Failed to create FIDO2 authenticator (${createRes.status}): ${
          body?.errorSummary || createRes.statusText
        }`
      );
    }

    const created = await createRes.json();
    return {
      success: true,
      message: 'FIDO2 (WebAuthn) authenticator created and enabled.',
      data: created,
    };
  } catch (err: any) {
    console.error('enableFIDO2 error', err);
    return {
      success: false,
      message: `Error enabling FIDO2/WebAuthn: ${err.message ?? String(err)}`,
    };
  }
}

/**
 * 2. Create "Super Administrators" group
 * - If group exists → return it
 * - Else → create
 */
export async function createSuperAdminsGroup(
  config: OktaConfig
): Promise<OktaActionResult<OktaGroup>> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const headers = oktaHeaders(config);

  try {
    const groupName = 'Super Administrators';

    // Try to find existing group by name
    const searchParam = encodeURIComponent(`profile.name eq "${groupName}"`);
    const listRes = await fetch(
      `${baseUrl}/api/v1/groups?search=${searchParam}`,
      {
        headers,
        cache: 'no-store',
      }
    );

    if (!listRes.ok) {
      const body = await safeJson<any>(listRes);
      throw new Error(
        `Failed to search groups (${listRes.status}): ${
          body?.errorSummary || listRes.statusText
        }`
      );
    }

    const existing = (await listRes.json()) as OktaGroup[];

    let group: OktaGroup;
    let wasCreated = false;

    if (existing.length > 0) {
      group = existing[0];
    } else {
      // Create group
      const createRes = await fetch(`${baseUrl}/api/v1/groups`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          profile: {
            name: groupName,
            description:
              'Privileged group for Okta Super Administrators created by Okta SE Toolkit.',
          },
        }),
      });

      if (!createRes.ok) {
        const body = await safeJson<any>(createRes);
        throw new Error(
          `Failed to create Super Administrators group (${createRes.status}): ${
            body?.errorSummary || createRes.statusText
          }`
        );
      }

      group = (await createRes.json()) as OktaGroup;
      wasCreated = true;
    }

    // Now automatically assign SUPER_ADMIN role to the group
    // First check if role is already assigned
    const rolesRes = await fetch(
      `${baseUrl}/api/v1/groups/${group.id}/roles`,
      {
        headers,
        cache: 'no-store',
      }
    );

    if (!rolesRes.ok) {
      const body = await safeJson<any>(rolesRes);
      // If we just created the group, this is a failure
      // If group existed, we can still report partial success
      return {
        success: !wasCreated, // Only success if group existed
        message: wasCreated 
          ? `Group created but failed to check roles (${rolesRes.status}): ${body?.errorSummary || rolesRes.statusText}`
          : `Group exists but failed to check roles (${rolesRes.status}): ${body?.errorSummary || rolesRes.statusText}`,
        data: group,
      };
    }

    const roles = (await rolesRes.json()) as OktaRoleAssignment[];
    const hasSuperAdmin = roles.some((role) => role.type === 'SUPER_ADMIN');

    if (!hasSuperAdmin) {
      // Assign SUPER_ADMIN role
      const assignRes = await fetch(
        `${baseUrl}/api/v1/groups/${group.id}/roles`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ type: 'SUPER_ADMIN' }),
        }
      );

      if (!assignRes.ok) {
        const body = await safeJson<any>(assignRes);
        return {
          success: false,
          message: `Group ${wasCreated ? 'created' : 'exists'} but failed to assign SUPER_ADMIN role (${assignRes.status}): ${
            body?.errorSummary || assignRes.statusText
          }`,
          data: group,
        };
      }
    }

    // Success!
    const statusMsg = wasCreated 
      ? 'Super Administrators group created and SUPER_ADMIN role assigned.'
      : hasSuperAdmin
        ? 'Super Administrators group already exists with SUPER_ADMIN role.'
        : 'Super Administrators group exists, SUPER_ADMIN role assigned.';

    return {
      success: true,
      message: statusMsg,
      data: group,
    };
  } catch (err: any) {
    console.error('createSuperAdminsGroup error', err);
    return {
      success: false,
      message: `Error creating Super Administrators group: ${
        err.message ?? String(err)
      }`,
    };
  }
}

/**
 * 3. Assign SUPER_ADMIN role to a group
 * - If SUPER_ADMIN already assigned → no-op
 * - Else → POST /api/v1/groups/{groupId}/roles
 *
 * NOTE: Requires a token with permission to assign SUPER_ADMIN via API.
 */
export async function assignSuperAdminRole(
  config: OktaConfig,
  groupId: string
): Promise<OktaActionResult> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const headers = oktaHeaders(config);

  try {
    if (!groupId) {
      throw new Error('groupId is required');
    }

    // List existing role assignments for the group
    const listRes = await fetch(
      `${baseUrl}/api/v1/groups/${groupId}/roles`,
      {
        headers,
        cache: 'no-store',
      }
    );

    if (!listRes.ok) {
      const body = await safeJson<any>(listRes);
      throw new Error(
        `Failed to list group role assignments (${listRes.status}): ${
          body?.errorSummary || listRes.statusText
        }`
      );
    }

    const roles = (await listRes.json()) as OktaRoleAssignment[];
    const alreadySuperAdmin = roles.some(
      (role) => role.type === 'SUPER_ADMIN'
    );

    if (alreadySuperAdmin) {
      return {
        success: true,
        message: 'SUPER_ADMIN role is already assigned to this group.',
        data: roles,
      };
    }

    // Assign SUPER_ADMIN
    const assignRes = await fetch(
      `${baseUrl}/api/v1/groups/${groupId}/roles`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'SUPER_ADMIN' }),
      }
    );

    if (!assignRes.ok) {
      const body = await safeJson<any>(assignRes);
      throw new Error(
        `Failed to assign SUPER_ADMIN role (${assignRes.status}): ${
          body?.errorSummary || assignRes.statusText
        }`
      );
    }

    const assignment = await assignRes.json();
    return {
      success: true,
      message: 'SUPER_ADMIN role assigned to group.',
      data: assignment,
    };
  } catch (err: any) {
    console.error('assignSuperAdminRole error', err);
    return {
      success: false,
      message: `Error assigning SUPER_ADMIN role: ${
        err.message ?? String(err)
      }`,
    };
  }
}

/**
 * Helper: generate realistic demo user profiles with consistent
 * department + title relationships and some location data.
 */
function buildDemoUserProfiles(count: number) {
  const departments = [
    {
      department: 'Engineering',
      titles: [
        'Senior Software Engineer',
        'Staff Software Engineer',
        'DevOps Engineer',
        'Security Engineer',
        'Engineering Manager',
      ],
    },
    {
      department: 'Sales',
      titles: [
        'Account Executive',
        'Sales Engineer',
        'Sales Manager',
        'Business Development Representative',
        'Customer Success Manager',
      ],
    },
    {
      department: 'Marketing',
      titles: [
        'Marketing Manager',
        'Growth Marketing Specialist',
        'Demand Generation Manager',
        'Content Strategist',
      ],
    },
    {
      department: 'Finance',
      titles: [
        'Finance Manager',
        'Senior Accountant',
        'FP&A Analyst',
        'Controller',
      ],
    },
    {
      department: 'Human Resources',
      titles: [
        'HR Manager',
        'Recruiter',
        'People Operations Specialist',
      ],
    },
  ];

  const cities = [
    { city: 'San Francisco', state: 'CA', street: '1 Market St' },
    { city: 'New York', state: 'NY', street: '350 5th Ave' },
    { city: 'Chicago', state: 'IL', street: '233 S Wacker Dr' },
    { city: 'Austin', state: 'TX', street: '500 Congress Ave' },
    { city: 'Seattle', state: 'WA', street: '500 5th Ave N' },
  ];

  const firstNames = [
    'Alex',
    'Taylor',
    'Jordan',
    'Casey',
    'Morgan',
    'Riley',
    'Jamie',
    'Cameron',
    'Avery',
    'Logan',
  ];

  const lastNames = [
    'Nguyen',
    'Garcia',
    'Patel',
    'Kim',
    'Johnson',
    'Lee',
    'Martinez',
    'Chen',
    'Brown',
    'Davis',
  ];

  const profiles: Array<{
    firstName: string;
    lastName: string;
    email: string;
    login: string;
    department: string;
    title: string;
    city: string;
    state: string;
    streetAddress: string;
  }> = [];

  for (let i = 0; i < count; i++) {
    const dept = departments[i % departments.length];
    const title = dept.titles[i % dept.titles.length];
    const loc = cities[i % cities.length];
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];

        // Using atko.email domain for demo users
    const emailLocal = `${firstName}.${lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const email = `${emailLocal}+demo${i + 1}@atko.email`;

    profiles.push({
      firstName,
      lastName,
      email,
      login: email,
      department: dept.department,
      title,
      city: loc.city,
      state: loc.state,
      streetAddress: loc.street,
    });
  }

  return profiles;
}

/**
 * 5. Populate 50 demo users with realistic data
 * - Titles aligned with departments
 * - Includes firstName, lastName, email, department, title, city, address
 * - Handles “already exists” gracefully
 */
export async function populateDemoUsers(
  config: OktaConfig
): Promise<OktaActionResult> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const headers = oktaHeaders(config);

  try {
    const profiles = buildDemoUserProfiles(15);

    const created: any[] = [];
    const skipped: { email: string; reason: string }[] = [];
    const errors: { email: string; error: string }[] = [];

    for (const profile of profiles) {
      try {
        const res = await fetch(
          `${baseUrl}/api/v1/users?activate=true`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              profile: {
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                login: profile.login,
                department: profile.department,
                title: profile.title,
                city: profile.city,
                state: profile.state,
                streetAddress: profile.streetAddress,
              },
            }),
          }
        );

        if (res.ok) {
          const user = await res.json();
          created.push(user);
          continue;
        }

        const body = await safeJson<any>(res);

        // Handle "already exists" as a non-fatal “skipped”
        const causeText =
          body?.errorCauses?.map((c: any) => c?.errorSummary).join('; ') ?? '';

        if (
          res.status === 400 &&
          /already exists/i.test(causeText)
        ) {
          skipped.push({
            email: profile.email,
            reason: causeText,
          });
          continue;
        }

        errors.push({
          email: profile.email,
          error:
            body?.errorSummary || causeText || res.statusText,
        });
      } catch (innerErr: any) {
        errors.push({
          email: profile.email,
          error: innerErr.message ?? String(innerErr),
        });
      }
    }

    const summary = {
      createdCount: created.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
      skipped,
      errors,
    };

    const success = errors.length === 0;
    const partialSuccess = errors.length > 0 && (created.length > 0 || skipped.length > 0);

    return {
      success,
      message: partialSuccess
        ? `Demo user population partially complete. Created: ${created.length}, Skipped: ${skipped.length}, Errors: ${errors.length}.`
        : `Demo user population complete. Created: ${created.length}, Skipped: ${skipped.length}, Errors: ${errors.length}.`,
      data: summary,
    };
  } catch (err: any) {
    console.error('populateDemoUsers error', err);
    return {
      success: false,
      message: `Error populating demo users: ${
        err.message ?? String(err)
      }`,
    };
  }
}

/**
 * 6. Add Salesforce application from catalog with SAML 2.0 authentication
 * 
 * This function adds the Salesforce app from the Okta Integration Network
 * with pre-configured SAML 2.0 settings.
 */
export async function addSalesforceSAMLApp(
  config: OktaConfig
): Promise<OktaActionResult> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const headers = oktaHeaders(config);

  try {
    // Create Salesforce app with SAML 2.0 configuration
    const appPayload = {
      name: 'salesforce',
      label: 'Salesforce',
      signOnMode: 'SAML_2_0',
      settings: {
        app: {
          instanceType: 'PRODUCTION', // or 'SANDBOX' - required field
        },
        signOn: {
          defaultRelayState: '',
          ssoAcsUrl: 'https://login.salesforce.com',
          idpIssuer: 'http://www.okta.com/${org.externalKey}',
          audience: 'https://saml.salesforce.com',
          recipient: 'https://login.salesforce.com',
          destination: 'https://login.salesforce.com',
          subjectNameIdTemplate: '${user.userName}',
          subjectNameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
          responseSigned: true,
          assertionSigned: true,
          signatureAlgorithm: 'RSA_SHA256',
          digestAlgorithm: 'SHA256',
          honorForceAuthn: true,
          authnContextClassRef: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
        },
      },
    };

    const createRes = await fetch(`${baseUrl}/api/v1/apps`, {
      method: 'POST',
      headers,
      body: JSON.stringify(appPayload),
      cache: 'no-store',
    });

    if (!createRes.ok) {
      const body = await safeJson<any>(createRes);
      
      // Check if app already exists
      if (body?.errorCode === 'E0000007' || body?.errorSummary?.includes('already exists')) {
        return {
          success: true,
          message: 'Salesforce SAML app already exists in your org.',
        };
      }

      throw new Error(
        `Failed to create Salesforce app (${createRes.status}): ${
          body?.errorSummary || createRes.statusText
        }`
      );
    }

    const app = await createRes.json();

    return {
      success: true,
      message: `Salesforce SAML app added successfully (App ID: ${app.id}).`,
      data: app,
    };
  } catch (err: any) {
    console.error('addSalesforceSAMLApp error', err);
    return {
      success: false,
      message: `Error adding Salesforce app: ${err.message ?? String(err)}`,
    };
  }
}

/**
 * 7. Add Box application from catalog with SAML 2.0 authentication
 * 
 * This function adds the Box app from the Okta Integration Network
 * with pre-configured SAML 2.0 settings.
 * Note: Box is identified as "boxnet" in the Okta catalog.
 */
export async function addBoxApp(
  config: OktaConfig
): Promise<OktaActionResult> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const headers = oktaHeaders(config);

  try {
    // Create Box app with SAML 2.0 configuration
    // Using "boxnet" as the name (Box's identifier in Okta catalog)
    const appPayload = {
      name: 'boxnet',
      label: 'Box',
      signOnMode: 'SAML_2_0',
      settings: {
        signOn: {
          defaultRelayState: '',
          ssoAcsUrl: 'https://sso.services.box.net/sp/ACS.saml2',
          idpIssuer: 'http://www.okta.com/${org.externalKey}',
          audience: 'https://sso.services.box.net/sp/ACS.saml2',
          recipient: 'https://sso.services.box.net/sp/ACS.saml2',
          destination: 'https://sso.services.box.net/sp/ACS.saml2',
          subjectNameIdTemplate: '${user.email}',
          subjectNameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          responseSigned: true,
          assertionSigned: true,
          signatureAlgorithm: 'RSA_SHA256',
          digestAlgorithm: 'SHA256',
          honorForceAuthn: true,
          authnContextClassRef: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
        },
      },
    };

    const createRes = await fetch(`${baseUrl}/api/v1/apps`, {
      method: 'POST',
      headers,
      body: JSON.stringify(appPayload),
      cache: 'no-store',
    });

    if (!createRes.ok) {
      const body = await safeJson<any>(createRes);
      
      // Check if app already exists
      if (body?.errorCode === 'E0000007' || body?.errorSummary?.includes('already exists')) {
        return {
          success: true,
          message: 'Box app already exists in your org.',
        };
      }

      throw new Error(
        `Failed to create Box app (${createRes.status}): ${
          body?.errorSummary || createRes.statusText
        }`
      );
    }

    const app = await createRes.json();

    return {
      success: true,
      message: `Box app added successfully (App ID: ${app.id}).`,
      data: app,
    };
  } catch (err: any) {
    console.error('addBoxApp error', err);
    return {
      success: false,
      message: `Error adding Box app: ${err.message ?? String(err)}`,
    };
  }
}

/**
 * 8. Create Access Certification Campaign
 * 
 * Creates a quarterly recurring access certification campaign that reviews
 * all app assignments for all active users. Managers are assigned as reviewers,
 * with a fallback reviewer for users without managers.
 * 
 * Campaign Details:
 * - Scope: All apps, all active users
 * - Reviewers: User's manager (fallback reviewer for users without managers)
 * - Duration: 14 days
 * - Recurrence: Quarterly (every 3 months)
 * - Start: 1 day from creation
 */
export async function createAccessCertificationCampaign(
  config: OktaConfig
): Promise<OktaActionResult> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const headers = oktaHeaders(config);

  try {
    // Step 1: Create or find the Fallback Reviewer user
    
    const fallbackEmail = 'fallback.reviewer@atko.email';
    let fallbackUserId: string;

    // Check if fallback reviewer already exists
    const searchRes = await fetch(
      `${baseUrl}/api/v1/users?search=${encodeURIComponent(`profile.email eq "${fallbackEmail}"`)}`,
      {
        method: 'GET',
        headers,
        cache: 'no-store',
      }
    );

    if (!searchRes.ok) {
      const body = await safeJson<any>(searchRes);
      throw new Error(
        `Failed to search for fallback reviewer (${searchRes.status}): ${
          body?.errorSummary || searchRes.statusText
        }`
      );
    }

    const existingUsers = await searchRes.json();

    if (existingUsers && existingUsers.length > 0) {
      fallbackUserId = existingUsers[0].id;
    } else {
      // Create the fallback reviewer user
      const createUserRes = await fetch(
        `${baseUrl}/api/v1/users?activate=true`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            profile: {
              firstName: 'Fallback',
              lastName: 'Reviewer',
              email: fallbackEmail,
              login: fallbackEmail,
            },
          }),
          cache: 'no-store',
        }
      );

      if (!createUserRes.ok) {
        const body = await safeJson<any>(createUserRes);
        throw new Error(
          `Failed to create fallback reviewer (${createUserRes.status}): ${
            body?.errorSummary || createUserRes.statusText
          }`
        );
      }

      const fallbackUser = await createUserRes.json();
      fallbackUserId = fallbackUser.id;
    }

    // Step 2: Create the Access Certification Campaign
    
    // Calculate start date (1 day from now)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(9, 0, 0, 0); // Start at 9 AM
    
    // Calculate end date (14 days after start)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 14);

    const campaignPayload = {
      name: 'Quarterly Access Review - Manager',
      description: 'Quarterly review of all app assignments for active users. Managers review their direct reports\' access.',
      type: 'ACCESS_CERTIFICATION',
      settings: {
        resourceType: 'APP',
        userStatus: 'ACTIVE',
        reviewerType: 'MANAGER',
        fallbackReviewers: [
          {
            id: fallbackUserId,
            type: 'USER',
          },
        ],
        schedule: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          recurrence: {
            frequency: 'QUARTERLY', // Every 3 months
            interval: 1,
          },
        },
        reminders: {
          enabled: true,
          frequency: 'WEEKLY',
        },
        autoRevokeAccess: false, // Don't auto-revoke, require explicit action
      },
    };


    // First, check if the governance API is available
    const checkRes = await fetch(
      `${baseUrl}/api/v1/governance/campaigns`,
      {
        method: 'GET',
        headers,
        cache: 'no-store',
      }
    );

    if (!checkRes.ok && checkRes.status === 404) {
      return {
        success: false,
        message: 'Access Certification API is not available. This feature requires Okta Identity Governance. Please ensure Identity Governance is enabled in your org.',
      };
    }

    if (!checkRes.ok && checkRes.status === 405) {
      // Method not allowed on GET, but endpoint might exist. Try POST anyway.
    }

    const campaignRes = await fetch(
      `${baseUrl}/api/v1/governance/campaigns`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(campaignPayload),
        cache: 'no-store',
      }
    );


    if (!campaignRes.ok) {
      const body = await safeJson<any>(campaignRes);

      // Check if endpoint doesn't exist or method not supported
      if (campaignRes.status === 404 || campaignRes.status === 405) {
        return {
          success: false,
          message: 'Access Certification API is not available. This feature requires Okta Identity Governance. Please ensure Identity Governance is enabled in your org and that you have the necessary license.',
        };
      }

      // Check if campaign already exists
      if (body?.errorCode === 'E0000007' || body?.errorSummary?.includes('already exists')) {
        return {
          success: true,
          message: 'Access Certification Campaign already exists in your org.',
        };
      }

      throw new Error(
        `Failed to create campaign (${campaignRes.status}, ${body?.errorCode || 'UNKNOWN'}): ${
          body?.errorSummary || campaignRes.statusText
        }`
      );
    }

    const campaign = await campaignRes.json();

    return {
      success: true,
      message: `Access Certification Campaign created successfully (Campaign ID: ${campaign.id}). Starts ${startDate.toLocaleDateString()}, runs for 14 days, recurs quarterly.`,
      data: campaign,
    };
  } catch (err: any) {
    console.error('createAccessCertificationCampaign error', err);
    return {
      success: false,
      message: `Error creating Access Certification Campaign: ${err.message ?? String(err)}`,
    };
  }
}

/**
 * 9. Create Standard Department Groups
 * 
 * Creates groups for standard departments (Engineering, Sales, Marketing, Finance, HR)
 * and creates group rules to automatically assign users to these groups based on
 * their profile.department attribute.
 */
export async function createStandardDepartmentGroups(
  config: OktaConfig
): Promise<OktaActionResult> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const headers = oktaHeaders(config);

  const departments = [
    'Engineering',
    'Sales',
    'Marketing',
    'Finance',
    'Human Resources',
    'Partners',
    'Contractors'
  ];

  try {
    const results: any[] = [];
    const errors: any[] = [];

    for (const dept of departments) {
      try {
        // Step 1: Create Group
        let groupId: string;
        
        // Check if group exists
        const groupSearchRes = await fetch(
          `${baseUrl}/api/v1/groups?search=${encodeURIComponent(`profile.name eq "${dept}"`)}`,
          { method: 'GET', headers, cache: 'no-store' }
        );

        if (!groupSearchRes.ok) throw new Error(`Failed to search group ${dept}`);
        
        const existingGroups = await groupSearchRes.json();
        const existingGroup = existingGroups.find((g: any) => g.profile.name === dept);

        if (existingGroup) {
          groupId = existingGroup.id;
          results.push({ type: 'group', name: dept, status: 'exists', id: groupId });
        } else {
          const createGroupRes = await fetch(`${baseUrl}/api/v1/groups`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              profile: {
                name: dept,
                description: `${dept} Department Group`
              }
            }),
            cache: 'no-store'
          });

          if (!createGroupRes.ok) throw new Error(`Failed to create group ${dept}`);
          
          const newGroup = await createGroupRes.json();
          groupId = newGroup.id;
          results.push({ type: 'group', name: dept, status: 'created', id: groupId });
        }

        // Step 2: Create Group Rule
        const ruleName = `Assign ${dept} Group`;
        
        // Check if rule exists (by name, though API doesn't support search by name easily, 
        // we'll just try to create and handle error or list all rules - listing is safer)
        // For simplicity/performance, we'll try to create and catch "already exists" error
        
        const rulePayload = {
          type: 'group_rule',
          name: ruleName,
          conditions: {
            expression: {
              value: `user.department == "${dept}"`,
              type: 'urn:okta:expression:1.0'
            }
          },
          actions: {
            assignUserToGroups: {
              groupIds: [groupId]
            }
          }
        };

        const createRuleRes = await fetch(`${baseUrl}/api/v1/groups/rules`, {
          method: 'POST',
          headers,
          body: JSON.stringify(rulePayload),
          cache: 'no-store'
        });

        if (createRuleRes.ok) {
          const rule = await createRuleRes.json();
          results.push({ type: 'rule', name: ruleName, status: 'created', id: rule.id });
          
          // Activate the rule
          if (rule.status === 'INACTIVE') {
            await fetch(`${baseUrl}/api/v1/groups/rules/${rule.id}/lifecycle/activate`, {
              method: 'POST',
              headers,
              cache: 'no-store'
            });
          }
        } else {
          const body = await safeJson<any>(createRuleRes);
          if (body?.errorCode === 'E0000007' || body?.errorSummary?.includes('already exists')) {
             results.push({ type: 'rule', name: ruleName, status: 'exists' });
          } else {
            throw new Error(`Failed to create rule ${ruleName}: ${body?.errorSummary}`);
          }
        }

      } catch (innerErr: any) {
        errors.push({ department: dept, error: innerErr.message });
      }
    }

    const success = errors.length === 0;

    return {
      success,
      message: `Department groups processing complete. Created/Found: ${results.length}, Errors: ${errors.length}.`,
      data: { results, errors }
    };

  } catch (err: any) {
    console.error('createStandardDepartmentGroups error', err);
    return {
      success: false,
      message: `Error creating department groups: ${err.message ?? String(err)}`,
    };
  }
}

/**
 * 10. Create Device Assurance Policies
 * 
 * Creates empty device assurance policies for each platform:
 * - Android Assurance Policy
 * - iOS Assurance Policy
 * - macOS Assurance Policy
 * - Windows Assurance Policy
 */
export async function createDeviceAssurancePolicies(
  config: OktaConfig
): Promise<OktaActionResult> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const headers = oktaHeaders(config);

  const platforms = [
    { name: 'Android Assurance Policy', platform: 'ANDROID', osVersion: { minimum: '10.0' } },
    { name: 'iOS Assurance Policy', platform: 'IOS', osVersion: { minimum: '14.0' } },
    { name: 'macOS Assurance Policy', platform: 'MACOS', osVersion: { minimum: '11.0' } },
    { name: 'Windows Assurance Policy', platform: 'WINDOWS', osVersion: { minimum: '10.0' } }
  ];

  try {
    // First, check if the device assurance API is available
    const checkRes = await fetch(`${baseUrl}/api/v1/device-assurances`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (!checkRes.ok && (checkRes.status === 404 || checkRes.status === 403)) {
      return {
        success: false,
        message: 'Device Assurance API is not available. This feature requires Okta Identity Engine (OIE) and may need to be enabled in your org settings.',
      };
    }

    const results: any[] = [];
    const errors: any[] = [];

    // First, try to list existing policies to check format
    const existingPolicies = await checkRes.json().catch(() => []);

    for (const p of platforms) {
      try {
        // Check if policy with this name already exists
        const existing = Array.isArray(existingPolicies) 
          ? existingPolicies.find((pol: any) => pol.name === p.name || pol.platform === p.platform)
          : null;

        if (existing) {
          results.push({ name: p.name, status: 'exists', id: existing.id });
          continue;
        }

        // Create minimal payload based on platform
        // Device assurance policies have platform-specific requirements
        const payload: any = {
          name: p.name,
          platform: p.platform,
        };

        // Add platform-specific minimum requirements
        if (p.platform === 'ANDROID') {
          // Android doesn't use osVersion in the same way - omit it for minimal policy
          payload.screenLockType = { include: ['BIOMETRIC'] };
        } else if (p.platform === 'IOS') {
          payload.osVersion = { minimum: '14.0' };
          payload.screenLockType = { include: ['BIOMETRIC', 'PASSCODE'] };
        } else if (p.platform === 'MACOS') {
          payload.osVersion = { minimum: '11.0' };
          payload.diskEncryptionType = { include: ['ALL_INTERNAL_VOLUMES'] };
        } else if (p.platform === 'WINDOWS') {
          payload.osVersion = { minimum: '10.0.0' };
          payload.diskEncryptionType = { include: ['ALL_INTERNAL_VOLUMES'] };
          payload.secureHardwarePresent = true; // Must be true if specified
        }


        const res = await fetch(`${baseUrl}/api/v1/device-assurances`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          cache: 'no-store'
        });

        if (res.ok) {
          const policy = await res.json();
          results.push({ name: p.name, status: 'created', id: policy.id });
        } else {
          const body = await safeJson<any>(res);
          console.error(`✗ Failed to create ${p.name}:`, body);
          
          // Handle "already exists" gracefully
          if (body?.errorCode === 'E0000007' || body?.errorSummary?.includes('already exists')) {
            results.push({ name: p.name, status: 'exists' });
          } else {
            const errorMsg = `${body?.errorSummary || res.statusText}${body?.errorCauses ? ` - ${JSON.stringify(body.errorCauses)}` : ''}`;
            throw new Error(errorMsg);
          }
        }
      } catch (innerErr: any) {
        console.error(`Error processing ${p.name}:`, innerErr);
        errors.push({ name: p.name, error: innerErr.message });
      }
    }

    const success = errors.length === 0;
    
    // Include error details in the message
    let message = success 
      ? `Device assurance policies created successfully. Created/Found: ${results.length}.`
      : `Device assurance policies processing complete. Created/Found: ${results.length}, Errors: ${errors.length}.`;
    
    if (errors.length > 0) {
      const errorDetails = errors.map(e => `${e.name}: ${e.error}`).join('; ');
      message += ` Error details: ${errorDetails}`;
    }
    
    return {
      success,
      message,
      data: { results, errors }
    };

  } catch (err: any) {
    console.error('createDeviceAssurancePolicies error', err);
    return {
      success: false,
      message: `Error creating device assurance policies: ${err.message ?? String(err)}`,
    };
  }
}

/**
 * 11. Configure Entity Risk Policy
 * 
 * Configures the Entity Risk Policy with rules for each detection type.
 * Each rule is named after the detection type and set to "No Action".
 */
export async function configureEntityRiskPolicy(
  config: OktaConfig
): Promise<OktaActionResult> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const headers = oktaHeaders(config);

  try {
    // Step 1: First, let's check what policy types are available
    const allPoliciesRes = await fetch(`${baseUrl}/api/v1/policies`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (allPoliciesRes.ok) {
      const allPolicies = await allPoliciesRes.json();
      
      // Look for Entity Risk or Risk Scoring policies
      const riskRelatedPolicies = allPolicies.filter((p: any) => 
        p.type?.includes('RISK') || 
        p.name?.toLowerCase().includes('risk') ||
        p.name?.toLowerCase().includes('entity')
      );
      
      if (riskRelatedPolicies.length > 0) {
      }
    }

    // Step 2: Try to find the Entity Risk Policy with RISK type
    let policiesRes = await fetch(`${baseUrl}/api/v1/policies?type=RISK`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    let policies: any[] = [];

    if (!policiesRes.ok) {
      const body = await safeJson<any>(policiesRes);
      console.error('Failed to fetch RISK policies:', body);
      
      // Check if RISK policy type is not available
      if (policiesRes.status === 400 || body?.errorSummary?.includes('Invalid policy type')) {
        // Try alternative policy types that might be used for Entity Risk
        const altRes = await fetch(`${baseUrl}/api/v1/policies?type=ENTITY_RISK`, {
          method: 'GET',
          headers,
          cache: 'no-store'
        });
        
        if (altRes.ok) {
          const altPolicies = await altRes.json();
          if (altPolicies.length > 0) {
            policies = altPolicies;
          }
        }
        
        if (policies.length === 0) {
          return {
            success: false,
            message: `Entity Risk Policy type not recognized. Available policy types were logged. The API returned: ${body?.errorSummary || 'Invalid policy type'}. Please check the Admin Console to see if Entity Risk is enabled.`,
          };
        }
      } else {
        throw new Error(`Failed to fetch policies: ${body?.errorSummary || policiesRes.statusText}`);
      }
    } else {
      policies = await policiesRes.json();
      
      if (policies.length > 0) {
      }
    }
    
    // Find the default Entity Risk Policy
    let riskPolicy = policies.find((p: any) => 
      p.type === 'RISK' && (p.name.includes('Entity Risk') || p.name.includes('Default') || p.system === true)
    );

    if (!riskPolicy && policies.length > 0) {
      // If no specific policy found, use the first RISK policy if available
      riskPolicy = policies[0];
    }

    if (!riskPolicy) {
      return {
        success: false,
        message: `Entity Risk Policy not found. Found ${policies.length} RISK policies but none matched expected names. Check console logs for details.`,
      };
    }

    const policyId = riskPolicy.id;

    // Step 2: Fetch existing rules to check configuration
    const rulesRes = await fetch(`${baseUrl}/api/v1/policies/${policyId}/rules`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });
    
    if (!rulesRes.ok) {
      const body = await safeJson<any>(rulesRes);
      return {
        success: false,
        message: `Unable to fetch Entity Risk Policy rules. Error: ${body?.errorSummary || rulesRes.statusText}`,
      };
    }
    
    const existingRules = await rulesRes.json();
    
    // Entity Risk Policy uses immutable system rules
    // We can only view them, not create/modify them according to Okta API docs
    // The documentation states: "Creating or replacing a policy with the ENTITY_RISK type is not supported"
    
    if (existingRules.length > 0) {
      existingRules.forEach((rule: any) => {
        if (rule.conditions) {
        }
        if (rule.actions) {
        }
      });
    }

    // Return information about the existing configuration
    const rulesSummary = existingRules.map((rule: any) => ({
      name: rule.name,
      id: rule.id,
      status: rule.status,
      priority: rule.priority,
      system: rule.system
    }));

    return {
      success: true,
      message: `Entity Risk Policy reviewed successfully. Found ${existingRules.length} existing rule(s). Note: Entity Risk Policy rules are system-managed and cannot be created or modified via API. Please configure them in the Okta Admin Console under Security > Entity Risk.`,
      data: { 
        policyName: riskPolicy.name, 
        policyId, 
        rules: rulesSummary,
        note: 'Entity Risk Policy rules are immutable. Use Admin Console to configure detection settings.'
      }
    };

  } catch (err: any) {
    console.error('configureEntityRiskPolicy error', err);
    return {
      success: false,
      message: `Error configuring Entity Risk Policy: ${err.message ?? String(err)}`,
    };
  }
}

/**
 * 12. Add New Administrator
 * Creates a user with the provided details and adds them to the Super Administrators group
 */
export async function addNewAdministrator(
  config: OktaConfig,
  params: { firstName: string; lastName: string; email: string }
): Promise<OktaActionResult> {
  try {
    const { firstName, lastName, email } = params;

    // Validate inputs
    if (!firstName || !lastName || !email) {
      return {
        success: false,
        message: 'First name, last name, and email are required.'
      };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: 'Invalid email format.'
      };
    }

    // 1. Create the user
    const userPayload = {
      profile: {
        firstName,
        lastName,
        email,
        login: email
      },
      credentials: {
        password: {
          // User will need to set password via activation email
          value: undefined
        }
      }
    };

    let user: any;
    try {
      user = await oktaFetch(config, '/api/v1/users?activate=true', {
        method: 'POST',
        body: JSON.stringify(userPayload)
      });
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to create user: ${err.message}`
      };
    }

    // 2. Find the Super Administrators group
    const groupName = 'Super Administrators';
    let superAdminGroup: OktaGroup | null = null;

    try {
      const searchParam = encodeURIComponent(`profile.name eq "${groupName}"`);
      const groups: OktaGroup[] = await oktaFetch(
        config,
        `/api/v1/groups?search=${searchParam}`
      );
      
      if (groups.length > 0) {
        superAdminGroup = groups[0];
      }
    } catch (err: any) {
      return {
        success: false,
        message: `User created but failed to find Super Administrators group: ${err.message}`,
        data: { user }
      };
    }

    if (!superAdminGroup) {
      return {
        success: false,
        message: 'User created but Super Administrators group does not exist. Run "Create Super Administrators Group" script first.',
        data: { user }
      };
    }

    // 3. Add user to Super Administrators group
    try {
      const baseUrl = normalizeOrgUrl(config.orgUrl);
      const addToGroupRes = await fetch(
        `${baseUrl}/api/v1/groups/${superAdminGroup.id}/users/${user.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `SSWS ${config.apiToken}`,
          },
          cache: 'no-store',
        }
      );

      if (!addToGroupRes.ok) {
        const body = await safeJson<any>(addToGroupRes);
        throw new Error(
          `Failed to add user to group (${addToGroupRes.status}): ${
            body?.errorSummary || addToGroupRes.statusText
          }`
        );
      }

      // 204 No Content is success - don't try to parse JSON
    } catch (err: any) {
      return {
        success: false,
        message: `User created but failed to add to Super Administrators group: ${err.message}`,
        data: { user, group: superAdminGroup }
      };
    }

    return {
      success: true,
      message: `Administrator ${firstName} ${lastName} (${email}) created and added to Super Administrators group.`,
      data: { user, group: superAdminGroup }
    };

  } catch (error: any) {
    console.error('addNewAdministrator error', error);
    return {
      success: false,
      message: `Error adding administrator: ${error.message ?? String(error)}`
    };
  }
}

/**
 * 13. Setup Realms
 * - Renames default realm to "Employees"
 * - Creates "Partners" realm
 * - Creates "Contractors" realm
 */
export async function setupRealms(
  config: OktaConfig
): Promise<OktaActionResult> {
  try {
    // 1. List existing realms
    // Note: Realms API might be feature-flagged or require OIE.
    const realms = await oktaFetch<any[]>(config, '/api/v1/realms');
    
    const results: any[] = [];
    const errors: string[] = [];

    // 2. Rename Default Realm to "Employees"
    // We look for a realm named "Default".
    const defaultRealm = realms.find((r: any) => r.profile.name === 'Default');
    
    if (defaultRealm) {
      try {
        const updated = await oktaFetch(config, `/api/v1/realms/${defaultRealm.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            profile: {
              name: 'Employees'
            }
          })
        });
        results.push({ action: 'rename', realm: 'Employees', status: 'success', data: updated });
      } catch (e: any) {
        errors.push(`Failed to rename Default realm: ${e.message}`);
      }
    } else {
      // Check if "Employees" already exists
      const employeesRealm = realms.find((r: any) => r.profile.name === 'Employees');
      if (employeesRealm) {
        results.push({ action: 'rename', realm: 'Employees', status: 'skipped', message: 'Realm "Employees" already exists' });
      } else {
        // If we can't find "Default", we might just skip renaming to avoid breaking things
        // or we could try to find the isDefault flag if exposed.
        // For now, we'll just log a warning in the results.
        results.push({ action: 'rename', realm: 'Employees', status: 'skipped', message: 'Could not find "Default" realm to rename.' });
      }
    }

    // 3. Create "Partners" realm
    const partnersRealm = realms.find((r: any) => r.profile.name === 'Partners');
    if (!partnersRealm) {
      try {
        const created = await oktaFetch(config, '/api/v1/realms', {
          method: 'POST',
          body: JSON.stringify({
            profile: {
              name: 'Partners'
            }
          })
        });
        results.push({ action: 'create', realm: 'Partners', status: 'success', data: created });
      } catch (e: any) {
        errors.push(`Failed to create Partners realm: ${e.message}`);
      }
    } else {
      results.push({ action: 'create', realm: 'Partners', status: 'skipped', message: 'Realm already exists' });
    }

    // 4. Create "Contractors" realm
    const contractorsRealm = realms.find((r: any) => r.profile.name === 'Contractors');
    if (!contractorsRealm) {
      try {
        const created = await oktaFetch(config, '/api/v1/realms', {
          method: 'POST',
          body: JSON.stringify({
            profile: {
              name: 'Contractors'
            }
          })
        });
        results.push({ action: 'create', realm: 'Contractors', status: 'success', data: created });
      } catch (e: any) {
        errors.push(`Failed to create Contractors realm: ${e.message}`);
      }
    } else {
      results.push({ action: 'create', realm: 'Contractors', status: 'skipped', message: 'Realm already exists' });
    }

    const success = errors.length === 0;
    return {
      success,
      message: success 
        ? 'Realms setup successfully.' 
        : `Realms setup completed with errors: ${errors.join(', ')}`,
      data: { results, errors }
    };

  } catch (error: any) {
    console.error('setupRealms error', error);
    return {
      success: false,
      message: `Error setting up realms: ${error.message ?? String(error)}`
    };
  }
}

/**
 * 13. Run Policy Simulation
 * Simulates policy evaluation for a specific application
 */
export async function runPolicySimulation(
  config: OktaConfig,
  params: { appInstance: string; policyTypes?: string[] }
): Promise<OktaActionResult> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const headers = oktaHeaders(config);

  try {
    const { appInstance, policyTypes } = params;

    // Validate inputs
    if (!appInstance) {
      return {
        success: false,
        message: 'Application selection is required.'
      };
    }


    // Build simulation request payload
    const simulationPayload: any = {
      appInstance: appInstance,
    };

    // Add policy types if specified (otherwise API returns all types)
    if (policyTypes && policyTypes.length > 0) {
      simulationPayload.policyTypes = policyTypes;
    }


    // Call the policy simulation API
    const simulationRes = await fetch(`${baseUrl}/api/v1/policies/simulate?expand=EVALUATED,RULE`, {
      method: 'POST',
      headers,
      body: JSON.stringify(simulationPayload),
      cache: 'no-store'
    });

    if (!simulationRes.ok) {
      const body = await safeJson<any>(simulationRes);
      
      // Check for feature not available errors
      if (simulationRes.status === 404 || simulationRes.status === 405) {
        return {
          success: false,
          message: `Policy Simulation API is not available. This feature requires Okta Identity Engine (OIE). Error: ${body?.errorSummary || simulationRes.statusText}`
        };
      }

      return {
        success: false,
        message: `Policy simulation failed: ${body?.errorSummary || simulationRes.statusText}`
      };
    }

    const simulation = await simulationRes.json();

    // Parse the results
    const evaluations = simulation.evaluation || [];
    const summary: any[] = [];

    for (const evaluation of evaluations) {
      const policyType = evaluation.policyType;
      const result = evaluation.result || {};
      const matchedPolicy = result.policy;
      const matchedRule = result.rule;

      summary.push({
        policyType,
        status: evaluation.status,
        matchedPolicy: matchedPolicy ? {
          id: matchedPolicy.id,
          name: matchedPolicy.name,
          priority: matchedPolicy.priority
        } : null,
        matchedRule: matchedRule ? {
          id: matchedRule.id,
          name: matchedRule.name,
          priority: matchedRule.priority
        } : null,
        actions: result.actions
      });
    }

    // Format a readable message
    let message = `Policy simulation completed successfully.\n\n`;
    
    summary.forEach((item) => {
      message += `**${item.policyType}**\n`;
      if (item.matchedPolicy) {
        message += `  - Policy: ${item.matchedPolicy.name} (Priority: ${item.matchedPolicy.priority})\n`;
      }
      if (item.matchedRule) {
        message += `  - Rule: ${item.matchedRule.name} (Priority: ${item.matchedRule.priority})\n`;
      }
      if (item.actions) {
        message += `  - Actions: ${JSON.stringify(item.actions)}\n`;
      }
      message += `\n`;
    });

    return {
      success: true,
      message,
      data: { simulation, summary }
    };

  } catch (err: any) {
    console.error('runPolicySimulation error', err);
    return {
      success: false,
      message: `Error running policy simulation: ${err.message ?? String(err)}`
    };
  }
}

/**
 * 14. runAllScripts()
 * Executes all scripts in sequence using the provided OktaConfig.
 *
 * Order:
 *  - enableFIDO2
 *  - createSuperAdminsGroup (now auto-assigns SUPER_ADMIN role)
 *  - populateDemoUsers
 *  - createStandardDepartmentGroups
 *  - createDeviceAssurancePolicies
 *  - configureEntityRiskPolicy
 *  - addSalesforceSAMLApp
 *  - addBoxApp
 *  - createAccessCertificationCampaign
 *  - setupRealms
 */
export async function runAllScripts(
  config: OktaConfig
): Promise<
  OktaActionResult<{
    enableFIDO2: OktaActionResult;
    createSuperAdminsGroup: OktaActionResult<OktaGroup>;
    populateDemoUsers: OktaActionResult;
    createStandardDepartmentGroups: OktaActionResult;
    createDeviceAssurancePolicies: OktaActionResult;
    configureEntityRiskPolicy: OktaActionResult;
    addSalesforceSAMLApp: OktaActionResult;
    addBoxApp: OktaActionResult;
    createAccessCertificationCampaign: OktaActionResult;
    setupRealms: OktaActionResult;
  }>
> {
  const results: any = {};

  // 1) FIDO2
  results.enableFIDO2 = await enableFIDO2(config);

  // 2) Super Admins group (now auto-assigns SUPER_ADMIN role)
  results.createSuperAdminsGroup = await createSuperAdminsGroup(config);

  // 3) Demo users
  results.populateDemoUsers = await populateDemoUsers(config);

  // 5) Standard Department Groups
  results.createStandardDepartmentGroups = await createStandardDepartmentGroups(config);

  // 6) Device Assurance Policies
  results.createDeviceAssurancePolicies = await createDeviceAssurancePolicies(config);

  // 7) Entity Risk Policy
  results.configureEntityRiskPolicy = await configureEntityRiskPolicy(config);

  // 8) Salesforce SAML app
  results.addSalesforceSAMLApp = await addSalesforceSAMLApp(config);

  // 9) Box app
  results.addBoxApp = await addBoxApp(config);

  // 10) Access Certification Campaign
  results.createAccessCertificationCampaign = await createAccessCertificationCampaign(config);

  // 11) Setup Realms
  results.setupRealms = await setupRealms(config);

  const overallSuccess = Object.values<OktaActionResult>(results).every((r) => r.success);

  return {
    success: overallSuccess,
    message: overallSuccess
      ? 'All Okta SE Toolkit automation scripts completed successfully.'
      : 'Okta SE Toolkit automation scripts completed with some errors. Check individual results for details.',
    data: results,
  };
}

// ============================================================================
// Setup SoD Demo - Creates entitlements, risk rule, and bundles
// ============================================================================

interface SetupSodDemoParams {
  appId: string;
  entitlementName?: string;
  role1Name?: string;
  role2Name?: string;
}

interface EntitlementValue {
  id: string;
  name: string;
  externalValue: string;
}

interface Entitlement {
  id: string;
  name: string;
  externalValue: string;
  values?: EntitlementValue[];
}

interface RiskRule {
  id: string;
  name: string;
  type: string;
}

interface EntitlementBundle {
  id: string;
  name: string;
}

/**
 * Setup SoD Demo
 * 
 * Creates the complete SoD demo structure for an application:
 * 1. Creates an entitlement with two values (conflicting roles)
 * 2. Creates a SoD risk rule that flags conflicts
 * 3. Creates entitlement bundles for each role (for Access Requests)
 */
export async function setupSodDemo(
  config: OktaConfig,
  params: SetupSodDemoParams
): Promise<OktaActionResult<{
  entitlement?: Entitlement;
  riskRule?: RiskRule;
  bundles?: EntitlementBundle[];
}>> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);

  // Validate OAuth credentials (now requires privateKey and keyId for private_key_jwt)
  if (!config.clientId || !config.privateKey || !config.keyId) {
    return {
      success: false,
      message: 'OAuth credentials (Client ID, Private Key, and Key ID) are required for SoD Demo setup. Configure them in Settings.',
    };
  }

  // Default values
  const entitlementName = params.entitlementName?.trim() || 'NetSuite Role';
  const role1Name = params.role1Name?.trim() || 'Payroll Administrator';
  const role2Name = params.role2Name?.trim() || 'Payroll Approver';
  const appId = params.appId.trim();

  const role1ExternalValue = role1Name.toLowerCase().replace(/\s+/g, '_');
  const role2ExternalValue = role2Name.toLowerCase().replace(/\s+/g, '_');
  const entitlementExternalValue = entitlementName.toLowerCase().replace(/\s+/g, '_');

  try {
    // Step 1: Get OAuth access token using private_key_jwt
    const accessToken = await getOAuthAccessToken(
      config.orgUrl,
      config.clientId,
      config.privateKey,
      config.keyId,
      [
        'okta.orgs.read',
        'okta.governance.entitlements.manage',
        'okta.governance.riskRule.manage',
        'okta.governance.accessRequests.manage',
      ]
    );

    // Step 2: Get org ID for constructing resource ORN
    const orgInfo = await oigFetch<{ id: string }>(
      baseUrl,
      accessToken,
      '/api/v1/org'
    );
    const orgId = orgInfo.id;

    // Step 3: Create entitlement with values
    const entitlementPayload = {
      name: entitlementName,
      externalValue: entitlementExternalValue,
      description: `Business roles in ${entitlementName.replace(' Role', '')} used for access requests and governance`,
      parent: {
        externalId: appId,
        type: 'APPLICATION',
      },
      multiValue: true,
      dataType: 'string',
      values: [
        {
          name: role1Name,
          externalValue: role1ExternalValue,
          description: `Can create/modify ${role1Name.toLowerCase().includes('payroll') ? 'payroll entries' : 'records'}`,
        },
        {
          name: role2Name,
          externalValue: role2ExternalValue,
          description: `Can approve ${role2Name.toLowerCase().includes('payroll') ? 'payroll changes' : 'requests'}`,
        },
      ],
    };

    const entitlement = await oigFetch<Entitlement>(
      baseUrl,
      accessToken,
      '/governance/api/v1/entitlements',
      {
        method: 'POST',
        body: JSON.stringify(entitlementPayload),
      }
    );


    // Get the value IDs from the created entitlement
    const value1 = entitlement.values?.find(v => v.externalValue === role1ExternalValue);
    const value2 = entitlement.values?.find(v => v.externalValue === role2ExternalValue);

    if (!value1 || !value2) {
      return {
        success: false,
        message: 'Entitlement created but values could not be retrieved. Check the entitlement in Admin Console.',
        data: { entitlement },
      };
    }

    // Step 4: Create SoD Risk Rule (optional - may fail due to API validation)
    const resourceOrn = `orn:okta:idp:${orgId}:apps:netsuite:${appId}`;

    let riskRule: RiskRule | null = null;
    const riskRulePayload = {
      name: `SoD - ${role1Name} vs ${role2Name}`,
      description: `Prevents a user from holding both ${role1Name.toLowerCase()} and ${role2Name.toLowerCase()} roles`,
      type: 'SEPARATION_OF_DUTIES',
      resources: [
        { resourceOrn },
      ],
      conflictCriteria: {
        and: [
          {
            name: `has_${role1ExternalValue}`,
            attribute: 'principal.effective_grants',
            operation: 'CONTAINS_ONE',
            value: {
              type: 'ENTITLEMENTS',
              value: [
                {
                  id: entitlement.id,
                  values: [{ id: value1.id }],
                },
              ],
            },
          },
          {
            name: `has_${role2ExternalValue}`,
            attribute: 'principal.effective_grants',
            operation: 'CONTAINS_ONE',
            value: {
              type: 'ENTITLEMENTS',
              value: [
                {
                  id: entitlement.id,
                  values: [{ id: value2.id }],
                },
              ],
            },
          },
        ],
      },
    };

    try {
      riskRule = await oigFetch<RiskRule>(
        baseUrl,
        accessToken,
        '/governance/api/v1/risk-rules',
        {
          method: 'POST',
          body: JSON.stringify(riskRulePayload),
        }
      );
    } catch (riskErr: any) {
      console.warn(`Could not create risk rule: ${riskErr.message}`);
      console.warn('You can create the SoD risk rule manually in Admin Console > Identity Governance > Access Certifications > Risk Rules');
    }

    // Step 5: Create Entitlement Bundles for Access Requests
    const bundles: EntitlementBundle[] = [];

    // Bundle for Role 1
    const bundle1Payload = {
      name: role1Name,
      description: `Access bundle for ${role1Name} entitlement`,
      status: 'ACTIVE',
      entitlements: [
        {
          entitlementId: entitlement.id,
          valueIds: [value1.id],
        },
      ],
    };

    try {
      const bundle1 = await oigFetch<EntitlementBundle>(
        baseUrl,
        accessToken,
        '/governance/api/v1/entitlement-bundles',
        {
          method: 'POST',
          body: JSON.stringify(bundle1Payload),
        }
      );
      bundles.push(bundle1);
    } catch (bundleErr: any) {
      console.warn(`Could not create bundle for ${role1Name}: ${bundleErr.message}`);
    }

    // Bundle for Role 2
    const bundle2Payload = {
      name: role2Name,
      description: `Access bundle for ${role2Name} entitlement`,
      status: 'ACTIVE',
      entitlements: [
        {
          entitlementId: entitlement.id,
          valueIds: [value2.id],
        },
      ],
    };

    try {
      const bundle2 = await oigFetch<EntitlementBundle>(
        baseUrl,
        accessToken,
        '/governance/api/v1/entitlement-bundles',
        {
          method: 'POST',
          body: JSON.stringify(bundle2Payload),
        }
      );
      bundles.push(bundle2);
    } catch (bundleErr: any) {
      console.warn(`Could not create bundle for ${role2Name}: ${bundleErr.message}`);
    }

    // Build success message
    const successParts = [
      `✓ Created entitlement "${entitlementName}" (${entitlement.id}) with values:`,
      `  - ${role1Name} (${value1.id})`,
      `  - ${role2Name} (${value2.id})`,
    ];

    if (riskRule) {
      successParts.push('');
      successParts.push(`✓ Created SoD risk rule "${riskRule.name}" (${riskRule.id})`);
    } else {
      successParts.push('');
      successParts.push(`⚠ Could not create risk rule via API. Create it manually:`);
      successParts.push(`  Admin Console > Identity Governance > Risk Rules > Add Rule`);
      successParts.push(`  Select the two entitlement values above as conflicting`);
    }

    if (bundles.length > 0) {
      successParts.push('');
      successParts.push(`✓ Created ${bundles.length} entitlement bundle(s) for Access Requests:`);
      for (const b of bundles) {
        successParts.push(`  - ${b.name} (${b.id})`);
      }
    }

    successParts.push('');
    successParts.push('Demo ready! Users with one role will be flagged/blocked when requesting the other.');

    return {
      success: true,
      message: successParts.join('\n'),
      data: {
        entitlement,
        riskRule: riskRule || undefined,
        bundles: bundles.length > 0 ? bundles : undefined,
      },
    };
  } catch (err: any) {
    console.error('setupSodDemo error', err);
    return {
      success: false,
      message: `Error setting up SoD demo: ${err.message ?? String(err)}`,
    };
  }
}

/**
 * Create Entitlement Bundles for Access Requests
 * Creates bundles that package entitlement values for easy requesting
 */
export async function createEntitlementBundles(
  config: OktaConfig,
  options: {
    entitlementId: string;
    bundle1Name: string;
    bundle1ValueId: string;
    bundle2Name?: string;
    bundle2ValueId?: string;
  }
): Promise<OktaActionResult> {
  if (!config.clientId || !config.privateKey || !config.keyId) {
    return {
      success: false,
      message: 'OAuth credentials (Client ID, Private Key, and Key ID) are required for creating entitlement bundles. Configure them in Settings.',
    };
  }

  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const {
    entitlementId,
    bundle1Name,
    bundle1ValueId,
    bundle2Name,
    bundle2ValueId,
  } = options;

  try {
    // Step 1: Get OAuth access token
    const accessToken = await getOAuthAccessToken(
      config.orgUrl,
      config.clientId,
      config.privateKey,
      config.keyId,
      [
        'okta.governance.entitlements.read',
        'okta.governance.accessRequests.manage',
      ]
    );

    const bundles: EntitlementBundle[] = [];

    // Create first bundle
    const bundle1Payload = {
      name: bundle1Name,
      description: `Access bundle for ${bundle1Name}`,
      status: 'ACTIVE',
      entitlements: [
        {
          entitlementId: entitlementId,
          valueIds: [bundle1ValueId],
        },
      ],
    };

    const bundle1 = await oigFetch<EntitlementBundle>(
      baseUrl,
      accessToken,
      '/governance/api/v1/entitlement-bundles',
      {
        method: 'POST',
        body: JSON.stringify(bundle1Payload),
      }
    );
    bundles.push(bundle1);

    // Create second bundle if provided
    if (bundle2Name && bundle2ValueId) {
      const bundle2Payload = {
        name: bundle2Name,
        description: `Access bundle for ${bundle2Name}`,
        status: 'ACTIVE',
        entitlements: [
          {
            entitlementId: entitlementId,
            valueIds: [bundle2ValueId],
          },
        ],
      };

      const bundle2 = await oigFetch<EntitlementBundle>(
        baseUrl,
        accessToken,
        '/governance/api/v1/entitlement-bundles',
        {
          method: 'POST',
          body: JSON.stringify(bundle2Payload),
        }
      );
      bundles.push(bundle2);
    }

    const successParts = [
      `✓ Created ${bundles.length} entitlement bundle(s):`,
      ...bundles.map(b => `  - ${b.name} (${b.id})`),
      '',
      'Bundles are now available for Access Requests!',
    ];

    return {
      success: true,
      message: successParts.join('\n'),
      data: { bundles },
    };
  } catch (err: any) {
    console.error('createEntitlementBundles error', err);
    return {
      success: false,
      message: `Error creating entitlement bundles: ${err.message ?? String(err)}`,
    };
  }
}

