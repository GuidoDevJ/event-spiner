"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { GameEvent, Redemption } from "@/types/models";

export default function DisplayPage() {
  const { slug } = useParams<{ slug: string }>();
  const [stats, setStats] = useState<{
    kpis: { totalSpins: number; totalWinners: number };
    lastWinners: Redemption[];
    event: { name: string; slug: string };
  } | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const { data: eventData } = useQuery<{ data: { event: GameEvent } }>({
    queryKey: ["event-display", slug],
    queryFn: () => axios.get(`/api/v1/events/${slug}`).then((r) => r.data),
  });
  const event = eventData?.data?.event;

  // SSE: connect to stats stream (if admin token available, otherwise poll)
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("eventspin-auth") : null;
    let parsed: { state?: { accessToken?: string } } | null = null;
    try { if (token) parsed = JSON.parse(token); } catch { /* empty */ }
    const accessToken = parsed?.state?.accessToken;

    if (!event?._id || !accessToken) return;

    const url = `/api/v1/events/${event._id}/stats`;
    const es = new EventSource(url + "?token=" + accessToken);
    sseRef.current = es;
    es.onmessage = (e) => {
      try { setStats(JSON.parse(e.data)); } catch { /* empty */ }
    };
    return () => { es.close(); };
  }, [event]);

  const bg = event
    ? `linear-gradient(145deg, ${event.theme.backgroundColor} 0%, #16213e 100%)`
    : "linear-gradient(145deg, #1a1a2e, #16213e)";
  const primary = event?.theme.primaryColor ?? "#C0392B";
  const secondary = event?.theme.secondaryColor ?? "#D4AC0D";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden"
      style={{ background: bg }}
    >
      {/* Header */}
      <div className="mb-10 text-center">
        {event?.theme.logoURL && (
          <Image src={event.theme.logoURL} alt="logo" width={140} height={70} className="object-contain mx-auto mb-4" />
        )}
        <h1 className="text-5xl font-black text-white tracking-widest uppercase"
          style={{ textShadow: `0 0 30px ${secondary}` }}>
          {event?.name ?? "EventSpin"}
        </h1>
        <p className="text-white/50 mt-2 text-lg">Modo Pantalla</p>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="flex gap-8 mb-12">
          {[
            { label: "Total giros", value: stats.kpis.totalSpins },
            { label: "Ganadores", value: stats.kpis.totalWinners },
          ].map((k) => (
            <div key={k.label} className="text-center px-8 py-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${primary}44` }}>
              <p className="text-5xl font-black" style={{ color: secondary }}>{k.value}</p>
              <p className="text-white/60 mt-1">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Last winners */}
      <div className="w-full max-w-4xl">
        <h2 className="text-xl font-bold text-white/60 text-center mb-6 tracking-widest uppercase">
          Últimos ganadores
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-6">
          <AnimatePresence>
            {(stats?.lastWinners ?? []).map((r, i) => (
              <motion.div
                key={r._id ?? i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-lg"
                  style={{ border: `3px solid ${secondary}` }}>
                  <Image
                    src={r.itemSnapshot.imageURL}
                    alt={r.itemSnapshot.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
                <p className="text-white font-semibold text-sm text-center truncate w-full">{r.itemSnapshot.name}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          {(!stats?.lastWinners?.length) && (
            <div className="col-span-5 text-center text-white/30 py-10">
              ¡Nadie ha ganado aún. ¡Sé el primero!
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <p className="mt-16 text-2xl font-bold text-white/60 tracking-wide animate-pulse">
        ¡El próximo ganador podés ser VOS!
      </p>
    </div>
  );
}
