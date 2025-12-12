# Policy Simulation Feature - December 12, 2025

## Changes Made

### ✅ Removed Script
- **"Update Admin Console Policy"** has been removed from the toolkit
  - Removed from `lib/data/automationScripts.ts`
  - Removed from `app/components/ScriptRunner.tsx` imports and switch case
  - Removed from `app/actions/oktaActions.ts` runAllScripts function
  - The function `updateAdminConsolePolicy()` still exists in the codebase but is no longer called

### ✨ Enhanced Policy Simulation Script

#### Application Dropdown
- **Before**: Text input field
- **After**: Dynamic dropdown populated with actual applications from your Okta org
  - Automatically fetches applications via `/api/v1/apps?limit=200`
  - Displays app name and sign-on mode: `"App Name (SAML_2_0)"`
  - Shows "Loading..." while fetching applications
  - Type: `select` with `dynamicOptions: true`

#### Policy Types Dropdown
- **Before**: Multi-select dropdown with 4 options
- **After**: Enhanced multi-select dropdown with clearer labels
  - `ACCESS_POLICY` → "App Sign-On Policy (ACCESS_POLICY)"
  - `MFA_ENROLL` → "Authenticator Enrollment Policy (MFA_ENROLL)"
  - `OKTA_SIGN_ON` → "Global Session Policy (OKTA_SIGN_ON)"
  - `PROFILE_ENROLLMENT` → "Profile Enrollment Policy (PROFILE_ENROLLMENT)"
  - Optional field - leave empty to simulate all policy types
  - Multi-select enabled (hold Ctrl/Cmd to select multiple)

## Technical Details

### Type System Updates
- Updated `lib/types/automation.ts` to support:
  - `select` field type
  - `dynamicOptions` boolean flag for runtime loading
  - `multiple` boolean flag for multi-select
  - `options` array with `{ value, label }` structure
  - `placeholder` for select fields

### Component Updates
- `ScriptRunner.tsx` now includes:
  - `loadDynamicOptions()` function to fetch applications
  - `dynamicOptions` state to cache loaded options
  - `loadingOptions` state to track loading status
  - Enhanced input field rendering with conditional logic for text vs select fields
  - Support for multi-select with proper value handling (`string[]` vs `string`)

### API Integration
- Policy Simulation uses: `POST /api/v1/policies/simulate?expand=EVALUATED,RULE`
- Application fetching uses: `GET /api/v1/apps?limit=200`
- Gracefully handles OIE requirements with proper error messages

## Script Count
- **Total Scripts**: 12 (down from 13)
- **With Input Fields**: 2 scripts
  - Add New Administrator (text/email inputs)
  - Run Policy Simulation (select dropdowns)

## Files Modified
1. `lib/types/automation.ts` - Enhanced input field types
2. `lib/data/automationScripts.ts` - Removed admin console policy, enhanced policy simulation
3. `app/actions/oktaActions.ts` - Updated runAllScripts, kept runPolicySimulation
4. `app/components/ScriptRunner.tsx` - Removed admin console policy handling, added dynamic dropdown support

## Usage Instructions

### Running Policy Simulation
1. Navigate to the main page of the toolkit
2. Find "Run Policy Simulation" in the **Security & Policies** section
3. Click to expand the input fields
4. **Select Application**: Choose from the dropdown of available apps
   - The dropdown will load automatically when you view the script
   - Shows all applications in your Okta org (up to 200)
5. **Policy Types** (Optional): 
   - Hold Ctrl (Windows/Linux) or Cmd (Mac) to select multiple types
   - Leave empty to simulate all policy types
6. Click **Run** to execute the simulation
7. View results showing:
   - Which policies and rules matched
   - Priority order of evaluation
   - Actions that would be taken

### Example Output
```
Policy simulation completed successfully.

**ACCESS_POLICY**
  - Policy: Default Policy (Priority: 1)
  - Rule: Allow All Users (Priority: 1)
  - Actions: {"signon":{"access":"ALLOW"}}

**MFA_ENROLL**
  - Policy: MFA Policy (Priority: 1)
  - Rule: Default Rule (Priority: 99)
  - Actions: {"enroll":{"self":"OPTIONAL"}}
```

## Requirements
- Okta Identity Engine (OIE) required for Policy Simulation API
- Valid Okta org URL and API token configured in Settings
- API token must have `okta.policies.read` and `okta.apps.read` scopes

## Known Limitations
- Application list limited to 200 apps (API default)
- Policy simulation not available in Classic Engine orgs
- Some policy types may not be supported in all Okta editions

## Future Enhancements (Not Implemented)
- Add policy context options (risk level, groups, zones, device)
- Export simulation results to JSON/CSV
- Compare simulations across multiple apps
- Visual policy evaluation flow diagram
- Save/bookmark favorite simulation configurations
