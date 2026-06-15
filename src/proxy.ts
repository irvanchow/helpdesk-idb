import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const token = req.auth;
  const pathname = req.nextUrl.pathname;

  // If not authenticated, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Protect admin routes
  if (pathname.startsWith("/admin") && token.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect technician routes
  if (
    pathname.startsWith("/technician") &&
    token.user?.role !== "IT_SUPPORT" &&
    token.user?.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect department head routes
  if (
    pathname.startsWith("/department") &&
    token.user?.role !== "DEPARTMENT_HEAD" &&
    token.user?.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/technician/:path*", "/tickets/:path*", "/department/:path*"],
};
