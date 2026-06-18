import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Redemption } from "@/lib/db/models/Redemption";
import { ok, err, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const orgId = req.headers.get("x-org-id");
    if (!orgId) return err("Unauthorized", 401);

    const url = req.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "50"));
    const status = url.searchParams.get("status");

    await connectDB();

    const filter: Record<string, unknown> = { eventId, organizationId: orgId };
    if (status) filter.status = status;

    const now = new Date();

    const [total, redemptions] = await Promise.all([
      Redemption.countDocuments(filter),
      Redemption.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    const enriched = redemptions.map((r) => {
      const isExpired = r.status === "pending" && r.expiresAt < now;
      return {
        ...r.toObject(),
        status: isExpired ? "expired" : r.status,
        timeRemainingMs: r.status === "pending" ? Math.max(0, r.expiresAt.getTime() - now.getTime()) : 0,
        expiresAt: r.expiresAt,
      };
    });

    return ok({ redemptions: enriched, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (e) {
    return serverError(e);
  }
}
