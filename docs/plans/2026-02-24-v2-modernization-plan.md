# Okta SE Toolkit v2 Modernization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Okta SE Toolkit from a single-page card list into a modern sidebar-driven dashboard with dark mode, bug fixes, and new Okta API features (Org Health, System Log, Network Zones, Auth Servers).

**Architecture:** Sidebar + content layout using pure Tailwind CSS v4. Script handler registry replaces switch/case. Theme context for dark mode. Shared UI components extracted from existing patterns. New server actions for additional Okta API endpoints.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Inter font via next/font/google, jose for JWT.

**No test framework configured** — verification is `npm run build` + browser check.

---

## Phase 1: Foundation (Bug Fixes + Shared Components)

### Task 1: Fix bugs in oktaActions.ts

**Files:**
- Modify: `app/actions/oktaActions.ts`
- Modify: `app/actions/helpers/okta-api.ts`

**Step 1:** Fix `populateDemoUsers` success logic — change the condition to properly report partial failures.

**Step 2:** Fix `createStandardDepartmentGroups` — replace `?q=${dept}` with `search=profile.name eq "${encodeURIComponent(dept)}"`.

**Step 3:** Fix `addNewAdministrator` — replace manual URL normalization with `normalizeOrgUrl()` import.

**Step 4:** Remove dead `updateAdminConsolePolicy` function.

**Step 5:** Remove all `console.log` calls from server actions (keep `console.error` for actual errors).

**Step 6:** Fix entitlement bundle payload in `createEntitlementBundles` to use same structure as `setupSodDemo`.

**Step 7:** Remove redundant function-level `'use server'` directives (file already has top-level).

**Step 8:** Run `npm run build` to verify no type errors.

**Step 9:** Commit: `fix: resolve bugs in oktaActions — success logic, search, dead code`

### Task 2: Clean up types and context

**Files:**
- Modify: `lib/types/okta.ts` — remove `clientSecret`
- Modify: `app/context/OktaContext.tsx` — remove `clientSecret` state + localStorage
- Modify: `app/components/SettingsPanel.tsx` — remove `clientSecret` field if present
- Modify: `lib/types/automation.ts` — add `'Tools'` to category union

**Step 1:** Remove `clientSecret` from `OktaConfig` interface, `OktaContext`, and `SettingsPanel`.

**Step 2:** Add `'Tools'` to the category union type in `AutomationScript`.

**Step 3:** Run `npm run build`.

**Step 4:** Commit: `chore: remove unused clientSecret, add Tools category`

### Task 3: Create shared UI components

**Files:**
- Create: `app/components/ui/Button.tsx`
- Create: `app/components/ui/Badge.tsx`
- Create: `app/components/ui/Spinner.tsx`
- Create: `app/components/ui/Card.tsx`
- Create: `app/components/ui/Input.tsx`
- Create: `app/components/ui/Select.tsx`
- Create: `app/components/ui/SearchInput.tsx`
- Create: `app/components/ui/Toast.tsx`
- Create: `app/components/ui/index.ts` — barrel export

These are pure Tailwind components with dark mode variants. No external dependencies.

**Step 1:** Create all UI component files with proper dark: variants.

**Step 2:** Create barrel `index.ts` exporting all.

**Step 3:** Run `npm run build`.

**Step 4:** Commit: `feat: add shared UI component library`

### Task 4: Set up Inter font + theme system

**Files:**
- Modify: `app/layout.tsx` — add Inter font, ThemeProvider, dark class
- Modify: `app/globals.css` — rewrite with proper dark mode CSS variables
- Create: `app/context/ThemeContext.tsx` — dark/light/system toggle + localStorage

**Step 1:** Add Inter font via `next/font/google` in layout.tsx. Remove broken Geist references.

**Step 2:** Create `ThemeContext.tsx` with `useTheme()` hook — stores preference in localStorage, detects system preference, applies `.dark` class to `<html>`.

**Step 3:** Rewrite `globals.css` with comprehensive light/dark CSS variables.

**Step 4:** Update `layout.tsx` to wrap with `ThemeProvider`.

**Step 5:** Run `npm run build`.

**Step 6:** Commit: `feat: add Inter font + dark mode theme system`

---

## Phase 2: Layout Overhaul

### Task 5: Create Sidebar component

**Files:**
- Create: `app/components/Sidebar.tsx`
- Create: `app/components/ui/ThemeToggle.tsx`

The sidebar has:
- App logo/title at top
- Category navigation links with inline SVG icons and script counts
- Connection status indicator
- Settings link at bottom
- Theme toggle
- Collapsible (icon-only mode on narrow screens)

**Step 1:** Create `Sidebar.tsx` with category nav, connection status, settings link.

**Step 2:** Create `ThemeToggle.tsx` — sun/moon/monitor icons for light/dark/system.

**Step 3:** Run `npm run build`.

**Step 4:** Commit: `feat: add Sidebar with category nav and theme toggle`

### Task 6: Create AppShell layout + refactor pages

**Files:**
- Create: `app/components/AppShell.tsx` — sidebar + main content wrapper
- Modify: `app/page.tsx` — use AppShell
- Modify: `app/settings/page.tsx` — use AppShell
- Modify: `app/components/ScriptRunner.tsx` — accept `activeCategory` prop, remove header/settings link

**Step 1:** Create `AppShell.tsx` that renders Sidebar + `<main>` area. Manages sidebar collapsed state. Passes active category.

**Step 2:** Refactor `page.tsx` to use `AppShell` with category routing via URL search params.

**Step 3:** Refactor `ScriptRunner.tsx` to filter scripts by active category and remove its internal header (now in AppShell).

**Step 4:** Refactor `settings/page.tsx` to use AppShell.

**Step 5:** Add search/filter functionality — `SearchInput` in the main content header, filters scripts by name/description.

**Step 6:** Run `npm run build`.

**Step 7:** Commit: `feat: sidebar layout with category filtering and search`

### Task 7: Create script handler registry

**Files:**
- Create: `lib/scriptRegistry.ts`
- Modify: `app/components/ScriptRunner.tsx` — replace switch/case with registry lookup

**Step 1:** Create `scriptRegistry.ts` with a `Record<ScriptId, HandlerFn>` map and `getHandler(id)` function.

**Step 2:** Refactor `ScriptRunner.handleRunSingle` to use `const handler = getHandler(scriptId)` instead of the switch/case.

**Step 3:** Move dynamic options loading into a `useEffect`.

**Step 4:** Run `npm run build`.

**Step 5:** Commit: `refactor: replace switch/case with script handler registry`

---

## Phase 3: New Okta API Features

### Task 8: Add Network Zones + Trusted Origins scripts

**Files:**
- Modify: `app/actions/oktaActions.ts` — add 4 new handler functions
- Modify: `lib/data/automationScripts.ts` — add 4 new script entries + IDs
- Modify: `lib/scriptRegistry.ts` — register new handlers

**New scripts:**
- `create-network-zone`: POST /api/v1/zones — inputs: name, gateways (comma-separated CIDRs)
- `list-network-zones`: GET /api/v1/zones — read-only listing
- `create-trusted-origin`: POST /api/v1/trustedOrigins — inputs: name, origin URL, scopes (CORS/redirect)
- `list-trusted-origins`: GET /api/v1/trustedOrigins — read-only listing

**Step 1:** Add handler functions to `oktaActions.ts`.

**Step 2:** Add script metadata + IDs to `automationScripts.ts`.

**Step 3:** Register in `scriptRegistry.ts`.

**Step 4:** Run `npm run build`.

**Step 5:** Commit: `feat: add Network Zones + Trusted Origins scripts`

### Task 9: Add Auth Server + Custom Claims scripts

**Files:**
- Modify: `app/actions/oktaActions.ts` — add 3 new handler functions
- Modify: `lib/data/automationScripts.ts` — add 3 new script entries
- Modify: `lib/scriptRegistry.ts` — register new handlers
- Modify: `app/api/okta/apps/route.ts` — add auth server listing endpoint (or new route)

**New scripts:**
- `create-auth-server`: POST /api/v1/authorizationServers — inputs: name, audiences, description
- `add-custom-claim`: POST /api/v1/authorizationServers/{id}/claims — inputs: auth server (dynamic select), claim name, value, type
- `add-custom-scope`: POST /api/v1/authorizationServers/{id}/scopes — inputs: auth server (dynamic select), scope name, description

**Step 1:** Add an API route for listing authorization servers (for dynamic select).

**Step 2:** Add handler functions to `oktaActions.ts`.

**Step 3:** Add script metadata to `automationScripts.ts`.

**Step 4:** Register in `scriptRegistry.ts`.

**Step 5:** Run `npm run build`.

**Step 6:** Commit: `feat: add Auth Server + Custom Claims/Scopes scripts`

### Task 10: Add Org Health Dashboard

**Files:**
- Modify: `app/actions/oktaActions.ts` — add `getOrgHealth` action
- Create: `app/components/OrgHealthWidget.tsx` — sidebar mini-stats
- Create: `app/components/OrgHealthDashboard.tsx` — full overview page
- Modify: `app/components/Sidebar.tsx` — embed OrgHealthWidget
- Modify: `app/components/AppShell.tsx` — add "Overview" as a view option

**API calls in `getOrgHealth`:**
- `GET /api/v1/users?limit=1` + read `x-total-count` header
- `GET /api/v1/apps?limit=1` + read `x-total-count` header
- `GET /api/v1/groups?limit=1` + read `x-total-count` header
- `GET /api/v1/authenticators` — list active authenticators

Note: `oktaFetch` needs a variant that returns response headers. Add `oktaFetchWithHeaders` to helpers.

**Step 1:** Add `oktaFetchWithHeaders` to `okta-api.ts` that returns `{ data, headers }`.

**Step 2:** Add `getOrgHealth` server action.

**Step 3:** Create `OrgHealthWidget.tsx` — compact stats for sidebar.

**Step 4:** Create `OrgHealthDashboard.tsx` — full stats page with authenticator list.

**Step 5:** Wire into Sidebar and AppShell.

**Step 6:** Run `npm run build`.

**Step 7:** Commit: `feat: add Org Health Dashboard with live stats`

### Task 11: Add System Log Viewer

**Files:**
- Modify: `app/actions/oktaActions.ts` — add `getSystemLogs` action
- Create: `app/components/SystemLogViewer.tsx` — full log viewer page
- Modify: `app/components/AppShell.tsx` — add "System Log" as a view in Tools
- Modify: `lib/data/automationScripts.ts` — add system-log entry

**Features:**
- `GET /api/v1/logs?since={ISO}&filter={filter}&limit=100`
- Auto-poll toggle (5-second interval)
- Event type filter dropdown
- Keyword search
- Expandable log entries with full JSON
- Copy JSON to clipboard

**Step 1:** Add `getSystemLogs` server action with since/filter/limit params.

**Step 2:** Create `SystemLogViewer.tsx` with polling, filtering, expandable entries.

**Step 3:** Wire into AppShell as the Tools > System Log view.

**Step 4:** Run `npm run build`.

**Step 5:** Commit: `feat: add System Log Viewer with live polling`

---

## Phase 4: Polish

### Task 12: Add toast notifications + result history

**Files:**
- Create: `app/context/ToastContext.tsx`
- Modify: `app/layout.tsx` — wrap with ToastProvider
- Modify: `app/components/ScriptRunner.tsx` — use toasts for success/error, add result history

**Step 1:** Create `ToastContext.tsx` — portal-based toasts with auto-dismiss.

**Step 2:** Wire into layout.

**Step 3:** Update ScriptRunner to show toasts on script completion and maintain a collapsible result history per card.

**Step 4:** Run `npm run build`.

**Step 5:** Commit: `feat: add toast notifications and result history`

### Task 13: Responsive design + final polish

**Files:**
- Modify: `app/components/Sidebar.tsx` — hamburger menu on mobile
- Modify: `app/components/AppShell.tsx` — responsive breakpoints
- Modify: `app/globals.css` — any final tweaks
- Modify: all components — verify dark mode variants

**Step 1:** Add mobile hamburger menu to sidebar.

**Step 2:** Test and fix all dark mode variants across components.

**Step 3:** Run `npm run build`.

**Step 4:** Commit: `feat: responsive sidebar + dark mode polish`

### Task 14: Update CLAUDE.md + final build verification

**Files:**
- Modify: `CLAUDE.md` — update architecture docs for new structure

**Step 1:** Update CLAUDE.md to reflect new file structure, new scripts, sidebar layout, theme system, registry pattern.

**Step 2:** Run `npm run build` — must pass cleanly.

**Step 3:** Run `npm run lint` — fix any lint errors.

**Step 4:** Commit: `docs: update CLAUDE.md for v2 architecture`
