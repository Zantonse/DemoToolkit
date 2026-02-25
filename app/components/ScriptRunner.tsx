/**
 * Script Runner Component
 *
 * Main component that displays and executes automation scripts.
 *
 * Features:
 * - Filter scripts by category via activeCategory prop
 * - Search scripts by name/description
 * - Execute individual scripts
 * - Execute all scripts in sequence with "Run All Scripts" button
 * - Display real-time execution status
 * - Show success/error badges and messages
 * - Validate credentials before execution
 * - Uses script handler registry (lib/scriptRegistry.ts) instead of switch/case
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useOkta } from '../context/OktaContext';
import { automationScripts, type ScriptId } from '../../lib/data/automationScripts';
import { getHandler } from '../../lib/scriptRegistry';
import type { AutomationScript } from '../../lib/types/automation';
import type { OktaActionResult } from '../../lib/types/okta';
import { runAllScripts } from '../actions/oktaActions';
import { Badge, Button, Spinner, SearchInput } from './ui';
import type { CategoryType } from './Sidebar';

type ScriptResult = OktaActionResult;

interface ScriptRunnerProps {
  activeCategory?: CategoryType;
}

const categoryOrder: CategoryType[] = [
  'Setup & Users',
  'Security & Policies',
  'Applications',
  'Governance',
  'Tools',
];

export function ScriptRunner({ activeCategory = 'all' }: ScriptRunnerProps) {
  const { orgUrl, apiToken, clientId, privateKey, keyId } = useOkta();

  const [runningScriptId, setRunningScriptId] = useState<ScriptId | 'all' | null>(null);
  const [scriptResults, setScriptResults] = useState<Record<string, ScriptResult | null>>({});
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [scriptInputs, setScriptInputs] = useState<Record<string, Record<string, string | string[]>>>({});
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const hasCredentials = useMemo(
    () => orgUrl.trim() !== '' && apiToken.trim() !== '',
    [orgUrl, apiToken]
  );

  const isAnyRunning = runningScriptId !== null;

  // Filter scripts by activeCategory
  const visibleScripts = useMemo(() => {
    const byCategory =
      activeCategory === 'all'
        ? automationScripts
        : automationScripts.filter((s) => s.category === activeCategory);

    if (!searchQuery.trim()) return byCategory;

    const q = searchQuery.toLowerCase();
    return byCategory.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [activeCategory, searchQuery]);

  // Group visible scripts by category, preserving categoryOrder
  const scriptsByCategory = useMemo(() => {
    return visibleScripts.reduce((acc, script) => {
      const cat = script.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(script);
      return acc;
    }, {} as Record<string, AutomationScript[]>);
  }, [visibleScripts]);

  // Ordered categories to render (only those that have scripts in current filter)
  const orderedCategories = useMemo(() => {
    const all = [...categoryOrder, 'Other'] as string[];
    return all.filter((c) => scriptsByCategory[c] && scriptsByCategory[c].length > 0);
  }, [scriptsByCategory]);

  const updateScriptResult = (scriptId: ScriptId, result: ScriptResult) => {
    setScriptResults((prev) => ({ ...prev, [scriptId]: result }));
  };

  const buildConfig = () => ({ orgUrl, apiToken, clientId, privateKey, keyId });

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
          const options = apps.map((app: { id: string; label: string; signOnMode: string }) => ({
            value: app.id,
            label: `${app.label} (${app.signOnMode})`,
          }));
          setDynamicOptions((prev) => ({ ...prev, [cacheKey]: options }));
        } else {
          const body = await response.json().catch(() => null);
          console.error('Failed to load applications', body?.error || response.statusText);
        }
      } else if (fieldName === 'authServerId') {
        const response = await fetch('/api/okta/auth-servers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgUrl, apiToken }),
          cache: 'no-store',
        });

        if (response.ok) {
          const payload = await response.json();
          const servers = payload.authServers || [];
          const options = servers.map((s: { id: string; name: string; audiences: string[] }) => ({
            value: s.id,
            label: `${s.name} (${s.audiences?.join(', ') ?? s.id})`,
          }));
          setDynamicOptions((prev) => ({ ...prev, [cacheKey]: options }));
        } else {
          const body = await response.json().catch(() => null);
          console.error('Failed to load authorization servers', body?.error || response.statusText);
        }
      }
    } catch (error) {
      console.error('Error loading dynamic options:', error);
    } finally {
      setLoadingOptions((prev) => ({ ...prev, [cacheKey]: false }));
    }
  };

  // Trigger dynamic option loading via useEffect for visible scripts
  useEffect(() => {
    if (!hasCredentials) return;
    for (const script of visibleScripts) {
      if (!script.requiresInput || !script.inputFields) continue;
      for (const field of script.inputFields) {
        if (field.dynamicOptions) {
          const cacheKey = `${script.id}-${field.name}`;
          if (!dynamicOptions[cacheKey] && !loadingOptions[cacheKey]) {
            loadDynamicOptions(script.id as ScriptId, field.name);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleScripts, hasCredentials]);

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

      const handler = getHandler(scriptId);
      if (!handler) {
        result = { success: false, message: `Unknown script id: ${scriptId}` };
      } else {
        const script = automationScripts.find((s) => s.id === scriptId);
        if (script?.requiresInput) {
          const inputs = scriptInputs[scriptId] || {};
          const missingRequired = script.inputFields?.filter((f) => f.required && !inputs[f.name]);
          if (missingRequired && missingRequired.length > 0) {
            result = {
              success: false,
              message: `Please fill in: ${missingRequired.map((f) => f.label).join(', ')}`,
            };
          } else {
            result = await handler(config, inputs as Record<string, string | string[] | undefined>);
          }
        } else {
          result = await handler(config);
        }
      }

      if (result) {
        updateScriptResult(scriptId, result);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      updateScriptResult(scriptId, { success: false, message: msg });
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setGlobalMessage(`Unexpected error while running all scripts: ${msg}`);
    } finally {
      setRunningScriptId(null);
    }
  };

  const renderStatusBadge = (scriptId: ScriptId) => {
    const result = scriptResults[scriptId];
    if (!result) return null;
    return (
      <Badge variant={result.success ? 'success' : 'error'}>
        {result.success ? 'Success' : 'Error'}
      </Badge>
    );
  };

  const renderResultMessage = (scriptId: ScriptId) => {
    const result = scriptResults[scriptId];
    if (!result) return null;
    const classes = result.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
    return <p className={`mt-1 text-xs ${classes}`}>{result.message}</p>;
  };

  const isScriptRunning = (scriptId: ScriptId) =>
    runningScriptId === scriptId || runningScriptId === 'all';

  const categoryTitle =
    activeCategory === 'all' ? 'All Scripts' : activeCategory;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {categoryTitle}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Run Okta SE setup workflows against your configured org.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleRunAll}
          disabled={isAnyRunning || !hasCredentials}
          loading={runningScriptId === 'all'}
        >
          Run All Scripts
        </Button>
      </div>

      {/* Search */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search scripts by name or description…"
      />

      {/* Credentials warning */}
      {!hasCredentials && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <p className="font-medium">Okta credentials not configured.</p>
          <p className="mt-0.5 text-xs">
            Set your Okta Org URL and API Token in Settings before running scripts.
          </p>
        </div>
      )}

      {/* Global message */}
      {globalMessage && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {globalMessage}
        </div>
      )}

      {/* Empty state */}
      {visibleScripts.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {searchQuery ? 'No scripts match your search.' : 'No scripts in this category.'}
          </p>
        </div>
      )}

      {/* Script cards grouped by category */}
      <div className="space-y-8">
        {orderedCategories.map((category) => {
          const scripts = scriptsByCategory[category];
          if (!scripts || scripts.length === 0) return null;

          return (
            <div key={category}>
              {/* Only show category heading when showing "all" or when showing a single category but still want heading */}
              {(activeCategory === 'all' || orderedCategories.length > 1) && (
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {category}
                </h3>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {scripts.map((script: AutomationScript) => {
                  const scriptId = script.id as ScriptId;
                  const running = isScriptRunning(scriptId);

                  return (
                    <article
                      key={script.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {script.name}
                            </h4>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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

                            return (
                              <div key={field.name}>
                                <label
                                  htmlFor={`${scriptId}-${field.name}`}
                                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                                >
                                  {field.label}{' '}
                                  {field.required && <span className="text-red-500">*</span>}
                                </label>

                                {field.type === 'select' ? (
                                  <select
                                    id={`${scriptId}-${field.name}`}
                                    multiple={field.multiple}
                                    value={
                                      field.multiple
                                        ? ((scriptInputs[scriptId]?.[field.name] as string[]) || [])
                                        : ((scriptInputs[scriptId]?.[field.name] as string) || '')
                                    }
                                    onChange={(e) => {
                                      const value = field.multiple
                                        ? Array.from(e.target.selectedOptions, (o) => o.value)
                                        : e.target.value;
                                      setScriptInputs((prev) => ({
                                        ...prev,
                                        [scriptId]: { ...prev[scriptId], [field.name]: value },
                                      }));
                                    }}
                                    disabled={isAnyRunning || isLoadingOpts}
                                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-sky-400 dark:disabled:bg-slate-800"
                                    size={field.multiple ? 4 : undefined}
                                  >
                                    {!field.multiple && (
                                      <option value="">-- Select {field.label} --</option>
                                    )}
                                    {isLoadingOpts ? (
                                      <option value="" disabled>
                                        Loading…
                                      </option>
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
                                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-sky-400 dark:disabled:bg-slate-800"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Uses Okta Management APIs
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRunSingle(scriptId)}
                          disabled={isAnyRunning || !hasCredentials}
                          loading={running}
                        >
                          {running ? 'Running…' : 'Run'}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
