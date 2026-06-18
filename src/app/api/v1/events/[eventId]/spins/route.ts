import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";
import { Item } from "@/lib/db/models/Item";
import { Spin } from "@/lib/db/models/Spin";
import { Redemption } from "@/lib/db/models/Redemption";
import { selectItemByWeight, generateCode, isWinningSpinNumber } from "@/lib/spin-engine";
import { generateQRDataURL, buildQRContent } from "@/lib/qrcode";
import { ok, err, notFound, serverError } from "@/lib/api-response";
import { spinLimiter } from "@/lib/ratelimit";

const schema = z.object({
  sessionId: z.string().uuid(),
  playerData: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const limit = spinLimiter.check(req);
  if (!limit.success) return err("Too many requests", 429);

  try {
    const { eventId } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const { sessionId, playerData } = parsed.data;

    await connectDB();

    const event = await Event.findOne({ $or: [{ slug: eventId }, { _id: eventId }] });
    if (!event) return notFound("Event not found");
    if (event.status !== "active") return err("Event is not active");

    // Check max spins per session
    const { maxSpinsPerSession } = event.gameConfig;
    if (maxSpinsPerSession > 0) {
      const sessionSpins = await Spin.countDocuments({ eventId: event._id, sessionId });
      if (sessionSpins >= maxSpinsPerSession) {
        return err("Maximum spins reached for this session", 403);
      }
    }

    // Validate player data if required
    if (event.gameConfig.requirePlayerData && playerData) {
      for (const field of event.gameConfig.playerDataFields) {
        if (field.required && !playerData[field.key]) {
          return err(`Field "${field.label}" is required`);
        }
      }
    }

    // Atomic spin counter — server-side, no client manipulation possible
    const prevSpins = await Spin.countDocuments({ eventId: event._id, sessionId });
    const spinNumber = prevSpins + 1;
    const { winnerInterval } = event.gameConfig;
    const isWinner = isWinningSpinNumber(spinNumber, winnerInterval);

    let redemptionData: {
      code: string;
      qrDataURL: string;
      item: { name: string; imageURL: string; metadata: Map<string, unknown> };
    } | null = null;

    let wonItem = null;

    if (isWinner) {
      const items = await Item.find({ eventId: event._id, isActive: true });
      if (!items.length) return err("No active items configured for this event");

      wonItem = selectItemByWeight(items);

      // Generate unique code
      let code: string;
      let attempts = 0;
      do {
        code = generateCode(event.gameConfig.codePrefix);
        const exists = await Redemption.findOne({ code });
        if (!exists) break;
        attempts++;
      } while (attempts < 10);

      const expiresAt = new Date(Date.now() + event.gameConfig.codeExpiryMinutes * 60_000);
      const qrContent = buildQRContent(event.slug, code!);
      const qrDataURL = await generateQRDataURL(qrContent);

      const spin = await Spin.create({
        eventId: event._id,
        sessionId,
        spinNumber,
        isWinner: true,
        itemWon: wonItem._id,
        playerData,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] ?? "",
        userAgent: req.headers.get("user-agent") ?? "",
      });

      const redemption = await Redemption.create({
        eventId: event._id,
        organizationId: event.organizationId,
        spinId: spin._id,
        code: code!,
        qrDataURL,
        itemId: wonItem._id,
        itemSnapshot: {
          name: wonItem.name,
          imageURL: wonItem.imageURL,
          metadata: wonItem.metadata,
        },
        expiresAt,
      });

      await Spin.findByIdAndUpdate(spin._id, { redemptionId: redemption._id });
      await Event.findByIdAndUpdate(event._id, {
        $inc: { "stats.totalSpins": 1, "stats.totalWinners": 1 },
      });

      redemptionData = {
        code: code!,
        qrDataURL,
        item: {
          name: wonItem.name,
          imageURL: wonItem.imageURL,
          metadata: wonItem.metadata,
        },
      };
    } else {
      await Spin.create({
        eventId: event._id,
        sessionId,
        spinNumber,
        isWinner: false,
        playerData,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] ?? "",
        userAgent: req.headers.get("user-agent") ?? "",
      });
      await Event.findByIdAndUpdate(event._id, { $inc: { "stats.totalSpins": 1 } });
    }

    const spinsUntilWin = winnerInterval - (spinNumber % winnerInterval);

    return ok({
      isWinner,
      spinNumber,
      spinsUntilWin: isWinner ? winnerInterval : spinsUntilWin,
      redemption: redemptionData,
      copy: {
        winMessage: event.copy.winMessage.replace("[ITEM]", wonItem?.name ?? ""),
        loseMessage: event.copy.loseMessage,
      },
    });
  } catch (e) {
    return serverError(e);
  }
}
