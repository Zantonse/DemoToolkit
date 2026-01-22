/**
 * Script Runner Component
 * 
 * Main component that displays and executes automation scripts.
 * 
 * Features:
 * - Display all available scripts in a grid layout
 * - Execute individual scripts
 * - Execute all scripts in sequence with "Run All Scripts" button
 * - Display real-time execution status
 * - Show success/error badges and messages
 * - Validate credentials before execution
 * 
 * The component maps script IDs to their corresponding handler functions
 * in app/actions/oktaActions.ts
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useOkta } from '../context/OktaContext';
import { automationScripts } from '../../lib/data/automationScripts';
import type { AutomationScript } from '../../lib/types/automation';
import type { OktaActionResult } from '../../lib/types/okta';
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
  runAllScripts,
  setupSodDemo,
} from '../actions/oktaActions';

/**
 * Union type of all valid script IDs
 * Must match the IDs in lib/data/automationScripts.ts
 */
type ScriptId =
  | 'enable-fido2'
  | 'create-super-admins-group'
  | 'populate-demo-users'
  | 'create-standard-department-groups'
  | 'create-device-assurance-policies'
  | 'configure-entity-risk-policy'
  | 'add-salesforce-saml-app'
  | 'add-box-app'
  | 'create-access-certification-campaign'
  | 'setup-realms'
  | 'add-new-administrator'
  | 'run-policy-simulation'
  | 'setup-sod-demo';



type ScriptResult = OktaActionResult;

export function ScriptRunner() {
  const { orgUrl, apiToken, clientId, clientSecret, privateKey, keyId } = useOkta();

  const [runningScriptId, setRunningScriptId] = useState<ScriptId | 'all' | null>(null);
  const [scriptResults, setScriptResults] = useState<Record<string, ScriptResult | null>>({});
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [scriptInputs, setScriptInputs] = useState<Record<string, Record<string, string | string[]>>>({});
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({});

  const hasCredentials = useMemo(
    () => orgUrl.trim() !== '' && apiToken.trim() !== '',
    [orgUrl, apiToken]
  );

  const isAnyRunning = runningScriptId !== null;

  const updateScriptResult = (scriptId: ScriptId, result: ScriptResult) => {
    setScriptResults((prev) => ({
      ...prev,
      [scriptId]: result,
    }));
  };

  const buildConfig = () => ({
    orgUrl,
    apiToken,
    clientId,
    clientSecret,
    privateKey,
    keyId,
  });

  // Load dynamic options for select fields (e.g., applications list)
  const loadDynamicOptions = async (scriptId: ScriptId, fieldName: string) => {
    if (!hasCredentials) return;

    const cacheKey = `${scriptId}-${fieldName}`;
    if (dynamicOptions[cacheKey] || loadingOptions[cacheKey]) return;

    setLoadingOptions((prev) => ({ ...prev, [cacheKey]: true }));

    try {
      if (fieldName === 'appInstance') {
        const response = await fetch('/api/okta/apps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgUrl, apiToken }),
          cache: 'no-store',
        });

        if (response.ok) {
          const payload = await response.json();
          const apps = payload.apps || [];
          const options = apps.map((app: any) => ({
            value: app.id,
            label: `${app.label} (${app.signOnMode})`,
          }));
          setDynamicOptions((prev) => ({ ...prev, [cacheKey]: options }));
        } else {
          const body = await response.json().catch(() => null);
          console.error('Failed to load applications', body?.error || response.statusText);
        }
      }
    } catch (error) {
      console.error('Error loading dynamic options:', error);
    } finally {
      setLoadingOptions((prev) => ({ ...prev, [cacheKey]: false }));
    }
  };

  const handleRunSingle = async (scriptId: ScriptId) => {
    if (!hasCredentials) {
      setGlobalMessage('Please configure your Okta Org URL and API Token before running scripts.');
      return;
    }

    setGlobalMessage(null);
    setRunningScriptId(scriptId);

    try {
      const config = buildConfig();
      let result: ScriptResult | null = null;

      switch (scriptId) {
        case 'enable-fido2':
          result = await enableFIDO2(config);
          break;

        case 'create-super-admins-group':
          // This now automatically assigns SUPER_ADMIN role after creating the group
          result = await createSuperAdminsGroup(config);
          break;

        case 'populate-demo-users':
          result = await populateDemoUsers(config);
          break;

        case 'create-standard-department-groups':
          result = await createStandardDepartmentGroups(config);
          break;

        case 'create-device-assurance-policies':
          result = await createDeviceAssurancePolicies(config);
          break;

        case 'configure-entity-risk-policy':
          result = await configureEntityRiskPolicy(config);
          break;

        case 'add-salesforce-saml-app':
          result = await addSalesforceSAMLApp(config);
          break;

        case 'add-box-app':
          result = await addBoxApp(config);
          break;

        case 'create-access-certification-campaign':
          result = await createAccessCertificationCampaign(config);
          break;

        case 'setup-realms':
          result = await setupRealms(config);
          break;

        case 'add-new-administrator':
          const adminInputs = scriptInputs[scriptId] || {};
          if (!adminInputs.firstName || !adminInputs.lastName || !adminInputs.email) {
            result = {
              success: false,
              message: 'Please fill in all required fields (First Name, Last Name, and Email).',
            };
          } else {
            result = await addNewAdministrator(config, {
              firstName: adminInputs.firstName as string,
              lastName: adminInputs.lastName as string,
              email: adminInputs.email as string,
            });
          }
          break;

        case 'run-policy-simulation':
          const simInputs = scriptInputs[scriptId] || {};
          if (!simInputs.appInstance) {
            result = {
              success: false,
              message: 'Please select an application.',
            };
          } else {
            result = await runPolicySimulation(config, {
              appInstance: simInputs.appInstance as string,
              policyTypes: simInputs.policyTypes ? (simInputs.policyTypes as string[]) : undefined,
            });
          }
          break;

        case 'setup-sod-demo':
          const sodInputs = scriptInputs[scriptId] || {};
          if (!sodInputs.appId) {
            result = {
              success: false,
              message: 'Please enter an Application Instance ID.',
            };
          } else {
            result = await setupSodDemo(config, {
              appId: sodInputs.appId as string,
              entitlementName: sodInputs.entitlementName as string | undefined,
              role1Name: sodInputs.role1Name as string | undefined,
              role2Name: sodInputs.role2Name as string | undefined,
            });
          }
          break;

        default:
          result = {
            success: false,
            message: `Unknown script id: ${scriptId}`,
          };
      }

      if (result) {
        updateScriptResult(scriptId, result);
      }
    } catch (error: any) {
      updateScriptResult(scriptId, {
        success: false,
        message: error?.message ?? String(error),
      });
    } finally {
      setRunningScriptId(null);
    }
  };

  const handleRunAll = async () => {
    if (!hasCredentials) {
      setGlobalMessage('Please configure your Okta Org URL and API Token before running scripts.');
      return;
    }

    setGlobalMessage(null);
    setRunningScriptId('all');

    try {
      const config = buildConfig();
      const overall = await runAllScripts(config);

      // Map runAllScripts results back to individual cards
      if (overall.data) {
        const {
          enableFIDO2: r1,
          createSuperAdminsGroup: r2,
          populateDemoUsers: r3,
          createStandardDepartmentGroups: r4,
          createDeviceAssurancePolicies: r5,
          configureEntityRiskPolicy: r6,
          addSalesforceSAMLApp: r7,
          addBoxApp: r8,
          createAccessCertificationCampaign: r9,
          setupRealms: r10,
        } = overall.data;

        const next: Record<string, ScriptResult> = {
          'enable-fido2': r1,
          'create-super-admins-group': r2,
          'populate-demo-users': r3,
          'create-standard-department-groups': r4,
          'create-device-assurance-policies': r5,
          'configure-entity-risk-policy': r6,
          'add-salesforce-saml-app': r7,
          'add-box-app': r8,
          'create-access-certification-campaign': r9,
          'setup-realms': r10,
        };

        setScriptResults(next);
      }

      setGlobalMessage(overall.message);
    } catch (error: any) {
      setGlobalMessage(
        `Unexpected error while running all scripts: ${error?.message ?? String(error)}`
      );
    } finally {
      setRunningScriptId(null);
    }
  };

  const renderStatusBadge = (scriptId: ScriptId) => {
    const result = scriptResults[scriptId];
    if (!result) return null;

    const baseClasses =
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border';

    if (result.success) {
      return (
        <span className={`${baseClasses} border-emerald-200 bg-emerald-50 text-emerald-700`}>
          ● Success
        </span>
      );
    }

    return (
      <span className={`${baseClasses} border-red-200 bg-red-50 text-red-700`}>
        ● Error
      </span>
    );
  };

  const renderResultMessage = (scriptId: ScriptId) => {
    const result = scriptResults[scriptId];
    if (!result) return null;

    const classes = result.success ? 'text-emerald-700' : 'text-red-600';

    return (
      <p className={`mt-1 text-xs ${classes}`}>
        {result.message}
      </p>
    );
  };

  const isScriptRunning = (scriptId: ScriptId) =>
    runningScriptId === scriptId || runningScriptId === 'all';

  const Spinner = () => (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border border-sky-500 border-t-transparent" />
  );

  // Group scripts by category
  const scriptsByCategory = automationScripts.reduce((acc, script) => {
    const category = script.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(script);
    return acc;
  }, {} as Record<string, AutomationScript[]>);

  const categoryOrder = [
    'Setup & Users',
    'Security & Policies',
    'Applications',
    'Governance',
    'Other'
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Automation Scripts</h2>
          <p className="text-sm text-slate-500">
            Run common Okta SE setup workflows against your configured org.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunAll}
            disabled={isAnyRunning || !hasCredentials}
            className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningScriptId === 'all' ? <Spinner /> : null}
            Run All Scripts
          </button>

          <Link
            href="/settings"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            Settings
          </Link>
        </div>
      </header>

      <div className="space-y-4 px-6 py-4">
        {/* Credentials warning */}
        {!hasCredentials && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="font-medium">Okta credentials not configured.</p>
            <p>
              Set your Okta Org URL and API Token in the{' '}
              <Link href="/settings" className="underline">
                Settings
              </Link>{' '}
              page before running scripts.
            </p>
          </div>
        )}

        {/* Global message */}
        {globalMessage && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            {globalMessage}
          </div>
        )}

        {/* Script cards grouped by category */}
        <div className="space-y-8">
          {categoryOrder.map((category) => {
            const scripts = scriptsByCategory[category];
            if (!scripts || scripts.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                  {category}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {scripts.map((script: AutomationScript) => {
                    const scriptId = script.id as ScriptId;
                    const running = isScriptRunning(scriptId);

                    return (
                      <article
                        key={script.id}
                        className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">
                                {script.name}
                              </h3>
                              <p className="mt-1 text-xs text-slate-600">
                                {script.description}
                              </p>
                            </div>
                            {renderStatusBadge(scriptId)}
                          </div>

                          {renderResultMessage(scriptId)}
                        </div>

                        {/* Input fields for scripts that require them */}
                        {script.requiresInput && script.inputFields && (
                          <div className="mt-3 space-y-2">
                            {script.inputFields.map((field) => {
                              const cacheKey = `${scriptId}-${field.name}`;
                              const isLoadingOpts = loadingOptions[cacheKey];
                              const options = field.dynamicOptions
                                ? dynamicOptions[cacheKey] || []
                                : field.options || [];

                              // Load dynamic options on mount if needed
                              if (field.dynamicOptions && !isLoadingOpts && options.length === 0) {
                                loadDynamicOptions(scriptId, field.name);
                              }

                              return (
                                <div key={field.name}>
                                  <label htmlFor={`${scriptId}-${field.name}`} className="block text-xs font-medium text-slate-700">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                  </label>
                                  
                                  {field.type === 'select' ? (
                                    <select
                                      id={`${scriptId}-${field.name}`}
                                      multiple={field.multiple}
                                      value={field.multiple 
                                        ? (scriptInputs[scriptId]?.[field.name] as string[] || [])
                                        : (scriptInputs[scriptId]?.[field.name] as string || '')}
                                      onChange={(e) => {
                                        const value = field.multiple
                                          ? Array.from(e.target.selectedOptions, (option) => option.value)
                                          : e.target.value;
                                        setScriptInputs((prev) => ({
                                          ...prev,
                                          [scriptId]: {
                                            ...prev[scriptId],
                                            [field.name]: value,
                                          },
                                        }));
                                      }}
                                      disabled={isAnyRunning || isLoadingOpts}
                                      className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                                      size={field.multiple ? 4 : undefined}
                                    >
                                      {!field.multiple && <option value="">-- Select {field.label} --</option>}
                                      {isLoadingOpts ? (
                                        <option value="" disabled>Loading...</option>
                                      ) : (
                                        options.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))
                                      )}
                                    </select>
                                  ) : (
                                    <input
                                      type={field.type}
                                      id={`${scriptId}-${field.name}`}
                                      placeholder={field.placeholder}
                                      value={(scriptInputs[scriptId]?.[field.name] as string) || ''}
                                      onChange={(e) => {
                                        setScriptInputs((prev) => ({
                                          ...prev,
                                          [scriptId]: {
                                            ...prev[scriptId],
                                            [field.name]: e.target.value,
                                          },
                                        }));
                                      }}
                                      disabled={isAnyRunning}
                                      className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-[11px] text-slate-400">
                            Uses Okta Management APIs. Ensure your token has the
                            appropriate scopes.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRunSingle(scriptId)}
                            disabled={isAnyRunning || !hasCredentials}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {running && <Spinner />}
                            <span>{running ? 'Running…' : 'Run'}</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
