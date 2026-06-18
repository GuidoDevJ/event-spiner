import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Redemption } from "@/lib/db/models/Redemption";
import { Event } from "@/lib/db/models/Event";
import { ok, err, notFound, conflict, gone, serverError } from "@/lib/api-response";

type Params = Promise<{ eventId: string; code: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const { eventId, code } = await params;
    const userId = req.headers.get("x-user-id");
    const orgId = req.headers.get("x-org-id");
    if (!orgId || !userId) return err("Unauthorized", 401);

    await connectDB();

    const redemption = await Redemption.findOne({ code, eventId, organizationId: orgId });
    if (!redemption) return notFound("Code not found");
    if (redemption.status === "redeemed") return conflict("Code already redeemed");

    const now = new Date();
    if (redemption.status === "pending" && redemption.expiresAt < now) {
      return gone("Code has expired");
    }

    redemption.status = "redeemed";
    redemption.redeemedAt = now;
    redemption.redeemedBy = userId as unknown as import("mongoose").Types.ObjectId;
    await redemption.save();

    await Event.findByIdAndUpdate(eventId, { $inc: { "stats.totalRedemptions": 1 } });

    return ok(redemption);
  } catch (e) {
    return serverError(e);
  }
}
