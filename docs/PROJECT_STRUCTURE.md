# Project Structure Refactoring - Bulletproof React Pattern

## 📁 โครงสร้างโปรเจกต์ใหม่

```
hr-app/
├── app/                           # Next.js App Router
│   ├── api/                       # API Routes
│   │   ├── auth/[...nextauth]/    # NextAuth.js
│   │   ├── employees/             # Employee endpoints
│   │   └── health/                # Health check endpoint
│   ├── dashboard/                 # Dashboard page
│   ├── employees/                 # Employees management page
│   ├── login/                     # Login page
│   ├── layout.tsx                 # Root layout with SessionProvider
│   ├── page.tsx                   # Home page
│   ├── providers.tsx              # Context providers wrapper
│   └── globals.css                # Global styles (Tailwind)
│
├── src/                           # Application source code (Bulletproof React)
│   ├── components/                # React components (organized by feature)
│   │   ├── auth/                  # Auth-related components
│   │   ├── dashboard/
│   │   │   ├── dashboard-client.tsx   # Main dashboard component
│   │   │   └── index.ts               # Barrel export
│   │   ├── employees/             # Employee-related components
│   │   └── common/                # Shared/reusable components
│   │
│   ├── lib/                       # Shared utilities and configurations
│   │   ├── auth/
│   │   │   ├── auth-options.ts    # NextAuth configuration
│   │   │   └── index.ts
│   │   ├── prisma/
│   │   │   ├── client.ts          # Prisma client singleton
│   │   │   └── index.ts
│   │   └── utils/                 # Helper utilities
│   │
│   ├── types/                     # TypeScript type definitions
│   │   ├── employee.ts            # Employee-related types
│   │   ├── dashboard.ts           # Dashboard-related types
│   │   ├── next-auth.d.ts         # NextAuth type extensions
│   │   └── index.ts               # Type barrel exports
│   │
│   ├── services/                  # External service clients
│   │   └── api/
│   │       ├── employee-api.ts    # Employee API service
│   │       └── index.ts
│   │
│   ├── hooks/                     # Custom React hooks (reserved)
│   │
│   ├── config/                    # Configuration files (reserved)
│   │
│   └── index.ts                   # Main entry point for src/
│
├── prisma/
│   └── schema.prisma              # Database schema
│
├── scripts/                       # Utility scripts
│   ├── seed.ts                    # Seed test users
│   └── seed-employees.ts          # Seed test employees
│
├── middleware.ts                  # Next.js middleware
├── tsconfig.json                  # TypeScript config (with @/src/* alias)
├── next.config.ts                 # Next.js config
└── package.json
```

---

## 🎯 Naming Conventions

- **Files**: `kebab-case` (e.g., `dashboard-client.tsx`, `auth-options.ts`)
- **Components**: `PascalCase` exports (e.g., `export default function DashboardClient`)
- **Variables/Functions**: `camelCase` (e.g., `employeeApi`, `getEmployees()`)
- **Directories**: `lowercase` (e.g., `components/`, `services/`)

---

## 📚 Import Patterns

### Absolute Imports (Recommended)

```typescript
// Types
import type { Employee, DashboardStats } from "@/src/types";

// Components
import { DashboardClient } from "@/src/components/dashboard";

// Services
import { employeeApi } from "@/src/services/api";

// Libraries
import { prisma } from "@/src/lib/prisma";
import { authOptions } from "@/src/lib/auth";
```

### Path Aliases

- `@/*` → Project root (for app/ and config files)
- `@/src/*` → Source directory (for organized utilities)

---

## 🔄 Architecture Layers

### 1. **Components** (`src/components/`)
- Presentational and container components
- Feature-organized structure
- Each feature gets its own directory
- Exports via `index.ts` barrel files

Example:
```typescript
// src/components/dashboard/dashboard-client.tsx
export default function DashboardClient({ session, stats }) { ... }

// src/components/dashboard/index.ts
export { default as DashboardClient } from "./dashboard-client";

// Usage
import { DashboardClient } from "@/src/components/dashboard";
```

### 2. **Lib** (`src/lib/`)
- Core utilities and shared configuration
- Auth setup, database client, helpers
- Organized by domain (auth/, prisma/, utils/)

### 3. **Types** (`src/types/`)
- TypeScript interfaces and types
- Domain-specific types (employee.ts, dashboard.ts)
- Type extensions (next-auth.d.ts)
- Centralized type exports via index.ts

### 4. **Services** (`src/services/`)
- API clients and external integrations
- RESTful API service layer
- Data fetching logic

Example:
```typescript
// src/services/api/employee-api.ts
export const employeeApi = {
  list: async (params) => { ... },
  get: async (id) => { ... },
  create: async (data) => { ... },
  update: async (id, data) => { ... },
  delete: async (id) => { ... },
};
```

### 5. **Hooks** (`src/hooks/`)
- Custom React hooks (reserved for future use)
- Reusable hook logic

### 6. **Config** (`src/config/`)
- Configuration constants
- Feature flags, environment settings (reserved)

---

## 🚀 Migration Guide

### What Changed?

| Old Path | New Path | Details |
|----------|----------|---------|
| `lib/auth.ts` | `src/lib/auth/auth-options.ts` | Auth configuration |
| `lib/prisma.ts` | `src/lib/prisma/client.ts` | Database client |
| `app/dashboard/DashboardClient.tsx` | `src/components/dashboard/dashboard-client.tsx` | Dashboard component |
| (inline types) | `src/types/employee.ts` | Employee types |
| (inline types) | `src/types/dashboard.ts` | Dashboard types |
| (none) | `src/services/api/employee-api.ts` | API service layer |
| (deleted) | - | `app/providers.tsx` (recreated with SessionProvider) |
| (deleted) | - | `lib/auth-utils.ts` (unused utility) |
| (deleted) | - | `prisma.config.ts` (unused config) |

### How to Update Imports

**Before:**
```typescript
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardClient from "@/app/dashboard/DashboardClient";
import type { Employee } from "@/app/employees/page";
```

**After:**
```typescript
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { DashboardClient } from "@/src/components/dashboard";
import type { Employee } from "@/src/types";
```

---

## ✅ Build Status

```bash
✓ TypeScript: All checks passed
✓ Next.js Build: Successful
✓ All imports: Resolved correctly
✓ 14 routes detected and built
```

---

## 📋 Benefits of This Structure

1. **Scalability**: Easy to add new features without cluttering the root
2. **Maintainability**: Clear separation of concerns
3. **Reusability**: Centralized utilities and types
4. **Type Safety**: Proper TypeScript organization with extensions
5. **API Layer**: Dedicated service layer for API calls
6. **Convention**: Consistent naming and structure across the project

---

## 🔄 Next Steps

1. **Add more features**: Create new folders in `src/components/feature-name/`
2. **Extend API services**: Add more methods to `src/services/api/`
3. **Add custom hooks**: Populate `src/hooks/` with reusable logic
4. **Add configuration**: Move feature flags to `src/config/`
5. **Test coverage**: Add test files alongside components (`.test.tsx`)

---

## 📚 File Anatomy

### Component Template
```typescript
// src/components/feature/component-name.tsx
"use client"; // If using client-side features

import type { FC } from "react";
import type { ComponentProps } from "@/src/types";

interface Props {
  // Component props
}

const ComponentName: FC<Props> = ({ ... }) => {
  return (
    // JSX
  );
};

export default ComponentName;
```

### Service Template
```typescript
// src/services/api/feature-api.ts
import type { FeatureData } from "@/src/types";

export const featureApi = {
  list: async (params?: any) => { ... },
  get: async (id: number) => { ... },
  create: async (data: FeatureData) => { ... },
  update: async (id: number, data: Partial<FeatureData>) => { ... },
  delete: async (id: number) => { ... },
};
```

---

**Last Updated**: April 29, 2026  
**Pattern**: Bulletproof React  
**Naming Convention**: kebab-case (files), camelCase (vars), PascalCase (components)
