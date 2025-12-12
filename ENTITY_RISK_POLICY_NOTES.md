# Entity Risk Policy API Limitations

## Summary

Based on the [Okta Management API documentation](https://developer.okta.com/docs/api/openapi/okta-management/management/tag/Policy/), **Entity Risk Policy (ENTITY_RISK) cannot be created or modified via API**.

## Key Facts

1. **Policy Creation Not Supported**
   - The API documentation explicitly states: "Creating or replacing a policy with the ENTITY_RISK type is not supported"
   - Entity Risk Policy is a system-managed policy that exists by default in orgs with Okta Identity Engine

2. **Rules Are Immutable**
   - Entity Risk Policy rules are system-generated and cannot be created, updated, or deleted via API
   - These rules are managed through the Okta Admin Console only

3. **What the API Can Do**
   - ✅ GET `/api/v1/policies?type=ENTITY_RISK` - List Entity Risk policies
   - ✅ GET `/api/v1/policies/{policyId}` - Retrieve a specific policy
   - ✅ GET `/api/v1/policies/{policyId}/rules` - List policy rules (read-only)
   - ❌ POST `/api/v1/policies` - Cannot create Entity Risk policies
   - ❌ POST `/api/v1/policies/{policyId}/rules` - Cannot create rules
   - ❌ PUT `/api/v1/policies/{policyId}/rules/{ruleId}` - Cannot update rules
   - ❌ DELETE `/api/v1/policies/{policyId}/rules/{ruleId}` - Cannot delete rules

## How to Configure Entity Risk Policy

To configure Entity Risk Policy detection rules, you must use the Okta Admin Console:

1. Navigate to **Security > Entity Risk**
2. Configure detection settings for:
   - New Device
   - New City
   - New State
   - New Country
   - Velocity
   - Anomalous Location
   - Anomalous Device
   - Anomalous IP
3. Set actions for each detection type:
   - No further action
   - Require MFA
   - Block sign-in
   - Challenge with step-up authentication

## Updated Script Behavior

The "Review Entity Risk Policy" script now:
- ✅ Retrieves and displays the Entity Risk Policy
- ✅ Lists all existing rules with their configurations
- ✅ Logs rule details to the console for review
- ❌ No longer attempts to create or modify rules
- ℹ️ Provides guidance to use Admin Console for configuration

## References

- [Okta Policy API Documentation](https://developer.okta.com/docs/api/openapi/okta-management/management/tag/Policy/)
- [Entity Risk Policies Concept Guide](https://developer.okta.com/docs/concepts/policies/#identity-threat-protection-policies)
- [Okta Identity Engine Requirements](https://help.okta.com/oie/en-us/content/topics/identity-engine/oie-get-started.htm)

## Date

December 12, 2025
