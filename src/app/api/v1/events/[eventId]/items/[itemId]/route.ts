import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Item } from "@/lib/db/models/Item";
import { ok, err, notFound, serverError } from "@/lib/api-response";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  imageURL: z.string().url().optional(),
  weight: z.number().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type Params = Promise<{ eventId: string; itemId: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const { eventId, itemId } = await params;
    const orgId = req.headers.get("x-org-id");
    if (!orgId) return err("Unauthorized", 401);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    await connectDB();
    const item = await Item.findOneAndUpdate(
      { _id: itemId, eventId, organizationId: orgId },
      { $set: parsed.data },
      { new: true }
    );
    if (!item) return notFound("Item not found");
    return ok(item);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const { eventId, itemId } = await params;
    const orgId = _req.headers.get("x-org-id");
    if (!orgId) return err("Unauthorized", 401);

    await connectDB();
    const item = await Item.findOneAndDelete({ _id: itemId, eventId, organizationId: orgId });
    if (!item) return notFound("Item not found");
    return ok({ message: "Deleted" });
  } catch (e) {
    return serverError(e);
  }
}
