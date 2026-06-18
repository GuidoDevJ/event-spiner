import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Collection } from "@/lib/db/models/Collection";
import { ok, created, err, serverError } from "@/lib/api-response";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  imageURL: z.string().url().optional(),
  order: z.number().int().min(0).default(0),
  itemSchema: z.object({
    fields: z.array(z.object({
      key: z.string().min(1),
      label: z.string().min(1),
      type: z.enum(["text", "number", "url"]).default("text"),
      showInCard: z.boolean().default(false),
      showInWin: z.boolean().default(false),
    })),
  }).default({ fields: [] }),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    await connectDB();
    const cols = await Collection.find({ eventId }).sort({ order: 1 });
    return ok(cols);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const orgId = req.headers.get("x-org-id");
    if (!orgId) return err("Unauthorized", 401);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    await connectDB();
    const col = await Collection.create({ ...parsed.data, eventId, organizationId: orgId });
    return created(col);
  } catch (e) {
    return serverError(e);
  }
}
