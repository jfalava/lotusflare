# TanStack Start Migration Guide for mtgc-web

## Overview

This guide provides step-by-step instructions for migrating the mtgc-web (Lotusflare) project from Next.js 15 + OpenNext.js Cloudflare to TanStack Start.

## Current Stack

- **Framework:** Next.js 15.5.2 (App Router)
- **Deployment:** OpenNext.js Cloudflare (@opennextjs/cloudflare v1.11.1)
- **Runtime:** Cloudflare Workers
- **UI:** React 19.2.0 + Radix UI + Tailwind CSS v4
- **Data Fetching:** Server Components (SSR) + SWR (client)
- **State:** Zustand + React Context
- **Forms:** react-hook-form + Zod
- **Routing:** Next.js file-based App Router

## Target Stack

- **Framework:** TanStack Start
- **Deployment:** Cloudflare Workers (via Vinxi)
- **Runtime:** Cloudflare Workers
- **UI:** React 19.2.0 + Radix UI + Tailwind CSS v4
- **Data Fetching:** TanStack Router loaders + TanStack Query
- **State:** Zustand + React Context (keep existing)
- **Forms:** react-hook-form + Zod (keep existing)
- **Routing:** TanStack Router file-based routing

## Migration Phases

### Phase 1: Project Setup & Configuration

1. **Initialize TanStack Start**
   - Create new TanStack Start project in parallel directory
   - Configure for Cloudflare Workers deployment
   - Set up Vinxi configuration

2. **Configure Build Tools**
   - Migrate Tailwind CSS v4 configuration
   - Set up TypeScript with same tsconfig.json settings
   - Configure Vite/Vinxi for proper bundling
   - Set up path aliases (@, #)

3. **Environment & Bindings**
   - Configure Cloudflare bindings in wrangler.toml
   - Set up environment variables
   - Configure cloudflare-env.d.ts for TypeScript

### Phase 2: Core Infrastructure

1. **Routing Setup**
   - Convert Next.js App Router structure to TanStack Router
   - Set up file-based routing in `app/routes/`
   - Create route tree configuration
   - Implement route guards/middleware if needed

2. **Data Fetching Layer**
   - Replace Next.js Server Components with TanStack Router loaders
   - Set up TanStack Query for client-side caching
   - Configure dehydration/hydration for SSR
   - Migrate API utility functions

3. **Layout & Root Setup**
   - Convert app/layout.tsx to root route
   - Set up context providers in proper order
   - Configure HTML head management (replace Next.js Metadata)

### Phase 3: Component Migration

1. **Replace Next.js Specific Components**
   - `next/image` → TanStack Start image component or native `<img>`
   - `next/link` → TanStack Router `<Link>`
   - `next/navigation` hooks → TanStack Router hooks
   - Remove `"use client"` directives (TanStack Start uses different hydration)

2. **Migrate Pages**
   - Convert each page.tsx to route component
   - Move data fetching from Server Components to loaders
   - Update imports and component usage
   - Test each route individually

3. **Update Client Components**
   - Most client components can stay unchanged
   - Update routing/navigation hooks
   - Update data fetching from SWR to TanStack Query where beneficial

### Phase 4: Features & Functionality

1. **Authentication & Session**
   - Implement session management
   - Configure cookie handling
   - Set up protected routes

2. **Forms & Mutations**
   - Keep react-hook-form + Zod
   - Add TanStack Query mutations for API calls
   - Update form submission handlers

3. **Special Features**
   - Cookie consent banner
   - Theme system (next-themes → custom or @tanstack/start-compatible)
   - Loading states and suspense boundaries
   - Error boundaries

### Phase 5: Deployment & Optimization

1. **Cloudflare Configuration**
   - Configure wrangler.toml for deployment
   - Set up build scripts
   - Test local deployment with wrangler dev

2. **Performance Optimization**
   - Configure code splitting
   - Optimize bundle size
   - Set up caching strategies
   - Configure CDN settings

3. **Testing & Validation**
   - Test all routes and functionality
   - Verify SSR/hydration working correctly
   - Check Cloudflare bindings integration
   - Performance testing

## Key Files to Migrate

### Configuration Files

- `next.config.ts` → `app.config.ts` (TanStack Start config)
- `open-next.config.ts` → Remove (not needed)
- `package.json` → Update dependencies
- `tsconfig.json` → Update for TanStack Start
- `wrangler.toml` → Update for direct Workers deployment

### Code Files

- `app/layout.tsx` → `app/routes/__root.tsx`
- `app/page.tsx` → `app/routes/index.tsx`
- `app/**/page.tsx` → `app/routes/**/route.tsx`
- `app/**/loading.tsx` → Handle with TanStack Router pending states
- `app/**/not-found.tsx` → Handle with TanStack Router error boundaries

## Critical Considerations

### Breaking Changes

1. **No Server Components**: TanStack Start doesn't use React Server Components
   - Move server logic to loaders
   - Client components work similarly but without "use client" directive

2. **Routing Differences**
   - Dynamic routes: `[id]` → `$id`
   - Catch-all: `[...slug]` → `$.tsx`
   - Route groups work differently

3. **Image Optimization**
   - No built-in Image component like Next.js
   - Use Cloudflare Images or native optimization

4. **Metadata**
   - Replace Next.js Metadata API with TanStack Start's head management
   - Use route-level meta exports

### Data Fetching Patterns

```typescript
// Next.js Server Component
export default async function Page() {
  const data = await fetch('/api/data')
  return <div>{data}</div>
}

// TanStack Start
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/page')({
  loader: async () => {
    const data = await fetch('/api/data')
    return { data }
  },
  component: Page
})

function Page() {
  const { data } = Route.useLoaderData()
  return <div>{data}</div>
}
```

### Context Providers Order

Maintain the same provider hierarchy:

```typescript
ThemeProvider
  └─ BreadcrumbProvider
      └─ SettingsProvider
          └─ ViewModeProvider
              └─ NuqsAdapter (may need replacement)
```

## Dependencies to Replace

### Remove

- `next` → `@tanstack/start`
- `@opennextjs/cloudflare` → Remove
- `@next/eslint-plugin-next` → Remove
- `eslint-config-next` → Remove
- `next-themes` → Custom theme solution or compatible library
- `nextjs-toploader` → Custom or TanStack Router alternative
- `nuqs` → TanStack Router search params

### Add

- `@tanstack/start`
- `@tanstack/react-router`
- `@tanstack/router-devtools`
- `@tanstack/router-vite-plugin`
- `vinxi`
- `vite`
- Additional TanStack ecosystem packages as needed

## Testing Strategy

1. Set up parallel development (keep Next.js running)
2. Migrate route by route, testing each
3. Use feature flags if deploying incrementally
4. Compare rendered output between implementations
5. Test SSR hydration carefully
6. Validate all Cloudflare bindings work

## Rollback Plan

- Keep Next.js implementation until TanStack Start is fully validated
- Use git branches for migration work
- Maintain separate deployment for testing
- Have wrangler.toml configs for both versions

## Resources

- [TanStack Start Docs](https://tanstack.com/start)
- [TanStack Router Docs](https://tanstack.com/router)
- [TanStack Query Docs](https://tanstack.com/query)
- [Vinxi Docs](https://vinxi.vercel.app/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)

## Migration Checklist

- [ ] Set up new TanStack Start project
- [ ] Configure Cloudflare Workers deployment
- [ ] Migrate build configuration (Tailwind, TypeScript, etc.)
- [ ] Set up routing structure
- [ ] Convert root layout and providers
- [ ] Migrate home page
- [ ] Migrate inventory pages (browse + edit)
- [ ] Migrate deck pages (browse + edit + view)
- [ ] Migrate about/privacy pages
- [ ] Replace Next.js Image components
- [ ] Replace Next.js Link components
- [ ] Update all navigation hooks
- [ ] Set up TanStack Query
- [ ] Migrate data fetching to loaders
- [ ] Update client-side data fetching (SWR → TanStack Query)
- [ ] Configure metadata/SEO
- [ ] Test cookie consent functionality
- [ ] Test theme switching
- [ ] Verify all forms work
- [ ] Test all dynamic routes
- [ ] Verify error handling
- [ ] Test loading states
- [ ] Deploy to staging
- [ ] Performance testing
- [ ] Production deployment

## Notes

- Maintain same UI/UX - this is a framework migration, not a redesign
- Keep all existing business logic intact
- Preserve Radix UI components and Tailwind styles
- Test thoroughly before removing Next.js version
- Document any issues or gotchas encountered
