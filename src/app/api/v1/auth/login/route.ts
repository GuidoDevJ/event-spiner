import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { RefreshToken } from "@/lib/db/models/RefreshToken";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken, hashToken } from "@/lib/auth/jwt";
import { err, serverError } from "@/lib/api-response";
import { authLimiter } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const limit = authLimiter.check(req);
  if (!limit.success) return err("Too many requests", 429);

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Invalid credentials");

    const { email, password } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email });
    if (!user) return err("Invalid credentials", 401);
    if (user.status !== "active") return err("Account not verified", 403);

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return err("Invalid credentials", 401);

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = await signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      orgId: user.organizationId.toString(),
    });

    const refreshToken = await signRefreshToken(user._id.toString());
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiry,
    });

    const res = NextResponse.json({
      data: {
        accessToken,
        user: { id: user._id, email: user.email, role: user.role },
      },
    });

    res.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: refreshExpiry,
      path: "/",
    });

    return res;
  } catch (e) {
    return serverError(e);
  }
}
