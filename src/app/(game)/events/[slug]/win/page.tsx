"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import confetti from "canvas-confetti";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useGameStore } from "@/stores/gameStore";
import { GameEvent } from "@/types/models";
import QRDisplay from "@/components/ui/QRDisplay";
import toast from "react-hot-toast";

export default function WinPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { lastResult, reset } = useGameStore();
  const [copied, setCopied] = useState(false);
  const firedRef = useRef(false);

  const { data } = useQuery<{ data: { event: GameEvent } }>({
    queryKey: ["event", slug],
    queryFn: () => axios.get(`/api/v1/events/${slug}`).then((r) => r.data),
  });

  const event = data?.data?.event;

  useEffect(() => {
    if (!lastResult?.isWinner) {
      router.replace(`/events/${slug}`);
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;

    const primary = event?.theme.primaryColor ?? "#C0392B";
    const secondary = event?.theme.secondaryColor ?? "#D4AC0D";

    const fire = (opts: confetti.Options) => confetti({ ...opts, zIndex: 9999 });
    const animate = () => {
      fire({ particleCount: 80, angle: 60, spread: 80, origin: { x: 0 }, colors: [primary, secondary, "#fff"] });
      fire({ particleCount: 80, angle: 120, spread: 80, origin: { x: 1 }, colors: [primary, secondary, "#fff"] });
    };
    animate();
    setTimeout(animate, 800);
    setTimeout(animate, 1600);

    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
  }, [lastResult, router, slug, event]);

  if (!lastResult?.isWinner || !lastResult.redemption) return null;

  const { redemption } = lastResult;
  const bg = event
    ? `linear-gradient(145deg, ${event.theme.backgroundColor} 0%, #16213e 60%, #0f3460 100%)`
    : "linear-gradient(145deg, #1a1a2e, #16213e)";
  const primary = event?.theme.primaryColor ?? "#C0392B";
  const secondary = event?.theme.secondaryColor ?? "#D4AC0D";

  const copyCode = () => {
    navigator.clipboard.writeText(redemption.code);
    setCopied(true);
    toast.success("¡Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const metaFields = event
    ? Object.entries(redemption.item.metadata)
        .filter(([key]) => {
          const allFields = (data?.data as unknown as { collections?: { itemSchema?: { fields?: { key: string; showInWin?: boolean }[] } }[] })?.collections
            ?.flatMap((c) => c.itemSchema?.fields ?? []) ?? [];
          return allFields.find((f) => f.key === key)?.showInWin;
        })
    : [];

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
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="z-10 flex flex-col items-center text-center max-w-sm w-full"
      >
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-black text-white mb-2 tracking-wide"
          style={{ textShadow: `0 0 20px ${secondary}` }}
        >
          ¡FELICITACIONES!
        </motion.h1>

        {/* Item image */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          className="my-6 rounded-2xl overflow-hidden shadow-2xl"
          style={{ border: `4px solid ${secondary}`, width: 200, height: 200, position: "relative" }}
        >
          <Image
            src={redemption.item.imageURL}
            alt={redemption.item.name}
            fill
            className="object-cover"
            sizes="200px"
          />
        </motion.div>

        {/* Item name */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xl font-bold text-white mb-1"
        >
          {lastResult.copy.winMessage}
        </motion.p>

        {/* Metadata fields */}
        {metaFields.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex flex-wrap gap-2 justify-center mt-2 mb-4"
          >
            {metaFields.map(([key, value]) => (
              <span key={key} className="px-3 py-1 rounded-full text-sm font-medium text-white/90"
                style={{ background: "rgba(255,255,255,0.1)" }}>
                {String(value)}
              </span>
            ))}
          </motion.div>
        )}

        {/* QR Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="w-full mt-4"
        >
          <QRDisplay
            code={redemption.code}
            qrDataURL={redemption.qrDataURL}
            onCopy={copyCode}
            copied={copied}
            primaryColor={primary}
          />
        </motion.div>

        {/* Play again */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          onClick={() => { reset(); router.push(`/events/${slug}`); }}
          className="mt-8 px-10 py-3 rounded-full text-white font-bold text-lg tracking-wide transition"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
        >
          {event?.copy.ctaPlayAgain ?? "JUGAR DE NUEVO"}
        </motion.button>
      </motion.div>
    </div>
  );
}
