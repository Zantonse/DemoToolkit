/**
 * Script Handler Registry
 *
 * Maps ScriptId strings to their corresponding server action handler functions.
 * Use getHandler(scriptId) in ScriptRunner instead of a switch/case.
 */

import type { OktaConfig, OktaActionResult } from './types/okta';
import type { ScriptId } from './data/automationScripts';
import type { LogFn } from './types/logging';
import {
  enableFIDO2,
  createSuperAdminsGroup,
  populateDemoUsers,
  createStandardDepartmentGroups,
  createDeviceAssurancePolicies,
  configureEntityRiskPolicy,
  addSalesforceSAMLApp,
  addBoxApp,
  createAccessCertificationCampaign,
  setupRealms,
  addNewAdministrator,
  runPolicySimulation,
  setupSodDemo,
  createEntitlementBundles,
  createNetworkZone,
  listNetworkZones,
  createTrustedOrigin,
  listTrustedOrigins,
  createAuthServer,
  addCustomClaim,
  addCustomScope,
  addGoogleSocialIdp,
  applyCustomerBranding,
  configureAuthenticators,
  configureThreatInsight,
  resetDemoUserPool,
  createAuthenticationPolicy,
  setupBehaviorDetection,
  createPasswordPolicy,
  createEnrollmentPolicy,
  enableSelfServiceRegistration,
  createCustomAdminRole,
  setupEventHooks,
  createOidcApp,
  configureAuthServerPolicy,
  customizeActivationEmail,
  cleanupDemoOrg,
} from '../app/actions/oktaActions';

export type HandlerFn = (
  config: OktaConfig,
  inputs?: Record<string, string | string[] | undefined>,
  log?: LogFn
) => Promise<OktaActionResult>;

const handlers: Record<string, HandlerFn> = {
  'enable-fido2': (config, _inputs, log) => enableFIDO2(config, log),
  'create-super-admins-group': (config, _inputs, log) => createSuperAdminsGroup(config, log),
  'populate-demo-users': (config, _inputs, log) => populateDemoUsers(config, log),
  'create-standard-department-groups': (config, _inputs, log) => createStandardDepartmentGroups(config, log),
  'create-device-assurance-policies': (config, _inputs, log) => createDeviceAssurancePolicies(config, log),
  'configure-entity-risk-policy': (config, _inputs, log) => configureEntityRiskPolicy(config, log),
  'add-salesforce-saml-app': (config, _inputs, log) => addSalesforceSAMLApp(config, log),
  'add-box-app': (config, _inputs, log) => addBoxApp(config, log),
  'create-access-certification-campaign': (config, _inputs, log) => createAccessCertificationCampaign(config, log),
  'setup-realms': (config, _inputs, log) => setupRealms(config, log),
  'add-new-administrator': (config, inputs, log) =>
    addNewAdministrator(config, {
      firstName: (inputs?.firstName as string) || '',
      lastName: (inputs?.lastName as string) || '',
      email: (inputs?.email as string) || '',
    }, log),
  'run-policy-simulation': (config, inputs, log) =>
    runPolicySimulation(config, {
      appInstance: (inputs?.appInstance as string) || '',
      policyTypes: inputs?.policyTypes as string[] | undefined,
    }, log),
  'setup-sod-demo': (config, inputs, log) =>
    setupSodDemo(config, {
      appId: (inputs?.appId as string) || '',
      entitlementName: inputs?.entitlementName as string | undefined,
      role1Name: inputs?.role1Name as string | undefined,
      role2Name: inputs?.role2Name as string | undefined,
    }, log),
  'create-entitlement-bundles': (config, inputs, log) =>
    createEntitlementBundles(config, {
      entitlementId: (inputs?.entitlementId as string) || '',
      bundle1Name: (inputs?.bundle1Name as string) || '',
      bundle1ValueId: (inputs?.bundle1ValueId as string) || '',
      bundle2Name: inputs?.bundle2Name as string | undefined,
      bundle2ValueId: inputs?.bundle2ValueId as string | undefined,
    }, log),
  'create-network-zone': (config, inputs, log) =>
    createNetworkZone(config, {
      name: inputs?.name as string | undefined,
      gateways: inputs?.gateways as string | undefined,
    }, log),
  'list-network-zones': (config, _inputs, log) => listNetworkZones(config, log),
  'create-trusted-origin': (config, inputs, log) =>
    createTrustedOrigin(config, {
      name: inputs?.name as string | undefined,
      origin: inputs?.origin as string | undefined,
      scopes: inputs?.scopes as string | string[] | undefined,
    }, log),
  'list-trusted-origins': (config, _inputs, log) => listTrustedOrigins(config, log),
  'create-auth-server': (config, inputs, log) =>
    createAuthServer(config, {
      name: inputs?.name as string | undefined,
      audiences: inputs?.audiences as string | undefined,
      description: inputs?.description as string | undefined,
    }, log),
  'add-custom-claim': (config, inputs, log) =>
    addCustomClaim(config, {
      authServerId: inputs?.authServerId as string | undefined,
      claimName: inputs?.claimName as string | undefined,
      valueExpression: inputs?.valueExpression as string | undefined,
      claimType: inputs?.claimType as string | undefined,
    }, log),
  'add-custom-scope': (config, inputs, log) =>
    addCustomScope(config, {
      authServerId: inputs?.authServerId as string | undefined,
      scopeName: inputs?.scopeName as string | undefined,
      description: inputs?.description as string | undefined,
      consent: inputs?.consent as string | undefined,
    }, log),
  'add-google-social-idp': (config, inputs, log) =>
    addGoogleSocialIdp(config, {
      clientId: (inputs?.clientId as string) || '',
      clientSecret: (inputs?.clientSecret as string) || '',
    }, log),
  'apply-customer-branding': (config, inputs, log) =>
    applyCustomerBranding(config, {
      primaryColor: (inputs?.primaryColor as string) || '',
      secondaryColor: inputs?.secondaryColor as string | undefined,
      logoUrl: inputs?.logoUrl as string | undefined,
    }, log),
  'configure-authenticators': (config, inputs, log) =>
    configureAuthenticators(config, {
      authenticators: (inputs?.authenticators as string | string[]) || [],
      action: (inputs?.action as string) || 'activate',
    }, log),
  'configure-threat-insight': (config, inputs, log) =>
    configureThreatInsight(config, {
      action: (inputs?.action as string) || 'audit',
      excludeZones: inputs?.excludeZones as string | undefined,
    }, log),
  'reset-demo-user-pool': (config, inputs, log) =>
    resetDemoUserPool(config, {
      groupName: inputs?.groupName as string | undefined,
      resetPasswords: inputs?.resetPasswords as string | undefined,
      resetFactors: inputs?.resetFactors as string | undefined,
    }, log),
  'create-authentication-policy': (config, inputs, log) =>
    createAuthenticationPolicy(config, {
      name: (inputs?.name as string) || '',
      preset: (inputs?.preset as string) || 'phishing-resistant',
      appInstance: (inputs?.appInstance as string) || '',
    }, log),
  'setup-behavior-detection': (config, _inputs, log) => setupBehaviorDetection(config, log),
  'create-password-policy': (config, inputs, log) =>
    createPasswordPolicy(config, {
      name: (inputs?.name as string) || '',
      preset: (inputs?.preset as string) || 'nist',
      groupName: inputs?.groupName as string | undefined,
    }, log),
  'create-enrollment-policy': (config, inputs, log) =>
    createEnrollmentPolicy(config, {
      name: (inputs?.name as string) || '',
      requiredAuthenticators: (inputs?.requiredAuthenticators as string | string[]) || [],
      optionalAuthenticators: inputs?.optionalAuthenticators as string | string[] | undefined,
    }, log),
  'enable-self-service-registration': (config, inputs, log) =>
    enableSelfServiceRegistration(config, {
      appInstance: (inputs?.appInstance as string) || '',
      requireEmailVerification: (inputs?.requireEmailVerification as string) || 'yes',
    }, log),
  'create-custom-admin-role': (config, inputs, log) =>
    createCustomAdminRole(config, {
      label: (inputs?.label as string) || '',
      description: (inputs?.description as string) || '',
      permissions: (inputs?.permissions as string | string[]) || [],
    }, log),
  'setup-event-hooks': (config, inputs, log) =>
    setupEventHooks(config, {
      webhookUrl: (inputs?.webhookUrl as string) || '',
      authHeader: inputs?.authHeader as string | undefined,
      events: (inputs?.events as string | string[]) || [],
    }, log),
  'create-oidc-app': (config, inputs, log) =>
    createOidcApp(config, {
      label: (inputs?.label as string) || '',
      appType: (inputs?.appType as string) || 'web',
      redirectUris: inputs?.redirectUris as string | undefined,
      postLogoutUris: inputs?.postLogoutUris as string | undefined,
    }, log),
  'configure-auth-server-policy': (config, inputs, log) =>
    configureAuthServerPolicy(config, {
      authServerId: (inputs?.authServerId as string) || '',
      policyName: (inputs?.policyName as string) || '',
      accessTokenLifetimeMinutes: (inputs?.accessTokenLifetimeMinutes as string) || '60',
      refreshTokenLifetimeMinutes: inputs?.refreshTokenLifetimeMinutes as string | undefined,
      grantTypes: (inputs?.grantTypes as string | string[]) || [],
    }, log),
  'customize-activation-email': (config, inputs, log) =>
    customizeActivationEmail(config, {
      subject: (inputs?.subject as string) || '',
      body: inputs?.body as string | undefined,
    }, log),
  'cleanup-demo-org': (config, inputs, log) =>
    cleanupDemoOrg(config, {
      deleteUsers: inputs?.deleteUsers as string | undefined,
      deleteGroups: inputs?.deleteGroups as string | undefined,
      deleteApps: inputs?.deleteApps as string | undefined,
    }, log),
};

export function getHandler(scriptId: ScriptId): HandlerFn | undefined {
  return handlers[scriptId];
}

export function hasHandler(scriptId: string): scriptId is ScriptId {
  return scriptId in handlers;
}
