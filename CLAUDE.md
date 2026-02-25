# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Okta SE Toolkit is a Next.js 16 (App Router) web application for Okta Sales Engineers to automate common setup and demo preparation tasks. It provides a sidebar-driven dashboard UI to execute Okta Management API operations, view org health, and monitor system logs — without manual Admin Console navigation. No environment variables are required — credentials are stored client-side in browser localStorage.

## Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint (eslint-config-next)
```

No test framework is configured.

## Architecture

### Layout System
- **`app/components/AppShell.tsx`** — Top-level layout wrapper. Manages view state (`scripts | settings | overview | logs`) and active category. Renders Sidebar + main content area. Handles responsive mobile overlay.
- **`app/components/Sidebar.tsx`** — Collapsible sidebar with category navigation, script counts, connection status indicator, theme toggle, and settings link. Collapses to icon-only mode.

### Server Actions Pattern
The app uses Next.js Server Actions (`'use server'`) for all Okta API calls. This keeps API tokens server-side during execution while allowing the UI to be client-rendered.

- **`app/actions/oktaActions.ts`** — All script handler functions. Each is an exported async function taking `OktaConfig` and returning `OktaActionResult`. Also contains `getOrgHealth` and `getSystemLogs` actions.
- **`app/actions/helpers/`** — Shared Okta API utilities, re-exported via `helpers/index.ts`:
  - `okta-api.ts` — SSWS auth helpers (`normalizeOrgUrl`, `oktaHeaders`, `safeJson`, `oktaFetch`, `oktaFetchRaw`) and Okta entity types
  - `oauth.ts` — OAuth 2.0 private_key_jwt helpers (`generateClientAssertion`, `getOAuthAccessToken`, `oigFetch`) for OIG APIs

### Script Handler Registry
- **`lib/scriptRegistry.ts`** — Maps `ScriptId` to handler functions via a `Record<ScriptId, HandlerFn>` map. ScriptRunner uses `getHandler(scriptId)` instead of a switch/case.

### UI Components
- **`app/components/ui/`** — Shared reusable components (Button, Badge, Spinner, Card, Input, Select, SearchInput, Toast, ThemeToggle). All support dark mode via `dark:` variants.
- **`app/components/ScriptRunner.tsx`** — Script card grid with category filtering, search, dynamic options loading, and execution management. Uses the script registry for dispatch.
- **`app/components/SettingsPanel.tsx`** — Credential form with connection testing.
- **`app/components/OrgHealthDashboard.tsx`** — Org stats (user/app/group counts, authenticators) via parallel API calls.
- **`app/components/SystemLogViewer.tsx`** — Real-time log viewer with polling, event type filtering, keyword search, and expandable JSON entries.

### Context Providers
- **`app/context/OktaContext.tsx`** — React Context for credentials stored in browser localStorage (orgUrl, apiToken, authMode, clientId, privateKey, keyId).
- **`app/context/ThemeContext.tsx`** — Dark/light/system theme toggle with localStorage persistence and system preference detection.

### Key Data Flow
1. Credentials stored in browser localStorage via `OktaContext`
2. User navigates via Sidebar to a category or view
3. `ScriptRunner` displays filtered scripts; user clicks "Run"
4. Registry dispatches to the correct Server Action from `oktaActions.ts`
5. Server Action makes Okta API calls using SSWS token auth (or OAuth for OIG APIs)
6. Result displayed inline + toast notification

### Adding New Automation Scripts

Three files must be updated (the `ScriptId` type auto-derives from `SCRIPT_IDS`):

1. **Add metadata** in `lib/data/automationScripts.ts`:
   - Add the ID string to the `SCRIPT_IDS` const tuple (this auto-updates the `ScriptId` union type)
   - Add the script object to the `automationScripts` array

2. **Create handler** in `app/actions/oktaActions.ts`:
   ```typescript
   export async function yourHandler(config: OktaConfig): Promise<OktaActionResult> {
     // Use helpers from app/actions/helpers/ for API calls
   }
   ```

3. **Register handler** in `lib/scriptRegistry.ts`:
   - Import the handler function
   - Add an entry to the `handlers` map with input mapping

4. **Optional**: Add to `runAllScripts` in `oktaActions.ts` if it should run in bulk mode

### Type System

- `OktaConfig` — Credentials object: orgUrl, apiToken, optional OAuth fields (clientId, privateKey, keyId)
- `OktaActionResult<T>` — Standard return type `{ success, message, data? }`
- `AutomationScript` — Script metadata for UI display (supports `requiresInput` with `inputFields` for dynamic forms)
- `ScriptId` — Union type derived from `SCRIPT_IDS` const tuple in `automationScripts.ts`

### Script Categories

| Category | Scripts |
|----------|---------|
| Setup & Users | create-super-admins-group, populate-demo-users, create-standard-department-groups, setup-realms, add-new-administrator |
| Security & Policies | enable-fido2, create-device-assurance-policies, configure-entity-risk-policy, run-policy-simulation, create-network-zone, list-network-zones, create-trusted-origin, list-trusted-origins |
| Applications | add-salesforce-saml-app, add-box-app, create-auth-server, add-custom-claim, add-custom-scope |
| Governance | create-access-certification-campaign, setup-sod-demo, create-entitlement-bundles |

### API Routes

- `app/api/test-connection/route.ts` — Validates Okta credentials via `/api/v1/users/me`
- `app/api/okta/apps/route.ts` — Lists apps for dynamic select fields
- `app/api/okta/auth-servers/route.ts` — Lists authorization servers for dynamic select fields

### Authentication Modes

- **SSWS** (default) — Standard Okta API token authentication. Use `oktaFetch()` from helpers.
- **OAuth** — For OIG (Okta Identity Governance) APIs requiring private_key_jwt client_credentials flow. Use `oigFetch()` from helpers. Supports both PEM and JWK private key formats via `jose`.

### Styling

- **Tailwind CSS v4** with `@import "tailwindcss"` syntax
- **Dark mode** via `@custom-variant dark` (class-based) + `ThemeContext`
- **Inter font** via `next/font/google`
- **No external UI library** — all components are custom Tailwind

## Okta API Patterns

- Scripts handle "already exists" scenarios gracefully (e.g., if a user/group exists, skip rather than error)
- Use the shared helpers in `app/actions/helpers/` rather than writing raw fetch calls
- For exact-match group search, use `search=profile.name eq "..."` (not `?q=` which is prefix/contains)
- Use `oktaFetchRaw` when you need to read response headers (e.g., `x-total-count`)
