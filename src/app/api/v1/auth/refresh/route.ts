import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { RefreshToken } from "@/lib/db/models/RefreshToken";
import { verifyRefreshToken, signAccessToken, signRefreshToken, hashToken } from "@/lib/auth/jwt";
import { err, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("refresh_token")?.value;
  if (!token) return err("No refresh token", 401);

  try {
    const payload = await verifyRefreshToken(token);
    await connectDB();

    const stored = await RefreshToken.findOne({ tokenHash: hashToken(token) });
    if (!stored || stored.expiresAt < new Date()) {
      return err("Refresh token expired or revoked", 401);
    }

    const user = await User.findById(payload.sub);
    if (!user || user.status !== "active") return err("User not found", 401);

    // Rotate refresh token
    await RefreshToken.deleteOne({ _id: stored._id });

    const newAccessToken = await signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      orgId: user.organizationId.toString(),
    });
    const newRefreshToken = await signRefreshToken(user._id.toString());
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: expiry,
    });

    const res = NextResponse.json({ data: { accessToken: newAccessToken } });
    res.cookies.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiry,
      path: "/",
    });
    return res;
  } catch {
    return serverError("Failed to refresh token");
  }
}
