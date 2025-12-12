# Quick Start Guide - Okta SE Toolkit

Get up and running with the Okta SE Toolkit in 5 minutes.

## Prerequisites

✅ Node.js 20.x or higher installed  
✅ An Okta organization (dev, preview, or production)  
✅ An Okta API token with admin permissions

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Start Development Server

```bash
npm run dev
```

The application will start at **http://localhost:3000**

## Step 3: Configure Okta Credentials

1. Click **Settings** in the top-right corner
2. Enter your **Okta Org URL**:
   ```
   https://your-org.okta.com
   ```
3. Enter your **API Token**:
   - Generate in Okta Admin Console → Security → API → Tokens
   - Needs `Super Administrator` role or equivalent permissions
4. Click **Test Connection** to verify
5. Click **Save Settings**

## Step 4: Run Your First Script

1. Return to the home page
2. Find the **"Enable FIDO2 Authenticator"** card
3. Click the **Run** button
4. Watch for the success ✓ or error ✗ badge

## Step 5: Run All Scripts (Optional)

Click **Run All Scripts** to execute all automations in sequence:
- Enable FIDO2
- Create Super Administrators Group (auto-assigns SUPER_ADMIN role)
- Update Admin Console Policy
- Populate 50 Demo Users
- Add Salesforce SAML App
- Add Box App

## Common Issues

### ❌ Connection Test Fails

**Problem**: "Failed to connect to Okta"

**Solutions**:
- Verify org URL is correct and starts with `https://`
- Check API token is valid and not expired
- Ensure token has required permissions
- Confirm network connectivity to Okta

### ❌ Script Fails with 403 Forbidden

**Problem**: "Insufficient permissions"

**Solutions**:
- Generate a new token with `Super Administrator` role
- Verify all required API scopes are granted
- Check org settings allow the operation

### ❌ Demo Users Script Reports Errors

**Problem**: "User already exists"

**Solutions**:
- This is normal! Script skips existing users
- If you need fresh users, delete them in Okta first
- Or modify the email pattern in `app/actions/oktaActions.ts`

## Next Steps

- 📖 Read the full [README.md](README.md) for detailed documentation
- 🏗️ Review [plan.md](plan.md) for architecture details
- 🤝 See [CONTRIBUTING.md](CONTRIBUTING.md) to add new scripts
- 📚 Check [Okta API Docs](https://developer.okta.com/docs/reference/api/users/)

## Need Help?

Contact the Okta Sales Engineering team for assistance.

---

**Happy Automating! 🚀**
