import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { err, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return err("Missing token");

  try {
    const payload = await verifyAccessToken(token);
    await connectDB();

    const user = await User.findById(payload.sub);
    if (!user) return err("User not found", 404);

    user.status = "active";
    await user.save();

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/login?verified=1`);
  } catch {
    return serverError("Invalid or expired verification token");
  }
}
