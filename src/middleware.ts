import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "rexabook_session";

const PROTECTED_PREFIXES = ["/dashboard", "/business", "/customers", "/cargo", "/settings", "/admin"];
const AUTH_PAGES = ["/login"];

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? "");
}

async function isValidSession(token?: string): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = await isValidSession(token);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isProtected && !valid) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && valid) {
    const url = new URL("/dashboard", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/business/:path*",
    "/customers/:path*",
    "/cargo/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/login",
    "/logout",
  ],
};
