import { NextResponse, type NextRequest } from "next/server";

// Mock-SSO gate: without a persona cookie, send users to the sign-in page.
export function middleware(req: NextRequest) {
  if (!req.cookies.get("persona") && !req.nextUrl.pathname.startsWith("/sign-in")) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\.png|.*\\.svg).*)"],
};
