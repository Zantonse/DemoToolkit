/**
 * Script Handler Registry
 *
 * Maps ScriptId strings to their corresponding server action handler functions.
 * Use getHandler(scriptId) in ScriptRunner instead of a switch/case.
 */

import type { OktaConfig, OktaActionResult } from './types/okta';
import type { ScriptId } from './data/automationScripts';
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
} from '../app/actions/oktaActions';

export type HandlerFn = (
  config: OktaConfig,
  inputs?: Record<string, string | string[] | undefined>
) => Promise<OktaActionResult>;

const handlers: Record<string, HandlerFn> = {
  'enable-fido2': (config) => enableFIDO2(config),
  'create-super-admins-group': (config) => createSuperAdminsGroup(config),
  'populate-demo-users': (config) => populateDemoUsers(config),
  'create-standard-department-groups': (config) => createStandardDepartmentGroups(config),
  'create-device-assurance-policies': (config) => createDeviceAssurancePolicies(config),
  'configure-entity-risk-policy': (config) => configureEntityRiskPolicy(config),
  'add-salesforce-saml-app': (config) => addSalesforceSAMLApp(config),
  'add-box-app': (config) => addBoxApp(config),
  'create-access-certification-campaign': (config) => createAccessCertificationCampaign(config),
  'setup-realms': (config) => setupRealms(config),
  'add-new-administrator': (config, inputs) =>
    addNewAdministrator(config, {
      firstName: (inputs?.firstName as string) || '',
      lastName: (inputs?.lastName as string) || '',
      email: (inputs?.email as string) || '',
    }),
  'run-policy-simulation': (config, inputs) =>
    runPolicySimulation(config, {
      appInstance: (inputs?.appInstance as string) || '',
      policyTypes: inputs?.policyTypes as string[] | undefined,
    }),
  'setup-sod-demo': (config, inputs) =>
    setupSodDemo(config, {
      appId: (inputs?.appId as string) || '',
      entitlementName: inputs?.entitlementName as string | undefined,
      role1Name: inputs?.role1Name as string | undefined,
      role2Name: inputs?.role2Name as string | undefined,
    }),
  'create-entitlement-bundles': (config, inputs) =>
    createEntitlementBundles(config, {
      entitlementId: (inputs?.entitlementId as string) || '',
      bundle1Name: (inputs?.bundle1Name as string) || '',
      bundle1ValueId: (inputs?.bundle1ValueId as string) || '',
      bundle2Name: inputs?.bundle2Name as string | undefined,
      bundle2ValueId: inputs?.bundle2ValueId as string | undefined,
    }),
  'create-network-zone': (config, inputs) =>
    createNetworkZone(config, {
      name: inputs?.name as string | undefined,
      gateways: inputs?.gateways as string | undefined,
    }),
  'list-network-zones': (config) => listNetworkZones(config),
  'create-trusted-origin': (config, inputs) =>
    createTrustedOrigin(config, {
      name: inputs?.name as string | undefined,
      origin: inputs?.origin as string | undefined,
      scopes: inputs?.scopes as string | string[] | undefined,
    }),
  'list-trusted-origins': (config) => listTrustedOrigins(config),
  'create-auth-server': (config, inputs) =>
    createAuthServer(config, {
      name: inputs?.name as string | undefined,
      audiences: inputs?.audiences as string | undefined,
      description: inputs?.description as string | undefined,
    }),
  'add-custom-claim': (config, inputs) =>
    addCustomClaim(config, {
      authServerId: inputs?.authServerId as string | undefined,
      claimName: inputs?.claimName as string | undefined,
      valueExpression: inputs?.valueExpression as string | undefined,
      claimType: inputs?.claimType as string | undefined,
    }),
  'add-custom-scope': (config, inputs) =>
    addCustomScope(config, {
      authServerId: inputs?.authServerId as string | undefined,
      scopeName: inputs?.scopeName as string | undefined,
      description: inputs?.description as string | undefined,
      consent: inputs?.consent as string | undefined,
    }),
};

export function getHandler(scriptId: ScriptId): HandlerFn | undefined {
  return handlers[scriptId];
}

export function hasHandler(scriptId: string): scriptId is ScriptId {
  return scriptId in handlers;
}
