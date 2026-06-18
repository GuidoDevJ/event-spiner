import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Collection } from "@/lib/db/models/Collection";
import { Item } from "@/lib/db/models/Item";
import { ok, err, notFound, serverError } from "@/lib/api-response";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  imageURL: z.string().url().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  itemSchema: z.object({
    fields: z.array(z.object({
      key: z.string().min(1),
      label: z.string().min(1),
      type: z.enum(["text", "number", "url"]).default("text"),
      showInCard: z.boolean().default(false),
      showInWin: z.boolean().default(false),
    })),
  }).optional(),
});

type Params = Promise<{ eventId: string; collectionId: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const { eventId, collectionId } = await params;
    const orgId = req.headers.get("x-org-id");
    if (!orgId) return err("Unauthorized", 401);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    await connectDB();
    const col = await Collection.findOneAndUpdate(
      { _id: collectionId, eventId, organizationId: orgId },
      { $set: parsed.data },
      { new: true }
    );
    if (!col) return notFound("Collection not found");
    return ok(col);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const { eventId, collectionId } = await params;
    const orgId = _req.headers.get("x-org-id");
    if (!orgId) return err("Unauthorized", 401);

    await connectDB();
    const col = await Collection.findOneAndDelete({ _id: collectionId, eventId, organizationId: orgId });
    if (!col) return notFound("Collection not found");

    await Item.deleteMany({ collectionId });
    return ok({ message: "Deleted" });
  } catch (e) {
    return serverError(e);
  }
}
