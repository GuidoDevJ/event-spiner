import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";
import { Collection } from "@/lib/db/models/Collection";
import { ok, err, notFound, serverError } from "@/lib/api-response";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "paused", "ended"]).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  timezone: z.string().optional(),
  theme: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    logoURL: z.string().url().optional(),
    backgroundURL: z.string().url().optional(),
    winAnimation: z.enum(["confetti", "fireworks", "stars"]).optional(),
  }).optional(),
  gameConfig: z.object({
    winnerInterval: z.number().int().min(1).optional(),
    spinDurationMs: z.number().int().optional(),
    codePrefix: z.string().min(1).max(10).optional(),
    codeExpiryMinutes: z.number().int().min(1).optional(),
    requirePlayerData: z.boolean().optional(),
    playerDataFields: z.array(z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(["text", "email", "number"]),
      required: z.boolean(),
    })).optional(),
    maxSpinsPerSession: z.number().int().min(0).optional(),
  }).optional(),
  copy: z.object({
    language: z.enum(["es", "en", "pt"]).optional(),
    winMessage: z.string().optional(),
    loseMessage: z.string().optional(),
    ctaPlay: z.string().optional(),
    ctaPlayAgain: z.string().optional(),
  }).optional(),
});

// Public endpoint: can be accessed by slug or eventId
export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    await connectDB();

    // Try by slug first, then by _id
    const event = await Event.findOne({
      $or: [{ slug: eventId }, { _id: eventId.match(/^[a-f\d]{24}$/i) ? eventId : null }],
    });
    if (!event) return notFound("Event not found");

    const collections = await Collection.find({ eventId: event._id, isActive: true }).sort({ order: 1 });
    return ok({ event, collections });
  } catch (e) {
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const orgId = req.headers.get("x-org-id");
    const role = req.headers.get("x-user-role");
    if (!orgId) return err("Unauthorized", 401);
    if (!["org_admin", "super_admin"].includes(role ?? "")) return err("Forbidden", 403);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    await connectDB();
    const event = await Event.findOneAndUpdate(
      { _id: eventId, organizationId: orgId },
      { $set: parsed.data },
      { new: true }
    );
    if (!event) return notFound("Event not found");
    return ok(event);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const orgId = req.headers.get("x-org-id");
    const role = req.headers.get("x-user-role");
    if (!orgId) return err("Unauthorized", 401);
    if (!["org_admin", "super_admin"].includes(role ?? "")) return err("Forbidden", 403);

    await connectDB();
    const event = await Event.findOne({ _id: eventId, organizationId: orgId });
    if (!event) return notFound("Event not found");
    if (event.status !== "draft") return err("Only draft events can be deleted");

    await event.deleteOne();
    return ok({ message: "Event deleted" });
  } catch (e) {
    return serverError(e);
  }
}
