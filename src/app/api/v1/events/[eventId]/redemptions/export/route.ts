import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Redemption } from "@/lib/db/models/Redemption";
import { err, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const orgId = req.headers.get("x-org-id");
    if (!orgId) return err("Unauthorized", 401);

    await connectDB();
    const redemptions = await Redemption.find({ eventId, organizationId: orgId }).sort({ createdAt: -1 });

    const now = new Date();
    const rows = redemptions.map((r) => {
      const status = r.status === "pending" && r.expiresAt < now ? "expired" : r.status;
      const meta = r.itemSnapshot.metadata instanceof Map
        ? Object.fromEntries(r.itemSnapshot.metadata)
        : r.itemSnapshot.metadata;
      return [
        r.code,
        r.itemSnapshot.name,
        JSON.stringify(meta),
        status,
        r.createdAt.toISOString(),
        r.redeemedAt?.toISOString() ?? "",
        r.expiresAt.toISOString(),
      ].join(",");
    });

    const header = "code,item,metadata,status,createdAt,redeemedAt,expiresAt";
    const csv = "﻿" + [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="redemptions-${eventId}.csv"`,
      },
    });
  } catch (e) {
    return serverError(e);
  }
}
