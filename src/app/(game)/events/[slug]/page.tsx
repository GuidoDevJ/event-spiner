"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { useGameStore } from "@/stores/gameStore";
import { GameEvent, Item, SpinResult } from "@/types/models";
import PlayerForm from "@/components/game/PlayerForm";
import toast from "react-hot-toast";

const CELL = 90;
const GRID_ROWS = 3;
const STRIP_LENGTH = 10;

// ── ReelCell ──────────────────────────────────────────────────────────────────
function ReelCell({
  finalItem,
  spinning,
  items,
  delay,
  primaryColor,
  isCenter,
}: {
  finalItem: Item;
  spinning: boolean;
  items: Item[];
  delay: number;
  primaryColor: string;
  isCenter: boolean;
}) {
  // Stable random strip generated once per spin. useMemo with [spinning] dep
  // avoids re-shuffling on every parent re-render during the spin.
  const strip = useMemo(() => {
    if (!spinning || !items.length) return [finalItem];
    return Array.from({ length: STRIP_LENGTH }, () =>
      items[Math.floor(Math.random() * items.length)]
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning]);

  const scrollY = -(CELL * (strip.length - 1));

  return (
    <div
      className="rounded-xl"
      style={{
        width: CELL,
        height: CELL,
        overflow: "hidden",
        border: isCenter && !spinning
          ? `2px solid ${primaryColor}`
          : "2px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.05)",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <motion.div
        style={{ display: "flex", flexDirection: "column" }}
        animate={spinning ? { y: [0, scrollY] } : { y: 0 }}
        transition={
          spinning
            ? { duration: STRIP_LENGTH * 0.08, repeat: Infinity, ease: "linear", delay }
            : { duration: 0.2, ease: "easeOut" }
        }
      >
        {strip.map((it, idx) => (
          <div key={idx} style={{ width: CELL, height: CELL, position: "relative", flexShrink: 0 }}>
            {it.imageURL && (
              <Image
                src={it.imageURL}
                alt={it.name}
                fill
                className="object-cover"
                sizes={`${CELL}px`}
              />
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── SlotLever ─────────────────────────────────────────────────────────────────
function SlotLever({ onPull, disabled }: { onPull: () => void; disabled: boolean }) {
  const controls = useAnimationControls();
  const [pulling, setPulling] = useState(false);

  const handlePull = async () => {
    if (disabled || pulling) return;
    setPulling(true);

    // Snap down fast
    await controls.start({
      rotate: 40,
      transition: { duration: 0.13, ease: "easeOut" },
    });

    // Trigger the spin while lever is down
    onPull();

    // Spring back with realistic bounce
    await controls.start({
      rotate: 0,
      transition: { type: "spring", stiffness: 90, damping: 7, mass: 1.1 },
    });

    setPulling(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        userSelect: "none",
      }}
    >
      {/* Rotating arm — pivot at bottom center */}
      <motion.div
        animate={controls}
        style={{
          transformOrigin: "bottom center",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.35 : 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
        onClick={handlePull}
      >
        {/* Ball knob */}
        <motion.div
          whileHover={!disabled ? { scale: 1.12 } : {}}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 38% 35%, #ff6b6b, #c0392b 55%, #7b241c 100%)",
            boxShadow:
              "0 4px 18px rgba(192,57,43,0.75), inset 0 1px 4px rgba(255,255,255,0.4)",
            flexShrink: 0,
          }}
        />
        {/* Rod */}
        <div
          style={{
            width: 14,
            height: 118,
            marginTop: 3,
            background:
              "linear-gradient(90deg, #636e72 0%, #b2bec3 30%, #dfe6e9 50%, #b2bec3 70%, #636e72 100%)",
            borderRadius: 7,
            boxShadow:
              "2px 0 6px rgba(0,0,0,0.35), inset -1px 0 3px rgba(255,255,255,0.15)",
            flexShrink: 0,
          }}
        />
      </motion.div>

      {/* Fixed base bracket */}
      <div
        style={{
          width: 30,
          height: 18,
          background: "linear-gradient(180deg, #636e72 0%, #2d3436 100%)",
          borderRadius: "0 0 8px 8px",
          boxShadow: "0 5px 12px rgba(0,0,0,0.55)",
          marginTop: -3,
        }}
      />

      <p
        style={{
          color: "rgba(255,255,255,0.22)",
          fontSize: 9,
          marginTop: 10,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        tirar
      </p>
    </div>
  );
}

// ── GamePage ──────────────────────────────────────────────────────────────────
export default function GamePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { sessionId, setSessionId, playerData, setLastResult } = useGameStore();

  const [spinning, setSpinning] = useState(false);
  const [reelSymbols, setReelSymbols] = useState<Item[][]>([]);
  const [resultMsg, setResultMsg] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [gridCols, setGridCols] = useState(3);

  useEffect(() => {
    if (!sessionId) setSessionId(uuidv4());
  }, [sessionId, setSessionId]);

  useEffect(() => {
    const update = () => setGridCols(window.innerWidth >= 1280 ? 5 : 3);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const TOTAL_REELS = gridCols * GRID_ROWS;

  const { data, isLoading, error } = useQuery<{ data: { event: GameEvent } }>({
    queryKey: ["event", slug],
    queryFn: () => axios.get(`/api/v1/events/${slug}`).then((r) => r.data),
  });

  const event = data?.data?.event;

  const { data: itemsData } = useQuery<{ data: Item[] }>({
    queryKey: ["items", event?._id],
    queryFn: () => axios.get(`/api/v1/events/${event!._id}/items`).then((r) => r.data),
    enabled: !!event,
  });

  const items = itemsData?.data ?? [];

  const getRandomItem = useCallback((): Item => {
    if (!items.length)
      return { _id: "", name: "?", imageURL: "/placeholder.png", weight: 1, isActive: true, metadata: {}, collectionId: "", eventId: "" };
    return items[Math.floor(Math.random() * items.length)];
  }, [items]);

  useEffect(() => {
    if (items.length && !reelSymbols.length) {
      setReelSymbols(Array.from({ length: TOTAL_REELS }, () => [getRandomItem()]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, TOTAL_REELS]);

  useEffect(() => {
    if (items.length) {
      setReelSymbols(Array.from({ length: TOTAL_REELS }, () => [getRandomItem()]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridCols]);

  const spin = useCallback(async () => {
    if (spinning || !event || !items.length) return;

    if (event.gameConfig.requirePlayerData && !playerData) {
      setShowPlayerForm(true);
      return;
    }

    setSpinning(true);
    setShowResult(false);

    try {
      const res = await axios.post<{ data: SpinResult }>(`/api/v1/events/${event._id}/spins`, {
        sessionId,
        ...(playerData ? { playerData } : {}),
      });

      const result = res.data.data;
      const duration = event.gameConfig.spinDurationMs ?? 2000;

      setTimeout(() => {
        if (result.isWinner && result.redemption) {
          const winItem: Item = {
            _id: "win",
            name: result.redemption.item.name,
            imageURL: result.redemption.item.imageURL,
            weight: 100,
            isActive: true,
            metadata: result.redemption.item.metadata,
            collectionId: "",
            eventId: event._id,
          };
          setReelSymbols(
            Array.from({ length: TOTAL_REELS }, (_, i) => {
              const row = Math.floor(i / gridCols);
              return row === 1 ? [winItem] : [getRandomItem()];
            })
          );
          if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
        } else {
          setReelSymbols(Array.from({ length: TOTAL_REELS }, () => [getRandomItem()]));
        }

        setLastResult(result);
        setResultMsg(result.isWinner ? result.copy.winMessage : result.copy.loseMessage);
        setShowResult(true);
        setSpinning(false);

        if (result.isWinner) {
          setTimeout(() => router.push(`/events/${slug}/win`), 1200);
        }
      }, duration);
    } catch (e: unknown) {
      setSpinning(false);
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Error al girar";
      toast.error(msg);
    }
  }, [spinning, event, items.length, playerData, sessionId, getRandomItem, TOTAL_REELS, gridCols, setLastResult, slug, router]);

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a2e" }}>
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );

  if (error || !event)
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: "#1a1a2e" }}>
        <p>Evento no encontrado.</p>
      </div>
    );

  const bg = event.theme.backgroundURL
    ? `url(${event.theme.backgroundURL})`
    : `linear-gradient(145deg, ${event.theme.backgroundColor} 0%, #16213e 60%, #0f3460 100%)`;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: bg, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${event.theme.primaryColor}22 0%, transparent 70%)`,
        }}
      />

      {event.theme.logoURL && (
        <div className="mb-6 z-10">
          <Image src={event.theme.logoURL} alt={event.name} width={120} height={60} className="object-contain" />
        </div>
      )}

      <h1 className="text-2xl font-bold text-white mb-6 z-10 tracking-widest uppercase">
        {event.name}
      </h1>

      {/* Machine: slot grid + lever side by side */}
      <div className="z-10 flex items-end gap-3">
        <div
          className="rounded-2xl p-4 shadow-2xl"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)",
            border: `2px solid ${event.theme.primaryColor}44`,
            display: "grid",
            gridTemplateColumns: `repeat(${gridCols}, ${CELL}px)`,
            gap: "8px",
          }}
        >
          {reelSymbols.map((reel, i) => (
            <ReelCell
              key={i}
              finalItem={reel[0]}
              spinning={spinning}
              items={items}
              delay={(i % gridCols) * 0.06}
              primaryColor={event.theme.primaryColor}
              isCenter={Math.floor(i / gridCols) === 1}
            />
          ))}
        </div>

        {/* Lever — hidden on small screens, pull triggers spin */}
        <div className="hidden sm:flex flex-col items-center" style={{ paddingBottom: 20 }}>
          <SlotLever onPull={spin} disabled={spinning || !items.length} />
        </div>
      </div>

      {/* Result message */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 text-xl font-bold text-white z-10 text-center px-6"
          >
            {resultMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button — only on mobile where the lever is hidden */}
      <motion.button
        onClick={spin}
        disabled={spinning || !items.length}
        whileTap={{ scale: 0.95 }}
        className="sm:hidden mt-8 z-10 px-12 py-4 rounded-full text-white font-bold text-xl tracking-widest shadow-lg disabled:opacity-50 transition-all"
        style={{
          background: spinning
            ? "rgba(255,255,255,0.2)"
            : `linear-gradient(135deg, ${event.theme.primaryColor}, ${event.theme.secondaryColor})`,
          boxShadow: `0 0 30px ${event.theme.primaryColor}66`,
        }}
      >
        {spinning ? "..." : event.copy.ctaPlay}
      </motion.button>

      <div className="mt-6 z-10">
        <a href={`/events/${slug}/prizes`} className="text-white/50 hover:text-white text-sm transition">
          Ver premios
        </a>
      </div>

      {showPlayerForm && event.gameConfig.requirePlayerData && (
        <PlayerForm
          fields={event.gameConfig.playerDataFields}
          onSubmit={(data) => {
            useGameStore.getState().setPlayerData(data);
            setShowPlayerForm(false);
          }}
          onClose={() => setShowPlayerForm(false)}
          primaryColor={event.theme.primaryColor}
        />
      )}
    </div>
  );
}
