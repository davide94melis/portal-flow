import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { UserRole } from "@/types/next-auth";

const routeRoles: Record<string, UserRole[]> = {
  "/dashboard": ["tech_lead", "admin"],
  "/br/nuovo": ["funzionale"],
  "/admin": ["admin"],
};

const dynamicRouteRoles: { pattern: RegExp; roles: UserRole[] }[] = [
  { pattern: /^\/br\/[^/]+\/task$/, roles: ["dev"] },
  { pattern: /^\/br\/[^/]+\/qa$/, roles: ["qa"] },
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/seed") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = req.auth.user?.role;
  if (!role) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const allowedRoles = routeRoles[pathname];
  if (allowedRoles && !allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  for (const { pattern, roles } of dynamicRouteRoles) {
    if (pattern.test(pathname) && !roles.includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
