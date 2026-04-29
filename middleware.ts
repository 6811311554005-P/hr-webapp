import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/login", "/api/auth"];

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/employees"];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Check if the current path is public
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // ─── Redirect unauthenticated users to login ───────────────────────────────
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname); // Optional: remember where they came from
    return NextResponse.redirect(loginUrl);
  }

  // ─── Redirect authenticated users away from login ──────────────────────────
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)",
  ],
};
