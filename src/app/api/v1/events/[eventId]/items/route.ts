import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Item } from "@/lib/db/models/Item";
import { ok, created, err, serverError } from "@/lib/api-response";

const createSchema = z.object({
  collectionId: z.string().min(1),
  name: z.string().min(1),
  imageURL: z.string().url(),
  weight: z.number().min(1).max(100).default(50),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const collectionId = req.nextUrl.searchParams.get("collectionId");
    await connectDB();

    const filter: Record<string, unknown> = { eventId, isActive: true };
    if (collectionId) filter.collectionId = collectionId;

    const items = await Item.find(filter).sort({ name: 1 });
    return ok(items);
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
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    await connectDB();
    const item = await Item.create({ ...parsed.data, eventId, organizationId: orgId });
    return created(item);
  } catch (e) {
    return serverError(e);
  }
}
