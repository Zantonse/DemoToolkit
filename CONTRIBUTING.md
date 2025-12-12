# Contributing to Okta SE Toolkit

Thank you for your interest in improving the Okta SE Toolkit!

## Overview

This is an internal tool for Okta Sales Engineers. Contributions should focus on:
- Adding new automation scripts
- Improving existing scripts
- Enhancing UI/UX
- Fixing bugs
- Improving documentation

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd okta-se-toolkit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
okta-se-toolkit/
├── app/
│   ├── actions/          # Server Actions (Okta API logic)
│   ├── api/             # API Routes
│   ├── components/      # React components
│   ├── context/         # React Context providers
│   └── settings/        # Settings page
├── lib/
│   ├── data/            # Static data (script metadata)
│   └── types/           # TypeScript type definitions
└── public/              # Static assets
```

## Adding a New Automation Script

### 1. Add Script Metadata

Edit `lib/data/automationScripts.ts`:

```typescript
{
  id: "your-script-id",
  name: "Your Script Name",
  description: "Brief description of what the script does."
}
```

### 2. Create Handler Function

Add a new function in `app/actions/oktaActions.ts`:

```typescript
/**
 * Your script description
 */
export async function yourScriptHandler(
  config: OktaConfig
): Promise<OktaActionResult> {
  'use server';
  
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const headers = oktaHeaders(config);

  try {
    // Your Okta API logic here
    const response = await fetch(`${baseUrl}/api/v1/...`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const body = await safeJson(response);
      return {
        success: false,
        message: body?.errorSummary || 'Operation failed',
      };
    }

    return {
      success: true,
      message: 'Operation completed successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message ?? 'Unexpected error',
    };
  }
}
```

### 3. Add to ScriptRunner

Update `app/components/ScriptRunner.tsx`:

1. Add your script ID to the `ScriptId` type:
   ```typescript
   type ScriptId =
     | 'enable-fido2'
     | 'create-super-admins-group'
     // ... existing IDs
     | 'your-script-id';  // Add yours here
   ```

2. Import your handler function at the top of the file

3. Add a case in the `handleRunSingle` function:
   ```typescript
   case 'your-script-id':
     result = await yourScriptHandler(config);
     break;
   ```

4. (Optional) Add to `runAllScripts` function in `oktaActions.ts` if it should be included in "Run All"

### 4. Test Your Script

1. Configure your Okta credentials in Settings
2. Run your script individually
3. Verify success/error handling
4. Test with "Run All Scripts" if applicable

## Code Style Guidelines

### TypeScript
- Use strict TypeScript types (no `any` unless necessary)
- Add JSDoc comments to exported functions
- Use async/await instead of promises

### React Components
- Use functional components with hooks
- Implement proper error boundaries
- Keep components focused and single-purpose

### Error Handling
- Always catch and handle errors gracefully
- Return meaningful error messages to users
- Log errors to console for debugging

### Naming Conventions
- Components: PascalCase (`ScriptRunner`)
- Functions: camelCase (`handleRunSingle`)
- Constants: UPPER_SNAKE_CASE (`ORG_URL_KEY`)
- Files: kebab-case for routes, PascalCase for components

## Testing

Before submitting changes:

1. **Test locally**
   - Run all scripts individually
   - Test "Run All Scripts" functionality
   - Verify error handling with invalid credentials

2. **Check for errors**
   ```bash
   npm run lint
   ```

3. **Build successfully**
   ```bash
   npm run build
   ```

## Okta API Best Practices

### Rate Limiting
- Be aware of Okta API rate limits
- Implement retry logic for transient errors
- Use batch endpoints where available

### Error Handling
- Check for specific HTTP status codes
- Parse `errorSummary` from Okta responses
- Handle "already exists" scenarios gracefully

### Security
- Never log API tokens
- Validate input before making API calls
- Use HTTPS for all Okta API calls

## Documentation

When adding features, update:
- `README.md` - User-facing documentation
- `plan.md` - Technical overview and architecture
- Inline code comments - Implementation details
- JSDoc comments - Function documentation

## Getting Help

For questions or assistance:
- Contact the Okta Sales Engineering team
- Review existing scripts for examples
- Check [Okta Management API docs](https://developer.okta.com/docs/reference/api/users/)

## License

This is an internal Okta tool. See LICENSE file for details.
