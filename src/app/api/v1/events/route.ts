import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";
import { ok, created, err, serverError } from "@/lib/api-response";

const createSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
  name: z.string().min(2),
  description: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  timezone: z.string().default("America/Argentina/Buenos_Aires"),
  theme: z.object({
    primaryColor: z.string().default("#C0392B"),
    secondaryColor: z.string().default("#D4AC0D"),
    backgroundColor: z.string().default("#1a1a2e"),
    logoURL: z.string().url().optional(),
    backgroundURL: z.string().url().optional(),
    winAnimation: z.enum(["confetti", "fireworks", "stars"]).default("confetti"),
  }).optional(),
  gameConfig: z.object({
    winnerInterval: z.number().int().min(1).default(5),
    spinDurationMs: z.number().int().default(2000),
    codePrefix: z.string().min(1).max(10).default("WIN"),
    codeExpiryMinutes: z.number().int().min(1).default(30),
    requirePlayerData: z.boolean().default(false),
    playerDataFields: z.array(z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(["text", "email", "number"]),
      required: z.boolean(),
    })).default([]),
    maxSpinsPerSession: z.number().int().min(0).default(0),
  }).optional(),
  copy: z.object({
    language: z.enum(["es", "en", "pt"]).default("es"),
    winMessage: z.string().default("¡Te ganaste [ITEM]!"),
    loseMessage: z.string().default("¡Seguí intentando!"),
    ctaPlay: z.string().default("GIRAR"),
    ctaPlayAgain: z.string().default("JUGAR DE NUEVO"),
  }).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-org-id");
    if (!orgId) return err("Unauthorized", 401);

    await connectDB();
    const events = await Event.find({ organizationId: orgId }).sort({ createdAt: -1 });
    return ok(events);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-org-id");
    const role = req.headers.get("x-user-role");
    if (!orgId) return err("Unauthorized", 401);
    if (!["org_admin", "super_admin"].includes(role ?? "")) return err("Forbidden", 403);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    await connectDB();
    const event = await Event.create({ ...parsed.data, organizationId: orgId });
    return created(event);
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) return err("Slug already exists in your organization", 409);
    return serverError(e);
  }
}
