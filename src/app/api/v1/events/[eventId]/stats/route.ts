export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";
import { Spin } from "@/lib/db/models/Spin";
import { Redemption } from "@/lib/db/models/Redemption";
import { Item } from "@/lib/db/models/Item";
import { Collection } from "@/lib/db/models/Collection";
import { ok, err, notFound, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const orgId = req.headers.get("x-org-id");
    if (!orgId) return err("Unauthorized", 401);

    const isStream = req.headers.get("accept") === "text/event-stream";

    await connectDB();
    const event = await Event.findOne({ _id: eventId, organizationId: orgId });
    if (!event) return notFound("Event not found");

    const buildStats = async () => {
      const now = new Date();
      const [
        totalSpins,
        totalWinners,
        pending,
        redeemed,
        expired,
        totalItems,
        totalCollections,
        lastWinners,
        spinsLast24h,
        itemsDistribution,
      ] = await Promise.all([
        Spin.countDocuments({ eventId }),
        Spin.countDocuments({ eventId, isWinner: true }),
        Redemption.countDocuments({ eventId, status: "pending", expiresAt: { $gt: now } }),
        Redemption.countDocuments({ eventId, status: "redeemed" }),
        Redemption.countDocuments({ eventId, $or: [{ status: "expired" }, { status: "pending", expiresAt: { $lt: now } }] }),
        Item.countDocuments({ eventId, isActive: true }),
        Collection.countDocuments({ eventId, isActive: true }),
        Redemption.find({ eventId, status: "redeemed" })
          .sort({ redeemedAt: -1 })
          .limit(5)
          .select("itemSnapshot redeemedAt code"),
        Spin.countDocuments({ eventId, createdAt: { $gte: new Date(now.getTime() - 86_400_000) } }),
        Item.aggregate([
          { $match: { eventId: event._id, isActive: true } },
          { $group: { _id: "$collectionId", count: { $sum: 1 } } },
          { $lookup: { from: "collections", localField: "_id", foreignField: "_id", as: "col" } },
          { $unwind: "$col" },
          { $project: { name: "$col.name", count: 1 } },
        ]),
      ]);

      return {
        event: { id: event._id, name: event.name, status: event.status, slug: event.slug },
        kpis: { totalSpins, totalWinners, pending, redeemed, expired, totalItems, totalCollections, spinsLast24h },
        lastWinners,
        itemsDistribution,
        winRate: totalSpins > 0 ? ((totalWinners / totalSpins) * 100).toFixed(1) : "0",
      };
    };

    if (!isStream) {
      return ok(await buildStats());
    }

    // SSE real-time stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = async () => {
          try {
            const stats = await buildStats();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}\n\n`));
          } catch {
            controller.close();
          }
        };

        await send();
        const interval = setInterval(send, 5000);

        req.signal.addEventListener("abort", () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return serverError(e);
  }
}
