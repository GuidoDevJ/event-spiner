import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { RefreshToken } from "@/lib/db/models/RefreshToken";
import { hashToken } from "@/lib/auth/jwt";
import { ok } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("refresh_token")?.value;

  if (token) {
    await connectDB();
    await RefreshToken.deleteOne({ tokenHash: hashToken(token) });
  }

  const res = NextResponse.json({ data: { message: "Logged out" } });
  res.cookies.delete("refresh_token");
  return res;
}
