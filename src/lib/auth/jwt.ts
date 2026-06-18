import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

export interface AccessTokenPayload {
  sub: string;       // userId
  email: string;
  role: string;
  orgId: string;
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.ACCESS_TOKEN_EXPIRY ?? "8h")
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret);
  return payload as unknown as AccessTokenPayload;
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.REFRESH_TOKEN_EXPIRY ?? "7d")
    .sign(refreshSecret);
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, refreshSecret);
  return payload as { sub: string };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
