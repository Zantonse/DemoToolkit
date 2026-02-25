# Okta SE Toolkit v2 — Modernization Design

**Date:** 2026-02-24
**Status:** Approved

## Goals

1. Fix all identified bugs and anti-patterns
2. Modernize UI with sidebar layout, dark mode, reusable components
3. Add high-value Okta API features: Org Health Dashboard, System Log Viewer, Network Zones/Trusted Origins, Auth Server management
4. Replace growing switch/case with registry pattern
5. Keep zero external UI dependencies (no shadcn, MUI, etc.)

## Architecture Changes

### Script Handler Registry

Replace the `handleRunSingle` switch/case with a `Record<ScriptId, HandlerFn>` map:

```typescript
// lib/scriptRegistry.ts
type HandlerFn = (config: OktaConfig, inputs?: Record<string, unknown>) => Promise<OktaActionResult>;
const registry: Record<ScriptId, HandlerFn> = {
  'enable-fido2': enableFIDO2,
  'create-super-admins-group': createSuperAdminsGroup,
  // ...auto-registered
};
```

### Sidebar Layout

- `app/components/Sidebar.tsx` — Collapsible sidebar with category nav, org health summary, connection status
- `app/components/AppShell.tsx` — Layout wrapper: sidebar + main content area
- Category navigation with counts + active state
- Settings as sidebar footer item
- Collapses to icon-only on narrow viewports, hamburger on mobile

### Shared UI Components

Extract to `app/components/ui/`:
- `Button.tsx` — primary, secondary, ghost variants
- `Card.tsx` — script card wrapper
- `Badge.tsx` — status badges (success, error, warning, info)
- `Input.tsx` / `Select.tsx` — form controls
- `Spinner.tsx` — loading indicator
- `Toast.tsx` — success/error notifications
- `SearchInput.tsx` — script search/filter
- `ThemeToggle.tsx` — dark/light/system toggle

### Dark Mode

- CSS variables in `globals.css` with `.dark` class (Tailwind v4 dark mode)
- `ThemeProvider` context wrapping the app
- Toggle in sidebar header
- All components use `dark:` variants

## New Features

### 1. Org Health Dashboard (sidebar widget + overview page)

Sidebar shows mini stats. Clicking expands to full overview page.

**API calls:**
- `GET /api/v1/users?limit=1` — read `x-total-count` header for user count
- `GET /api/v1/apps?limit=1` — app count
- `GET /api/v1/groups?limit=1` — group count
- `GET /api/v1/authenticators` — active authenticator list + MFA types
- Rate limit headers from any call — show current usage

**Server Action:** `getOrgHealth(config)` returns `{ userCount, appCount, groupCount, authenticators, rateLimits }`

### 2. System Log Viewer (new Tools category)

Real-time event log viewer with search and filtering.

**API:** `GET /api/v1/logs?since=...&filter=...&limit=100`

**UI:** Dedicated page at `/tools/logs` with:
- Auto-polling (5-second interval, toggleable)
- Event type filter (dropdown of common event types)
- Keyword search
- Expandable log entries showing full JSON
- Copy event JSON to clipboard

**Server Action:** `getSystemLogs(config, { since, filter, limit })` — paginated

### 3. Network Zones + Trusted Origins (Security & Policies)

**Scripts:**
- `create-network-zone` — Creates an IP network zone. Inputs: name, gateways (CIDR list), proxies (optional)
  - `POST /api/v1/zones`
- `list-network-zones` — Read-only: lists all zones
  - `GET /api/v1/zones`
- `create-trusted-origin` — Creates a trusted origin for CORS/redirect
  - `POST /api/v1/trustedOrigins`
- `list-trusted-origins` — Read-only
  - `GET /api/v1/trustedOrigins`

### 4. Auth Server + Custom Claims (Applications)

**Scripts:**
- `create-auth-server` — Creates a custom authorization server. Inputs: name, audience, description
  - `POST /api/v1/authorizationServers`
- `add-custom-claim` — Adds a claim to an auth server. Inputs: auth server (dynamic select), claim name, value expression, claim type
  - `POST /api/v1/authorizationServers/{id}/claims`
- `add-custom-scope` — Adds a scope to an auth server
  - `POST /api/v1/authorizationServers/{id}/scopes`

## Bug Fixes

1. **`populateDemoUsers` success logic** — Change to `errors.length === 0`; include partial success message when some fail
2. **`createStandardDepartmentGroups` search** — Use `search=profile.name eq "${dept}"` instead of `?q=`
3. **`addNewAdministrator` URL normalization** — Use `normalizeOrgUrl()` helper
4. **Dynamic options in render** — Move to `useEffect` with dependency on `hasCredentials`
5. **Dead code removal** — Remove `updateAdminConsolePolicy`, `clientSecret` from types/context
6. **Console.log cleanup** — Remove all `console.log` from Server Actions
7. **Entitlement bundle payload** — Align `createEntitlementBundles` to use same structure as `setupSodDemo`
8. **Geist font** — Replace with Inter via `next/font/google`
9. **Redundant `'use server'` directives** — Remove function-level directives (file-level is sufficient)

## Category Structure (Final)

| Category | Scripts |
|----------|---------|
| Setup & Users | create-super-admins-group, populate-demo-users, create-standard-department-groups, setup-realms, add-new-administrator |
| Security & Policies | enable-fido2, create-device-assurance-policies, configure-entity-risk-policy, run-policy-simulation, create-network-zone, list-network-zones, create-trusted-origin, list-trusted-origins |
| Applications | add-salesforce-saml-app, add-box-app, create-auth-server, add-custom-claim, add-custom-scope |
| Governance | create-access-certification-campaign, setup-sod-demo, create-entitlement-bundles |
| Tools | system-log-viewer |

Plus the Org Health Dashboard as a sidebar widget / overview page.

## Technical Decisions

- **No external UI libraries** — continue pure Tailwind + custom components
- **Inter font** — via `next/font/google`, replacing broken Geist references
- **Dark mode** — class-based via Tailwind v4's `@variant dark (&:where(.dark, .dark *))` + system preference detection
- **No icon library** — use inline SVG for the ~15 icons needed (sidebar nav, theme toggle, status indicators)
- **Toast system** — React portal + context, auto-dismiss after 5s
