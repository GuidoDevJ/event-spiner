"use client";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import apiClient from "@/lib/apiClient";
import { useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { GameEvent } from "@/types/models";
import toast from "react-hot-toast";

const NAV_LINKS = [
  { href: "collections", label: "Categorías de Premios" },
  { href: "items", label: "Items & Bulk Import" },
  { href: "redemptions", label: "Códigos de Canje" },
  { href: "stats", label: "Estadísticas" },
];

export default function EventConfigPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: { event: GameEvent } }>({
    queryKey: ["event-admin", eventId],
    queryFn: () => apiClient.get(`/api/v1/events/${eventId}`).then((r) => r.data),
    enabled: !!accessToken,
  });

  const event = data?.data?.event;

  const { register, handleSubmit, reset } = useForm<Partial<GameEvent>>();
  useEffect(() => { if (event) reset(event); }, [event, reset]);

  const saveMutation = useMutation({
    mutationFn: (body: Partial<GameEvent>) =>
      apiClient.patch(`/api/v1/events/${eventId}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["event-admin", eventId] }); toast.success("Guardado"); },
    onError: () => toast.error("Error al guardar"),
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0f1a" }}>
      <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#0f0f1a" }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-white/40 hover:text-white transition">←</Link>
          <div>
            <h1 className="text-2xl font-black text-white">{event?.name}</h1>
            <p className="text-white/40 text-sm font-mono">/{event?.slug}</p>
          </div>
          <a href={`/events/${event?.slug}`} target="_blank" rel="noreferrer"
            className="ml-auto text-white/30 hover:text-white text-sm transition">
            Ver juego ↗
          </a>
        </div>

        {/* Sub-navigation */}
        <div className="flex flex-wrap gap-2 mb-8 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
          <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "#C0392B" }}>Configuración</button>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={`/admin/events/${eventId}/${l.href}`}
              className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition">
              {l.label}
            </Link>
          ))}
        </div>

        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
          {/* General */}
          <section className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 className="text-white font-bold mb-4">General</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-xs mb-1 block">Nombre del evento</label>
                <input {...register("name")} className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">Estado</label>
                <select {...register("status")} className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <option value="draft" style={{ background: "#1a1a2e" }}>Borrador</option>
                  <option value="active" style={{ background: "#1a1a2e" }}>Activo</option>
                  <option value="paused" style={{ background: "#1a1a2e" }}>Pausado</option>
                  <option value="ended" style={{ background: "#1a1a2e" }}>Finalizado</option>
                </select>
              </div>
            </div>
          </section>

          {/* Game config */}
          <section className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 className="text-white font-bold mb-4">Mecánica del juego</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { name: "gameConfig.winnerInterval", label: "Intervalo ganador", type: "number", hint: "Cada N giros hay un ganador" },
                { name: "gameConfig.codeExpiryMinutes", label: "Expiración código (min)", type: "number", hint: "Minutos de validez del código" },
                { name: "gameConfig.codePrefix", label: "Prefijo del código", type: "text", hint: 'Ej: "MUNDIAL" → MUNDIAL-XXXX' },
                { name: "gameConfig.spinDurationMs", label: "Duración animación (ms)", type: "number", hint: "Default: 2000" },
                { name: "gameConfig.maxSpinsPerSession", label: "Max giros por sesión", type: "number", hint: "0 = ilimitado" },
              ].map((f) => (
                <div key={f.name}>
                  <label className="text-white/60 text-xs mb-1 block">{f.label}</label>
                  <input
                    type={f.type}
                    {...register(f.name as keyof GameEvent, f.type === "number" ? { valueAsNumber: true } : {})}
                    className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                  <p className="text-white/30 text-xs mt-0.5">{f.hint}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Theme */}
          <section className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 className="text-white font-bold mb-4">Branding & Tema</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { name: "theme.primaryColor", label: "Color primario", type: "color" },
                { name: "theme.secondaryColor", label: "Color secundario", type: "color" },
                { name: "theme.backgroundColor", label: "Fondo", type: "color" },
              ].map((f) => (
                <div key={f.name}>
                  <label className="text-white/60 text-xs mb-1 block">{f.label}</label>
                  <input type="color" {...register(f.name as keyof GameEvent)}
                    className="w-full h-10 rounded-lg cursor-pointer border-0 outline-none"
                    style={{ background: "transparent" }} />
                </div>
              ))}
              <div className="col-span-2 sm:col-span-3">
                <label className="text-white/60 text-xs mb-1 block">Animación de victoria</label>
                <select {...register("theme.winAnimation" as keyof GameEvent)}
                  className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <option value="confetti" style={{ background: "#1a1a2e" }}>Confetti</option>
                  <option value="fireworks" style={{ background: "#1a1a2e" }}>Fuegos artificiales</option>
                  <option value="stars" style={{ background: "#1a1a2e" }}>Estrellas</option>
                </select>
              </div>
            </div>
          </section>

          {/* Copy */}
          <section className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 className="text-white font-bold mb-4">Textos del juego</h2>
            <div className="space-y-3">
              {[
                { name: "copy.winMessage", label: "Mensaje ganador", hint: "Usá [ITEM] para el nombre del premio" },
                { name: "copy.loseMessage", label: "Mensaje de pérdida" },
                { name: "copy.ctaPlay", label: "Botón girar" },
                { name: "copy.ctaPlayAgain", label: "Botón jugar de nuevo" },
              ].map((f) => (
                <div key={f.name}>
                  <label className="text-white/60 text-xs mb-1 block">{f.label}{f.hint && <span className="text-white/30 ml-2">{f.hint}</span>}</label>
                  <input {...register(f.name as keyof GameEvent)}
                    className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
                </div>
              ))}
            </div>
          </section>

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full py-3 rounded-xl text-white font-bold tracking-wide disabled:opacity-50 transition"
            style={{ background: "linear-gradient(135deg, #C0392B, #922b21)" }}>
            {saveMutation.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
