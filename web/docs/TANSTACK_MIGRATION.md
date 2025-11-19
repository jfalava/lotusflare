# Comprehensive Guide: Migrating mtgc-web from Next.js to TanStack Start

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Why TanStack Start?](#why-tanstack-start)
3. [Architecture Comparison](#architecture-comparison)
4. [Detailed Migration Steps](#detailed-migration-steps)
5. [Code Migration Examples](#code-migration-examples)
6. [API & Data Fetching Patterns](#api--data-fetching-patterns)
7. [Cloudflare Integration](#cloudflare-integration)
8. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
9. [Performance Considerations](#performance-considerations)
10. [Testing Strategy](#testing-strategy)

---

## Executive Summary

This document provides a comprehensive guide for migrating the **mtgc-web (Lotusflare)** application from Next.js 15 with OpenNext.js Cloudflare adapter to TanStack Start with native Cloudflare Workers support.

### Current State

- **Framework:** Next.js 15.5.2 (App Router)
- **Deployment:** OpenNext.js Cloudflare
- **Routes:** 12+ pages including dynamic routes
- **Features:** SSR, image optimization, API proxying, complex forms, state management

### Target State

- **Framework:** TanStack Start
- **Deployment:** Direct Cloudflare Workers via Vinxi
- **Routes:** Same functionality with TanStack Router
- **Features:** Full SSR, type-safe routing, better DX, native CF Workers integration

### Migration Timeline Estimate

- **Setup & Configuration:** 1-2 days
- **Core Infrastructure:** 2-3 days
- **Component Migration:** 5-7 days
- **Testing & Refinement:** 3-5 days
- **Total:** 11-17 days for a complete migration

---

## Why TanStack Start?

### Advantages over Next.js + OpenNext.js

1. **Native Cloudflare Workers Support**
   - No adapter layer needed
   - Better performance and cold start times
   - Direct access to Cloudflare bindings

2. **Type-Safe Routing**
   - Full TypeScript inference across routes
   - Type-safe loaders and parameters
   - Better IDE support

3. **Simpler Mental Model**
   - No server/client components distinction
   - Unified data loading with loaders
   - Clear separation of concerns

4. **Ecosystem Integration**
   - TanStack Query for data fetching
   - TanStack Router for routing
   - TanStack Table, Form, etc. (if needed)

5. **Performance**
   - Smaller bundle sizes
   - Better tree-shaking
   - Optimized for edge deployment

### Trade-offs

1. **Maturity**: Next.js is more mature with larger community
2. **Features**: Some Next.js features not available (Image optimization, ISR)
3. **Documentation**: Smaller knowledge base
4. **Learning Curve**: New paradigms to learn

---

## Architecture Comparison

### Next.js App Router Architecture

```
next.config.ts              → Configuration
open-next.config.ts         → Cloudflare adapter config
app/
  layout.tsx                → Root layout (Server Component)
  page.tsx                  → Home page (Server Component)
  decks/
    page.tsx                → Decks list (Server Component)
    [id]/
      page.tsx              → Deck detail (Server Component)
      loading.tsx           → Loading UI
      not-found.tsx         → 404 UI
components/
  home/
    home-client.tsx         → Client component
lib/
  utils.ts                  → Utilities
```

### TanStack Start Architecture

```
app.config.ts               → TanStack Start config
wrangler.toml               → Cloudflare config
app/
  routes/
    __root.tsx              → Root route (providers, layout)
    index.tsx               → Home page route
    decks/
      index.tsx             → Decks list route
      $id.tsx               → Deck detail route
  client.tsx                → Client entry
  ssr.tsx                   → Server entry
components/
  home/
    home-client.tsx         → Component (no "use client" needed)
lib/
  utils.ts                  → Utilities (unchanged)
```

---

## Detailed Migration Steps

### Step 1: Project Initialization

#### 1.1 Create New TanStack Start Project

```bash
# In a temporary directory
npm create @tanstack/start@latest

# Or use the official starter
git clone https://github.com/TanStack/router tanstack-start-example
cd tanstack-start-example/examples/react/start-basic
```

#### 1.2 Configure for Cloudflare Workers

**Create `app.config.ts`:**

```typescript
import { defineConfig } from "@tanstack/start/config";
import { cloudflare } from "@tanstack/start/adapters/cloudflare";

export default defineConfig({
  adapter: cloudflare({
    runtime: "workers",
  }),
  server: {
    preset: "cloudflare-workers",
  },
});
```

**Create/Update `wrangler.toml`:**

```toml
name = "mtgc-web"
compatibility_date = "2024-01-01"
main = ".output/server/index.mjs"

[build]
command = "pnpm run build"

[build.upload]
format = "modules"
dir = ".output/server"
main = "./index.mjs"

# Add your existing bindings
[[d1_databases]]
binding = "DB"
database_name = "mtg-companion"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "KV"
id = "your-kv-id"
```

#### 1.3 Set Up Package.json

```json
{
  "name": "lotusflare-web",
  "version": "0.3.7b",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vinxi dev",
    "build": "vinxi build",
    "start": "vinxi start",
    "deploy": "pnpm run build && wrangler deploy",
    "preview": "pnpm run build && wrangler dev",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --fix && pnpm run format",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@tanstack/react-router": "^1.90.0",
    "@tanstack/router-devtools": "^1.90.0",
    "@tanstack/start": "^1.90.0",
    "@tanstack/react-query": "^5.62.0",
    "@tanstack/react-query-devtools": "^5.62.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "vinxi": "^0.5.0",

    // Keep existing UI dependencies
    "@radix-ui/react-accordion": "^1.2.12",
    // ... all other Radix UI components

    // Keep existing utilities
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^12.23.24",
    "react-hook-form": "^7.66.0",
    "zod": "^4.1.12",
    "zustand": "^5.0.8",
    "sonner": "^2.0.7"
    // ... etc
  },
  "devDependencies": {
    "@tanstack/router-plugin": "^1.90.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0",
    "typescript": "^5.9.3",
    "wrangler": "^4.46.0",
    "@types/node": "^24.10.0",
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "tailwindcss": "^4.1.17",
    "@tailwindcss/postcss": "^4.1.17"
    // ... etc
  }
}
```

### Step 2: Configure Build Tools

#### 2.1 Vite Configuration

**Create `vite.config.ts`:**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "#": path.resolve(__dirname, "../../"),
    },
  },
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "radix-ui": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            // ... group your Radix UI imports
          ],
        },
      },
    },
  },
});
```

#### 2.2 TypeScript Configuration

**Update `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "#/*": ["../../*"]
    },
    "types": ["vite/client", "@cloudflare/workers-types"]
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", ".output", "dist"]
}
```

#### 2.3 Tailwind CSS Configuration

**Keep existing `tailwind.config.ts`** (Tailwind v4 works with TanStack Start):

```typescript
// Your existing config should work fine
import type { Config } from "tailwindcss";

const config: Config = {
  // ... your existing config
};

export default config;
```

### Step 3: Root Route & Providers

#### 3.1 Create Root Route

**Create `app/routes/__root.tsx`:**

```typescript
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import Main from '@/components/layout/main'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import GlobalReloadSplash from '@/components/layout/global-reload-splash'

import '@/styles/globals.css'
import '@/styles/fonts.css'

import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/context/theme-provider'
import { ViewModeProvider } from '@/components/context/view-mode-context'
import { SettingsProvider } from '@/components/context/settings-context'
import { BreadcrumbProvider } from '@/components/context/breadcrumb-provider'
import { CookieConsentWrapper } from '@/components/layout/cookie-consent-wrapper'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="antialiased font-sans">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <BreadcrumbProvider>
              <SettingsProvider>
                <ViewModeProvider>
                  <GlobalReloadSplash />
                  <div className="flex flex-col min-h-screen">
                    <Header />
                    <Main>
                      <Outlet />
                    </Main>
                    <Footer />
                  </div>
                  <Toaster richColors position="bottom-right" />
                  <CookieConsentWrapper />
                </ViewModeProvider>
              </SettingsProvider>
            </BreadcrumbProvider>
          </ThemeProvider>
          <ReactQueryDevtools />
        </QueryClientProvider>
        <TanStackRouterDevtools position="bottom-right" />
      </body>
    </html>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
```

### Step 4: Route Migration Examples

#### 4.1 Home Page (`app/page.tsx` → `app/routes/index.tsx`)

**Before (Next.js):**

```typescript
// app/page.tsx
import { Metadata } from "next"
import { Suspense } from "react"
import HomeClient from "@/components/home/home-client"
import { HomeSkeleton } from "@/components/home/home-skeleton"

export const dynamic = "force-dynamic"

async function getHomeData() {
  const apiBaseUrl = process.env.NODE_ENV === "development"
    ? "http://localhost:8787"
    : process.env.PROD_APP_URL

  const [analyticsResponse, quickStatsResponse] = await Promise.all([
    fetch(`${apiBaseUrl}/api/dashboard/analytics`, { cache: "no-store" }),
    fetch(`${apiBaseUrl}/api/dashboard/quick-stats`, { cache: "no-store" }),
  ])

  const [analytics, quickStats] = await Promise.all([
    analyticsResponse.json(),
    quickStatsResponse.json(),
  ])

  return { analytics, quickStats }
}

export async function generateMetadata(): Promise<Metadata> {
  const { analytics } = await getHomeData()
  return {
    title: "Dashboard | Lotusflare",
    description: `MTG Collection Dashboard - ${analytics.totalStats.total_cards} total cards`,
  }
}

export default async function HomePage() {
  const data = await getHomeData()
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeClient {...data} />
    </Suspense>
  )
}
```

**After (TanStack Start):**

```typescript
// app/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import HomeClient from '@/components/home/home-client'
import { HomeSkeleton } from '@/components/home/home-skeleton'
import type { DashboardAnalytics, QuickStats } from '@/components/home/shared/home-types'

async function getHomeData() {
  const apiBaseUrl = import.meta.env.DEV
    ? 'http://localhost:8787'
    : import.meta.env.VITE_PROD_APP_URL

  const [analyticsResponse, quickStatsResponse] = await Promise.all([
    fetch(`${apiBaseUrl}/api/dashboard/analytics`),
    fetch(`${apiBaseUrl}/api/dashboard/quick-stats`),
  ])

  const [analytics, quickStats] = await Promise.all([
    analyticsResponse.json() as Promise<DashboardAnalytics>,
    quickStatsResponse.json() as Promise<QuickStats>,
  ])

  return { analytics, quickStats }
}

export const Route = createFileRoute('/')({
  loader: async () => {
    const data = await getHomeData()
    return data
  },
  pendingComponent: HomeSkeleton,
  component: HomePage,
  meta: () => {
    // Note: You can access loader data here for dynamic meta
    return [
      { title: 'Dashboard | Lotusflare' },
      {
        name: 'description',
        content: 'MTG Collection Dashboard - Comprehensive insights into your Magic: The Gathering collection.',
      },
    ]
  },
})

function HomePage() {
  const data = Route.useLoaderData()
  return <HomeClient {...data} />
}
```

#### 4.2 Dynamic Route (`app/decks/[id]/page.tsx` → `app/routes/decks/$id.tsx`)

**Before (Next.js):**

```typescript
// app/decks/[id]/page.tsx
import { notFound } from "next/navigation"

interface PageProps {
  params: { id: string }
}

export default async function DeckDetailPage({ params }: PageProps) {
  const { id } = params

  const response = await fetch(`${process.env.API_URL}/api/decks/${id}`)

  if (!response.ok) {
    notFound()
  }

  const deck = await response.json()

  return <DeckViewer deck={deck} />
}
```

**After (TanStack Start):**

```typescript
// app/routes/decks/$id.tsx
import { createFileRoute, notFound } from '@tanstack/react-router'
import DeckViewer from '@/components/decks/deck-viewer'
import type { DeckWithDetails } from '#/backend/src/types'

export const Route = createFileRoute('/decks/$id')({
  loader: async ({ params }) => {
    const apiBaseUrl = import.meta.env.DEV
      ? 'http://localhost:8787'
      : import.meta.env.VITE_PROD_APP_URL

    const response = await fetch(`${apiBaseUrl}/api/decks/${params.id}`)

    if (!response.ok) {
      throw notFound()
    }

    const deck = await response.json() as DeckWithDetails

    return { deck }
  },
  component: DeckDetailPage,
  errorComponent: ({ error }) => {
    if (error.message === 'notFound') {
      return <div>Deck not found</div>
    }
    return <div>Error loading deck: {error.message}</div>
  },
})

function DeckDetailPage() {
  const { deck } = Route.useLoaderData()
  return <DeckViewer deck={deck} />
}
```

#### 4.3 Route with Search Params

**Before (Next.js with nuqs):**

```typescript
// app/inventory/page.tsx
import { Suspense } from "react"

export default function InventoryPage() {
  return (
    <Suspense>
      <InventoryClient />
    </Suspense>
  )
}

// components/inventory/inventory-browse-client.tsx
"use client"
import { useQueryState } from "nuqs"

export function InventoryClient() {
  const [search, setSearch] = useQueryState('search')
  const [view, setView] = useQueryState('view', { defaultValue: 'grid' })

  // ... component logic
}
```

**After (TanStack Start):**

```typescript
// app/routes/inventory/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const inventorySearchSchema = z.object({
  search: z.string().optional(),
  view: z.enum(['grid', 'list']).default('grid'),
  page: z.number().int().positive().default(1),
})

export const Route = createFileRoute('/inventory/')({
  validateSearch: inventorySearchSchema,
  component: InventoryPage,
})

function InventoryPage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const setSearch = (newSearch: string) => {
    navigate({ search: { ...search, search: newSearch } })
  }

  const setView = (newView: 'grid' | 'list') => {
    navigate({ search: { ...search, view: newView } })
  }

  return <InventoryClient search={search.search} view={search.view} onSearchChange={setSearch} onViewChange={setView} />
}
```

### Step 5: Data Fetching with TanStack Query

For client-side data fetching that was using SWR, migrate to TanStack Query:

**Before (SWR):**

```typescript
"use client"
import useSWR from 'swr'

export function InventoryEditClient() {
  const { data, error, mutate } = useSWR('/api/v2/inventory', fetcher)

  if (error) return <div>Error loading inventory</div>
  if (!data) return <div>Loading...</div>

  return <InventoryList data={data} onUpdate={mutate} />
}
```

**After (TanStack Query):**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function InventoryEditClient() {
  const queryClient = useQueryClient()

  const { data, error, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await fetch('/api/v2/inventory')
      if (!res.ok) throw new Error('Failed to fetch inventory')
      return res.json()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (update) => {
      const res = await fetch('/api/v2/inventory', {
        method: 'PUT',
        body: JSON.stringify(update),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  if (error) return <div>Error loading inventory</div>
  if (isLoading) return <div>Loading...</div>

  return <InventoryList data={data} onUpdate={updateMutation.mutate} />
}
```

### Step 6: Replace Next.js Components

#### 6.1 Image Component

**Before:**

```typescript
import Image from 'next/image'

<Image
  src="https://cards.scryfall.io/normal/front/abc.jpg"
  alt="Card name"
  width={200}
  height={280}
  priority
/>
```

**After (Option 1 - Native img):**

```typescript
<img
  src="https://cards.scryfall.io/normal/front/abc.jpg"
  alt="Card name"
  width={200}
  height={280}
  loading="eager"
  className="object-cover"
/>
```

**After (Option 2 - Cloudflare Images):**

```typescript
// Use Cloudflare Image Resizing
<img
  src="/cdn-cgi/image/width=200,height=280,fit=cover/https://cards.scryfall.io/normal/front/abc.jpg"
  alt="Card name"
  width={200}
  height={280}
/>
```

#### 6.2 Link Component

**Before:**

```typescript
import Link from 'next/link'

<Link href="/decks/123">View Deck</Link>
```

**After:**

```typescript
import { Link } from '@tanstack/react-router'

<Link to="/decks/$id" params={{ id: '123' }}>View Deck</Link>
```

#### 6.3 Navigation Hooks

**Before:**

```typescript
import { useRouter, usePathname, useSearchParams } from "next/navigation";

function MyComponent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigate = () => {
    router.push("/decks/123");
  };
}
```

**After:**

```typescript
import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router";

function MyComponent() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const search = useSearch({ from: "__root__" });

  const handleNavigate = () => {
    navigate({ to: "/decks/$id", params: { id: "123" } });
  };

  const pathname = routerState.location.pathname;
}
```

### Step 7: Cloudflare Bindings

#### 7.1 Accessing Bindings in Loaders

**Create `app/server/context.ts`:**

```typescript
import { type PlatformProxy } from "wrangler";

export interface CloudflareEnv {
  DB: D1Database;
  KV: KVNamespace;
  // Add other bindings
}

export async function getCloudflareContext() {
  // In production, bindings are available on the platform object
  // In development, we need to use getPlatformProxy from wrangler
  if (import.meta.env.DEV) {
    const { getPlatformProxy } = await import("wrangler");
    const platform = await getPlatformProxy<CloudflareEnv>();
    return platform.env;
  }

  // In production (Cloudflare Workers)
  return globalThis as unknown as CloudflareEnv;
}
```

**Using in a loader:**

```typescript
export const Route = createFileRoute("/decks/$id")({
  loader: async ({ params, context }) => {
    const env = await getCloudflareContext();

    // Use D1 database
    const deck = await env.DB.prepare("SELECT * FROM decks WHERE id = ?")
      .bind(params.id)
      .first();

    // Use KV
    const cached = await env.KV.get(`deck:${params.id}`);

    return { deck };
  },
  component: DeckPage,
});
```

### Step 8: API Routes

API routes in TanStack Start are handled differently. You can use:

1. **Server Functions** (recommended for simple cases)
2. **Separate API handlers** (for complex APIs)
3. **Keep using Cloudflare Workers** (existing setup)

Since your API is already in a separate Cloudflare Worker (`lambda/mtg-companion-api`), you can keep it as is and just call it from your loaders.

**Example server function (if needed):**

```typescript
// app/server/api/decks.ts
import { json } from "@tanstack/start";
import { getCloudflareContext } from "../context";

export async function getDeck(id: string) {
  const env = await getCloudflareContext();

  const deck = await env.DB.prepare("SELECT * FROM decks WHERE id = ?")
    .bind(id)
    .first();

  if (!deck) {
    throw new Error("Deck not found");
  }

  return json(deck);
}
```

---

## Common Pitfalls & Solutions

### 1. Hydration Mismatch

**Problem:** Different output between server and client.

**Solution:**

- Ensure time-based logic uses consistent times
- Use `suppressHydrationWarning` on HTML element
- Defer client-only rendering:

```typescript
import { useEffect, useState } from 'react'

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <>{children}</>
}
```

### 2. Environment Variables

**Problem:** `process.env` doesn't work the same way.

**Solution:** Use `import.meta.env`:

```typescript
// Before
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// After
const apiUrl = import.meta.env.VITE_API_URL;

// For server-only variables (in loaders):
const secretKey = import.meta.env.SECRET_KEY;
```

### 3. Theme Provider Flash

**Problem:** Flash of unstyled content on theme load.

**Solution:** Use script tag in head to set theme before render:

```typescript
// app/routes/__root.tsx
<head>
  <script dangerouslySetInnerHTML={{
    __html: `
      (function() {
        const theme = localStorage.getItem('theme') || 'system';
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        }
      })();
    `
  }} />
</head>
```

### 4. Loading States

**Problem:** No built-in loading.tsx equivalent.

**Solution:** Use `pendingComponent` and `pendingMs`:

```typescript
export const Route = createFileRoute("/decks")({
  loader: async () => {
    // ...
  },
  pendingComponent: DecksSkeleton,
  pendingMs: 200, // Show skeleton after 200ms
  component: DecksPage,
});
```

### 5. Error Boundaries

**Problem:** Need to handle errors gracefully.

**Solution:** Use `errorComponent`:

```typescript
export const Route = createFileRoute('/decks/$id')({
  loader: async ({ params }) => {
    // ...
  },
  component: DeckPage,
  errorComponent: ({ error, reset }) => {
    return (
      <div>
        <h2>Error loading deck</h2>
        <p>{error.message}</p>
        <button onClick={reset}>Try again</button>
      </div>
    )
  },
})
```

---

## Performance Considerations

### 1. Code Splitting

TanStack Start automatically code-splits by route. For additional splitting:

```typescript
import { lazy } from 'react'

const HeavyComponent = lazy(() => import('@/components/heavy-component'))

function MyPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <HeavyComponent />
    </Suspense>
  )
}
```

### 2. Prefetching

Prefetch routes on hover:

```typescript
import { Link } from '@tanstack/react-router'

<Link
  to="/decks/$id"
  params={{ id: deck.id }}
  preload="intent" // Prefetch on hover
>
  View Deck
</Link>
```

### 3. Query Caching

Configure TanStack Query cache times:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### 4. Bundle Size

Monitor your bundle:

```bash
pnpm build
pnpm vite-bundle-visualizer
```

Optimize imports:

```typescript
// Bad
import { Button } from "@radix-ui/react-button";

// Good (if available)
import { Button } from "@radix-ui/react-button/dist/button";

// Use barrel imports carefully
```

---

## Testing Strategy

### 1. Unit Tests

Keep your existing unit tests for components and utilities. They should work unchanged.

### 2. Integration Tests

Update navigation tests:

```typescript
// Before (with Next.js)
import { useRouter } from 'next/router'
jest.mock('next/router')

// After (with TanStack Router)
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'

test('navigation works', () => {
  const history = createMemoryHistory()
  render(
    <RouterProvider router={router} history={history} />
  )
  // ... test navigation
})
```

### 3. E2E Tests

E2E tests (Playwright, Cypress) should work with minimal changes. Update URLs if deployment URL changes.

### 4. Visual Regression Testing

Use tools like Percy or Chromatic to ensure UI stays consistent during migration.

---

## Migration Execution Plan

### Week 1: Setup & Core

- Day 1-2: Initialize TanStack Start project, configure build tools
- Day 3-4: Set up root route, providers, and basic routing structure
- Day 5: Migrate home page and test SSR/hydration

### Week 2: Feature Migration

- Day 1-2: Migrate inventory pages (browse + edit)
- Day 3-4: Migrate deck pages (list, detail, edit)
- Day 5: Migrate remaining pages (about, privacy, etc.)

### Week 3: Refinement & Testing

- Day 1-2: Replace all Next.js components (Image, Link, etc.)
- Day 3: Set up TanStack Query for client-side fetching
- Day 4: Testing and bug fixes
- Day 5: Performance optimization

### Week 4: Deployment

- Day 1: Staging deployment
- Day 2-3: Testing in staging
- Day 4: Production deployment
- Day 5: Monitoring and quick fixes

---

## Rollback Strategy

1. **Keep Next.js version** in separate branch
2. **Use feature flags** if deploying incrementally
3. **Monitor error rates** closely after deployment
4. **Have DNS ready** to switch back if needed
5. **Keep both builds** ready to deploy for 1 week after migration

---

## Success Metrics

After migration, verify:

- [ ] All routes load correctly
- [ ] SSR works (view page source shows content)
- [ ] Hydration is clean (no console errors)
- [ ] Forms submit correctly
- [ ] Authentication works
- [ ] API calls succeed
- [ ] Image loading works
- [ ] Theme switching works
- [ ] Loading states appear correctly
- [ ] Error handling works
- [ ] Performance is same or better (check Core Web Vitals)
- [ ] Bundle size is same or smaller
- [ ] Cold start time is same or better

---

## Resources

- **TanStack Start:** https://tanstack.com/start/latest
- **TanStack Router:** https://tanstack.com/router/latest
- **TanStack Query:** https://tanstack.com/query/latest
- **Vinxi:** https://vinxi.vercel.app/
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/
- **Vite:** https://vitejs.dev/
- **Migration Examples:** https://github.com/TanStack/router/tree/main/examples

---

## Questions & Support

For migration questions:

1. Check TanStack Discord: https://discord.com/invite/tanstack
2. Review GitHub discussions: https://github.com/TanStack/router/discussions
3. Consult the examples repo: https://github.com/TanStack/router/tree/main/examples

---

## Conclusion

This migration will modernize your stack, improve type safety, and provide better DX. The phased approach ensures minimal risk. Start with a parallel implementation, test thoroughly, and gradually shift traffic once confident.

**Good luck with the migration!**
