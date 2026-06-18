import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Redemption } from "@/lib/db/models/Redemption";
import { ok, notFound, serverError } from "@/lib/api-response";

type Params = Promise<{ eventId: string; code: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const { code } = await params;
    await connectDB();

    const redemption = await Redemption.findOne({ code });
    if (!redemption) return notFound("Code not found");

    const now = new Date();
    const isExpired = redemption.status === "pending" && redemption.expiresAt < now;
    const status = isExpired ? "expired" : redemption.status;

    return ok({
      ...redemption.toObject(),
      status,
      timeRemainingMs: status === "pending" ? Math.max(0, redemption.expiresAt.getTime() - now.getTime()) : 0,
    });
  } catch (e) {
    return serverError(e);
  }
}
