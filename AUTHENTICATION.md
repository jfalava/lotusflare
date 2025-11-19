# Authentication Setup

This document describes how to set up bearer token authentication for the Lotusflare application.

## Overview

The application uses bearer token authentication to secure API endpoints. The web application sends a bearer token in the `Authorization` header with each request to the backend API.

## Architecture

- **Backend**: Hono-based Cloudflare Worker that validates bearer tokens via middleware
- **Web**: Next.js application that includes bearer tokens in all API requests
- **Secrets Storage**: Cloudflare Workers secrets for production, `.dev.vars` for local development

## Setup Instructions

### 1. Generate a Secure Token

Generate a secure random token for authentication. You can use one of these methods:

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. Local Development Setup

#### Backend

1. Create a `.dev.vars` file in the `backend/` directory:
   ```bash
   cd backend
   cp .dev.vars.example .dev.vars
   ```

2. Edit `.dev.vars` and add your token:
   ```
   LOTUSFLARE_AUTH=your-generated-token-here
   ```

#### Web

1. Create a `.dev.vars` file in the `web/` directory:
   ```bash
   cd web
   cp .dev.vars.example .dev.vars
   ```

2. Edit `.dev.vars` and add the **same token** used in the backend:
   ```
   LOTUSFLARE_AUTH=your-generated-token-here
   PROD_APP_URL=http://localhost:3000
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

**Important**: The token must be identical in both backend and web `.dev.vars` files.

### 3. Production Setup

#### Backend

Set the secret using Wrangler CLI:

```bash
cd backend

# For development environment (default)
wrangler secret put LOTUSFLARE_AUTH

# For production environment
wrangler secret put LOTUSFLARE_AUTH --env production
```

When prompted, paste your secure token.

#### Web

Set the environment variable using Wrangler CLI:

```bash
cd web

# For development environment (default)
wrangler secret put LOTUSFLARE_AUTH

# For production environment
wrangler secret put LOTUSFLARE_AUTH --env production
```

**Important**: Use the **same token** for both backend and web deployments.

### 4. Verify Setup

#### Backend

Start the backend in development mode:

```bash
cd backend
bun run dev
```

Test the authentication:

```bash
# This should return 401 Unauthorized
curl http://localhost:8787/api/dashboard

# This should succeed (replace YOUR_TOKEN with your actual token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8787/api/dashboard
```

#### Web

Start the web application:

```bash
cd web
bun run dev
```

Check the browser console for any authentication errors when the app makes API requests.

## Public Endpoints

The following endpoints do **not** require authentication:

- `/api/health` - Health check endpoint

All other `/api/*` endpoints require a valid bearer token.

## Troubleshooting

### "Unauthorized" errors in development

1. Verify `.dev.vars` file exists in both `backend/` and `web/` directories
2. Ensure the `LOTUSFLARE_AUTH` token is identical in both files
3. Restart both the backend and web development servers after changing `.dev.vars`

### "Unauthorized" errors in production

1. Verify secrets are set using `wrangler secret list`:
   ```bash
   # Backend
   cd backend
   wrangler secret list
   wrangler secret list --env production

   # Web
   cd web
   wrangler secret list
   wrangler secret list --env production
   ```

2. Ensure the token matches in both backend and web deployments
3. Redeploy after setting secrets

### Missing LOTUSFLARE_AUTH warning in web logs

This warning appears when the `LOTUSFLARE_AUTH` environment variable is not set. This will cause all API requests to fail with 401 errors. Follow the setup instructions above to configure the token.

## Security Best Practices

1. **Never commit** `.dev.vars` files to version control (they are gitignored)
2. **Use different tokens** for development and production environments
3. **Rotate tokens regularly** in production
4. **Use strong, random tokens** (at least 32 bytes of entropy)
5. **Limit token exposure** - only share with team members who need it
6. **Monitor for unauthorized access** using Cloudflare Workers analytics

## Related Documentation

- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Hono Authentication Middleware](https://hono.dev/middleware/builtin/bearer-auth)

## Implementation Details

### Backend Middleware

The authentication is implemented in `backend/src/middlewares/auth.ts`. The middleware:

1. Checks if the request path is in the public endpoints list
2. Extracts the `Authorization` header
3. Validates the bearer token format
4. Compares the token against the stored secret
5. Returns 401 if authentication fails

### Web Integration

The web application includes the bearer token automatically in all API requests via `web/lib/server-fetch.ts`. The `getAuthHeaders()` function:

1. Reads the `LOTUSFLARE_AUTH` environment variable
2. Formats it as a bearer token
3. Includes it in the `Authorization` header

All server-side fetch requests use `serverFetch()` or `serverFetchJson()` which automatically include authentication headers.
