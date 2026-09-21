import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { BusinessRole, User } from "@prisma/client";

const SESSION_COOKIE = "rexabook_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET haijapatikana. Weka kwenye fali ya .env (tumia: openssl rand -base64 32)"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(userId: number): Promise<string> {
  return await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    if (!sub) return null;
    const id = parseInt(String(sub), 10);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<number | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function createSession(userId: number): Promise<void> {
  const token = await signSession(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findFirst({ where: { id: userId, isActive: true } });
}

export function businessIdFor(user: Pick<User, "id" | "ownerId">): number {
  return user.ownerId ?? user.id;
}

export async function getBusinessOwner(user: Pick<User, "id" | "ownerId">): Promise<User | null> {
  return prisma.user.findUnique({ where: { id: businessIdFor(user) } });
}

/** Throws a redirect to /login when the caller is not authenticated. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/** Redirects non-admin users away from system administration routes. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return user;
}

export async function requireBusinessRole(allowed: BusinessRole[]): Promise<User> {
  const user = await requireUser();
  if (!allowed.includes(user.businessRole)) redirect("/dashboard");
  return user;
}

export function subscriptionIsActive(owner: Pick<User, "subscriptionStatus" | "subscriptionEndsAt">): boolean {
  if (owner.subscriptionStatus !== "ACTIVE" && owner.subscriptionStatus !== "TRIAL") return false;
  return Boolean(owner.subscriptionEndsAt && owner.subscriptionEndsAt.getTime() > Date.now());
}

export async function requireActiveBusinessUser(): Promise<User> {
  const user = await requireUser();
  const owner = await getBusinessOwner(user);
  if (!owner || !subscriptionIsActive(owner)) redirect("/business?subscription=1");
  return user;
}

export async function requireActiveBusinessRole(allowed: BusinessRole[]): Promise<User> {
  const user = await requireActiveBusinessUser();
  if (!allowed.includes(user.businessRole)) redirect("/dashboard");
  return user;
}
