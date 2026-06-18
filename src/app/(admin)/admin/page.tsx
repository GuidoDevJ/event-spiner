"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GameEvent } from "@/types/models";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  draft: "#6c757d",
  active: "#27ae60",
  paused: "#e67e22",
  ended: "#e74c3c",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  active: "Activo",
  paused: "Pausado",
  ended: "Finalizado",
};

export default function AdminDashboard() {
  const { accessToken, user, clearAuth } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && !accessToken) router.replace("/admin/login");
  }, [hydrated, accessToken, router]);

  const { data, isLoading } = useQuery<{ data: GameEvent[] }>({
    queryKey: ["events"],
    queryFn: () => apiClient.get("/api/v1/events").then((r) => r.data),
    enabled: !!accessToken,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/api/v1/events/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Estado actualizado"); },
    onError: () => toast.error("Error al actualizar"),
  });

  const events = data?.data ?? [];

  const logout = async () => {
    await apiClient.post("/api/v1/auth/logout");
    clearAuth();
    router.push("/admin/login");
  };

  if (!hydrated) return <div className="min-h-screen" style={{ background: "#0f0f1a" }} />;

  return (
    <div className="min-h-screen" style={{ background: "#0f0f1a" }}>
      {/* Topbar */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-black text-xl">EventSpin</span>
          <span className="text-white/30 text-sm">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/50 text-sm">{user?.email}</span>
          <button onClick={logout} className="text-white/40 hover:text-white text-sm transition">Salir</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">Mis Eventos</h1>
            <p className="text-white/40 text-sm mt-1">Gestioná todos tus eventos de tragamonedas</p>
          </div>
          <Link href="/admin/events/new"
            className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #C0392B, #922b21)" }}>
            + Nuevo Evento
          </Link>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
            ))}
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🎰</p>
            <p className="text-white/50">No tenés eventos creados aún.</p>
            <Link href="/admin/events/new" className="inline-block mt-4 text-red-400 hover:text-red-300 font-semibold">
              Crear primer evento →
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event._id} className="rounded-2xl overflow-hidden transition hover:scale-[1.01]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {/* Color bar */}
              <div className="h-2" style={{ background: `linear-gradient(90deg, ${event.theme.primaryColor}, ${event.theme.secondaryColor})` }} />

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white text-lg">{event.name}</h3>
                    <p className="text-white/40 text-xs font-mono">/{event.slug}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ background: STATUS_COLORS[event.status] + "22", color: STATUS_COLORS[event.status] }}>
                    {STATUS_LABELS[event.status]}
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Giros", value: event.stats.totalSpins },
                    { label: "Ganadores", value: event.stats.totalWinners },
                    { label: "Canjeados", value: event.stats.totalRedemptions },
                  ].map(s => (
                    <div key={s.label} className="text-center py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <p className="text-white font-bold text-lg">{s.value}</p>
                      <p className="text-white/40 text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/admin/events/${event._id}`}
                    className="flex-1 py-2 rounded-xl text-white text-sm font-semibold text-center transition hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.08)" }}>
                    Configurar
                  </Link>
                  <Link href={`/admin/events/${event._id}/stats`}
                    className="px-3 py-2 rounded-xl text-white/60 text-sm text-center transition hover:text-white hover:bg-white/10"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    Stats
                  </Link>
                  <button
                    onClick={() => toggleStatus.mutate({
                      id: event._id,
                      status: event.status === "active" ? "paused" : "active",
                    })}
                    className="px-3 py-2 rounded-xl text-sm transition hover:opacity-80"
                    style={{
                      background: event.status === "active" ? "#e67e2222" : "#27ae6022",
                      color: event.status === "active" ? "#e67e22" : "#27ae60",
                      border: `1px solid ${event.status === "active" ? "#e67e2244" : "#27ae6044"}`,
                    }}>
                    {event.status === "active" ? "Pausar" : "Activar"}
                  </button>
                </div>

                {/* Game link */}
                <a href={`/events/${event.slug}`} target="_blank" rel="noreferrer"
                  className="block text-center mt-3 text-white/30 hover:text-white/60 text-xs transition">
                  🎮 /events/{event.slug} ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
