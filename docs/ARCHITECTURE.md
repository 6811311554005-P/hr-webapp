# Architecture & Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     NEXT.JS APP (App Router)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Root Layout (app/layout.tsx)                         │ │
│  │  └─► SessionProvider (app/providers.tsx)            │ │
│  │      └─► Providers entire app with session           │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│        ┌──────────────────┼──────────────────┐              │
│        │                  │                  │              │
│        ▼                  ▼                  ▼              │
│   ┌─────────┐         ┌─────────┐      ┌──────────┐       │
│   │ / (home)│         │ /login  │      │/dashboard│       │
│   │ Redirect│         │  Form   │      │Protected │       │
│   └─────────┘         └─────────┘      └──────────┘       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Middleware (middleware.ts)                           │ │
│  │  - Checks JWT token validity                         │ │
│  │  - Routes unauthenticated → /login                   │ │
│  │  - Routes authenticated away from /login             │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  API Route: /api/auth/[...nextauth]/route.ts         │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │ NextAuth Configuration                          │ │ │
│  │  │  • Credentials Provider                         │ │ │
│  │  │  • authorize() callback                         │ │ │
│  │  │  • JWT callbacks                                │ │ │
│  │  │  • Session management                           │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
         ▼                                   ▼
  ┌─────────────┐                  ┌──────────────┐
  │ bcryptjs    │                  │   Prisma     │
  │  • hash()   │                  │  • User model│
  │  • compare()│                  │  • Queries   │
  └─────────────┘                  └──────────────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │   MySQL DB   │
                                    │  users table │
                                    └──────────────┘
```

## Authentication Flow Sequence

```
User              Browser          NextAuth API      Prisma    MySQL
  │                  │                  │              │          │
  ├─ Visit /────────►│ GET /             │              │          │
  │                  ├─ Check JWT────────►              │          │
  │                  │ (no token)       │              │          │
  │                  │◄─ Redirect to /login            │          │
  │                  │                  │              │          │
  │                  ├─ GET /login      │              │          │
  │◄─────────────────┤ (show form)      │              │          │
  │                  │                  │              │          │
  ├─ Enter username, password          │              │          │
  │                  │                  │              │          │
  ├─ Click Sign In ─►│ POST /api/auth/callback/credentials        │
  │                  │                  │              │          │
  │                  │                  ├─ authorize()│          │
  │                  │                  │  - Get user ├─────────►│
  │                  │                  │   by username│ SELECT * │
  │                  │                  │◄─────────────┤FROM users│
  │                  │                  │              │          │
  │                  │                  ├─ compare()  │          │
  │                  │                  │  password   │          │
  │                  │                  │             │          │
  │                  │                  ├─ Create JWT │          │
  │                  │                  ├─ Set cookie │          │
  │                  │                  │             │          │
  │                  │◄─────────────────┤ (token)     │          │
  │                  │ Cookie + JWT     │             │          │
  │                  │                  │             │          │
  │                  ├─ Redirect ──────►│             │          │
  │                  │ to /dashboard    │             │          │
  │                  │                  │             │          │
  │◄─────────────────┤ /dashboard       │             │          │
  │ (authenticated)  │ (with session)   │             │          │
  │                  │                  │             │          │
```

## Data Flow - Login Request

```
┌─────────────────────────────────────────────────┐
│ Client: /login Page                             │
│ - Username input: "admin"                       │
│ - Password input: "admin123"                    │
│ - Click "Sign In"                               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Next.js Client: signIn() Hook                   │
│ - Calls: signIn("credentials", {...})           │
│ - Sends POST to /api/auth/callback/credentials  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ NextAuth API Route                              │
│ /api/auth/[...nextauth]/route.ts               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ authorize() Function                            │
│ - Receives: { username, password }              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Query Database (Prisma)                         │
│ - prisma.user.findUnique({                      │
│     where: { username: "admin" }                │
│   })                                            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ MySQL Database                                  │
│ SELECT * FROM users WHERE username = 'admin'   │
│                                                 │
│ Returns:                                        │
│ {                                               │
│   id: 1,                                        │
│   username: "admin",                            │
│   password: "$2a$12$...",  ← hashed             │
│   role: "admin"                                 │
│ }                                               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Password Comparison (bcryptjs)                  │
│ compare(                                        │
│   "admin123",                 ← plain text      │
│   "$2a$12$..."                ← hashed          │
│ )                                               │
│ Returns: true ✓                                 │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Return User Object                              │
│ {                                               │
│   id: "1",                                      │
│   username: "admin",                            │
│   role: "admin"                                 │
│ }                                               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Create JWT Token                                │
│ - Payload includes: id, username, role          │
│ - Signed with: NEXTAUTH_SECRET                  │
│ - Stored in: httpOnly cookie                    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Client Receives Response                        │
│ - Set-Cookie: next-auth.session-token=...       │
│ - Redirect: /dashboard                          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ User Logged In ✓                                │
│ - useSession() returns session data             │
│ - Dashboard shows user info                     │
│ - Can access protected routes                   │
└─────────────────────────────────────────────────┘
```

## Protected Route Access Flow

```
┌────────────────────────────────┐
│ User requests /dashboard       │
└────────────────┬───────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  middleware.ts  │
        └────────┬────────┘
                 │
        ┌────────┴────────┐
        │                 │
    Token?            No Token
        │                 │
        ▼                 ▼
   Verify JWT        Redirect to /login
        │                 │
    Valid?           (Unauthorized)
        │                 │
    ┌───┴───┐             │
    │       │             │
  Yes      No             │
    │       │             │
    ▼       ▼             ▼
 Allow   Redirect      /login Page
  Route   to /login    (Try Again)
    │
    ▼
Page Renders
with Session Data
```

## Session Data Structure

```
const session = {
  user: {
    id: "1",              ← From JWT token
    username: "admin",    ← From JWT token
    role: "admin",        ← From JWT token
    email: undefined      ← Can be extended
  },
  expires: "2024-04-29T...", ← Token expiry
}

Available in:
- useSession() hook (client)
- getSession() function (server)
- Custom session callback
```

## Component Tree with Auth

```
<html>
  <body>
    <SessionProvider>
      ✓ Enables useSession() hook
      ✓ Manages session state
      ✓ Updates on sign-in/out
      
      <RootLayout>
        
        <Header>
          ✓ Can use useSession()
          ✓ Shows user info
          ✓ Logout button
        </Header>
        
        <Main>
          
          /login (Public)
            └─ LoginForm (unauthenticated)
          
          /dashboard (Protected)
            └─ DashboardContent
              ├─ UserCard
              ├─ SessionInfo
              └─ LogoutButton
          
          /api/auth/[...nextauth]
            └─ NextAuth Handler
              ├─ authorize()
              ├─ jwt()
              └─ session()
        </Main>
        
      </RootLayout>
    </SessionProvider>
  </body>
</html>
```

## Database Schema

```
users (table)
┌────┬──────────┬─────────────────┬────────┐
│ id │ username │ password        │ role   │
├────┼──────────┼─────────────────┼────────┤
│ 1  │ admin    │ $2a$12$...hash │ admin  │
│ 2  │ user     │ $2a$12$...hash │ employ │
└────┴──────────┴─────────────────┴────────┘

Indexes:
- PRIMARY KEY (id)
- UNIQUE (username)
```

## Environment Variables

```
.env.local
├─ NEXTAUTH_SECRET
│  └─ Used to sign JWT tokens
│     Verify: Must be set, strong value
│
├─ NEXTAUTH_URL
│  └─ The URL where your app is deployed
│     Verify: http://localhost:3000 (dev)
│
└─ DATABASE_URL
   └─ MySQL connection string
      Verify: mysql://user:pass@host:port/dbname
```

---

This architecture provides a complete, secure authentication system using industry-standard technologies.
