"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { GameEvent } from "@/types/models";
import { Redemption } from "@/types/models";

type EventResponse = { data: { event: GameEvent } };
type RedemptionResponse = { data: Redemption & { timeRemainingMs: number } };

function TimeRemaining({ ms }: { ms: number }) {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return (
    <span>
      {minutes}:{String(seconds).padStart(2, "0")} min
    </span>
  );
}

export default function ValidatePage() {
  const { slug, code } = useParams<{ slug: string; code: string }>();

  const { data: eventData } = useQuery<EventResponse>({
    queryKey: ["event", slug],
    queryFn: () => axios.get(`/api/v1/events/${slug}`).then((r) => r.data),
  });

  const event = eventData?.data?.event;

  const { data: redemptionData, isLoading, isError } = useQuery<RedemptionResponse>({
    queryKey: ["redemption", code],
    queryFn: () => axios.get(`/api/v1/events/${event!._id}/redemptions/${code}`).then((r) => r.data),
    enabled: !!event,
    refetchInterval: (query) => {
      const r = query.state.data?.data;
      return r?.status === "pending" && r.timeRemainingMs > 0 ? 10_000 : false;
    },
  });

  const redemption = redemptionData?.data;

  const bg = event
    ? `linear-gradient(145deg, ${event.theme.backgroundColor} 0%, #16213e 60%, #0f3460 100%)`
    : "linear-gradient(145deg, #1a1a2e, #16213e)";
  const primary = event?.theme.primaryColor ?? "#C0392B";
  const secondary = event?.theme.secondaryColor ?? "#D4AC0D";

  const statusConfig = {
    pending: {
      icon: "✓",
      label: "CÓDIGO VÁLIDO",
      color: "#22c55e",
      bg: "rgba(34,197,94,0.15)",
    },
    redeemed: {
      icon: "✓",
      label: "YA CANJEADO",
      color: "#D4AC0D",
      bg: "rgba(212,172,13,0.15)",
    },
    expired: {
      icon: "✕",
      label: "CÓDIGO EXPIRADO",
      color: "#ef4444",
      bg: "rgba(239,68,68,0.15)",
    },
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4"
      style={{ background: bg }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at center, ${secondary}22 0%, transparent 70%)` }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 flex flex-col items-center text-center max-w-sm w-full"
      >
        {isLoading && (
          <div className="text-white/60 text-lg animate-pulse">Verificando código...</div>
        )}

        {isError && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-black text-white mb-2">Código no encontrado</h1>
            <p className="text-white/60 text-sm">
              Este código no existe o no corresponde a este evento.
            </p>
          </>
        )}

        {redemption && (() => {
          const cfg = statusConfig[redemption.status];
          return (
            <>
              {/* Event logo */}
              {event?.theme.logoURL && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-6"
                >
                  <Image
                    src={event.theme.logoURL}
                    alt={event.name}
                    width={80}
                    height={80}
                    className="object-contain rounded-xl"
                  />
                </motion.div>
              )}

              {/* Status badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="mb-6 flex flex-col items-center gap-2"
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl font-black"
                  style={{ background: cfg.bg, border: `3px solid ${cfg.color}`, color: cfg.color }}
                >
                  {cfg.icon}
                </div>
                <span
                  className="text-sm font-bold tracking-widest px-4 py-1 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </span>
              </motion.div>

              {/* Item info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full rounded-2xl overflow-hidden mb-4"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src={redemption.itemSnapshot.imageURL}
                    alt={redemption.itemSnapshot.name}
                    fill
                    className="object-cover"
                    sizes="400px"
                  />
                </div>
                <div className="p-4">
                  <p className="text-white font-black text-xl">{redemption.itemSnapshot.name}</p>
                </div>
              </motion.div>

              {/* Code */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full rounded-xl px-4 py-3 mb-4"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <p className="text-white/40 text-xs mb-1 uppercase tracking-widest">Código</p>
                <p className="text-white font-mono font-bold text-lg tracking-widest">{redemption.code}</p>
              </motion.div>

              {/* Status detail */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="w-full text-sm"
                style={{ color: cfg.color }}
              >
                {redemption.status === "pending" && redemption.timeRemainingMs > 0 && (
                  <p>
                    Expira en <TimeRemaining ms={redemption.timeRemainingMs} />
                  </p>
                )}
                {redemption.status === "redeemed" && redemption.redeemedAt && (
                  <p>Canjeado el {new Date(redemption.redeemedAt).toLocaleString("es-AR")}</p>
                )}
                {redemption.status === "expired" && (
                  <p>Este código ya no es válido.</p>
                )}
              </motion.div>
            </>
          );
        })()}

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Link
            href={`/events/${slug}`}
            className="text-white/40 hover:text-white text-sm transition"
          >
            ← Volver al evento
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
