# NextAuth Authentication Setup

This document explains the authentication system implemented in this HR app.

## Overview

The app uses **NextAuth.js** with the **Credentials Provider** for username/password authentication. Passwords are hashed with **bcryptjs**, and sessions are stored using **JWT tokens**.

## Key Files

### Authentication Configuration
- **[app/api/auth/[...nextauth]/route.ts](app/api/auth/[...nextauth]/route.ts)** - NextAuth configuration with Credentials Provider

### Pages
- **[app/login/page.tsx](app/login/page.tsx)** - Login form UI
- **[app/dashboard/page.tsx](app/dashboard/page.tsx)** - Protected dashboard (requires login)
- **[app/page.tsx](app/page.tsx)** - Home page that redirects to login/dashboard

### Middleware & Providers
- **[middleware.ts](middleware.ts)** - Route protection middleware
- **[app/providers.tsx](app/providers.tsx)** - SessionProvider wrapper

### Database & Utils
- **[lib/auth-utils.ts](lib/auth-utils.ts)** - Password hashing utility
- **[prisma/schema.prisma](prisma/schema.prisma)** - User model definition
- **[scripts/seed.ts](scripts/seed.ts)** - Seed script for creating test users

## Setup Instructions

### 1. Environment Variables

Edit `.env.local` with your database configuration:

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-change-this-in-production-use-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

# Database Configuration (Update with your actual MySQL credentials)
DATABASE_URL="mysql://root:@localhost:3306/hr_app"
```

**Generate a secure NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Create Database Tables

```bash
npx prisma db push
```

### 4. Seed Test Users

```bash
npx ts-node scripts/seed.ts
```

This creates two test users:
- **Username:** `admin` | **Password:** `admin123` | **Role:** admin
- **Username:** `user` | **Password:** `user123` | **Role:** employee

### 5. Install ts-node (for seed script)

```bash
npm install -D ts-node
```

### 6. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and you'll be redirected to the login page.

## How It Works

### 1. Login Flow
1. User submits username/password on `/login` page
2. NextAuth calls `authorize()` callback which:
   - Queries Prisma for user by username
   - Compares password using bcryptjs
   - Returns user data if valid
3. JWT token is created and stored in session
4. User is redirected to `/dashboard`

### 2. Session Management
- Sessions use **JWT strategy** (stateless, no database session storage needed)
- JWT callbacks (`jwt` and `session`) add user data to the token
- Available in both server and client components via `getSession()` or `useSession()`

### 3. Route Protection
- **Middleware** (`middleware.ts`) checks for valid JWT token
- Unauthenticated users are redirected to `/login`
- Authenticated users trying to access `/login` are redirected to `/dashboard`

### 4. Client-Side Protection
- Dashboard page uses `useSession()` hook to check authentication
- If unauthenticated, redirects to login
- Shows loading state while checking session

## Usage in Components

### Server Components
```typescript
import { getSession } from "next-auth/react";

export default async function ServerComponent() {
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }
  
  return <div>Welcome, {session.user.username}!</div>;
}
```

### Client Components
```typescript
"use client";

import { useSession, signOut } from "next-auth/react";

export default function ClientComponent() {
  const { data: session, status } = useSession();
  
  if (status === "loading") return <div>Loading...</div>;
  if (status === "unauthenticated") return <div>Not logged in</div>;
  
  return (
    <div>
      Welcome, {session?.user?.username}!
      <button onClick={() => signOut()}>Logout</button>
    </div>
  );
}
```

## Customization

### Extend User Properties
Edit `prisma/schema.prisma` to add more fields to the User model:

```prisma
model User {
  id       Int    @id @default(autoincrement())
  username String @unique
  password String
  role     String @default("user")
  email    String @unique  // Add this
  
  @@map("users")
}
```

Then update the auth callbacks in `app/api/auth/[...nextauth]/route.ts` to include these fields.

### Add More Providers
To add Google, GitHub, etc., install their provider:

```bash
npm install @auth/prisma-adapter
```

Then add to the providers array in the auth config.

### Customize Login Page
Modify `/app/login/page.tsx` to match your branding and requirements.

## Security Notes

- ✅ Passwords are hashed with bcrypt (not stored in plain text)
- ✅ JWT tokens are signed with NEXTAUTH_SECRET
- ✅ Routes are protected by middleware
- ✅ Sessions are stateless and secure
- ⚠️ In production, always use a strong NEXTAUTH_SECRET
- ⚠️ Use HTTPS in production
- ⚠️ Keep .env.local out of version control

## Troubleshooting

### "Invalid credentials" when logging in
- Check the username/password in the seed script
- Verify DATABASE_URL is correct
- Ensure Prisma migration has run (`npx prisma db push`)

### "Session undefined" in components
- Wrap your app with `<SessionProvider>` (already done in layout via providers.tsx)
- Use `useSession()` only in client components (`"use client"`)

### Middleware not redirecting
- Verify middleware.ts is at the root level (not in app folder)
- Check matcher pattern in middleware config
- Ensure NEXTAUTH_SECRET is set in .env.local

### TypeScript errors with session types
- Run `npx prisma generate` to regenerate Prisma types
- Extend NextAuth types as needed (see NextAuth documentation)

