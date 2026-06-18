import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

// Routes fully public regardless of method (auth endpoints + player spin)
const PUBLIC_ANY: RegExp[] = [
  /^\/api\/v1\/auth\/(login|register|verify)$/,
  /^\/api\/v1\/events\/[^/]+\/spins$/, // POST spin (players)
];

// Routes public for GET only (game reads; admin writes need auth)
const PUBLIC_GET_ONLY: RegExp[] = [
  /^\/api\/v1\/events\/[^/]+$/, // public event config
  /^\/api\/v1\/events\/[^/]+\/redemptions\/[^/]+$/, // validate redemption code
  /^\/api\/v1\/events\/[^/]+\/collections$/,
  /^\/api\/v1\/events\/[^/]+\/items$/,
];

function isPublic(pathname: string, method: string): boolean {
  if (PUBLIC_ANY.some((r) => r.test(pathname))) return true;
  if (method === "GET" && PUBLIC_GET_ONLY.some((r) => r.test(pathname))) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/v1")) return NextResponse.next();
  if (isPublic(pathname, req.method)) return NextResponse.next();

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, accessSecret);
    const res = NextResponse.next();
    res.headers.set("x-user-id", payload.sub as string);
    res.headers.set("x-user-role", payload.role as string);
    res.headers.set("x-org-id", payload.orgId as string);
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
