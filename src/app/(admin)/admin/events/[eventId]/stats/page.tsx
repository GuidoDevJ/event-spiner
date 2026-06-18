"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import apiClient from "@/lib/apiClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import Link from "next/link";

const COLORS = ["#C0392B", "#D4AC0D", "#2980b9", "#27ae60", "#8e44ad", "#e67e22"];

interface Stats {
  event: { name: string; status: string; slug: string };
  kpis: {
    totalSpins: number;
    totalWinners: number;
    pending: number;
    redeemed: number;
    expired: number;
    totalItems: number;
    totalCollections: number;
    spinsLast24h: number;
  };
  lastWinners: { itemSnapshot: { name: string; imageURL: string }; redeemedAt: string; code: string }[];
  itemsDistribution: { name: string; count: number }[];
  winRate: string;
}

export default function StatsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { accessToken } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!accessToken || !eventId) return;
    const es = new EventSource(`/api/v1/events/${eventId}/stats?token=${accessToken}`, {});

    const fetchOnce = async () => {
      const res = await apiClient.get(`/api/v1/events/${eventId}/stats`);
      setStats(res.data.data);
    };

    fetchOnce();
    es.onmessage = (e) => { try { setStats(JSON.parse(e.data)); } catch { /* empty */ } };
    return () => es.close();
  }, [eventId, accessToken]);

  const kpi = stats?.kpis;

  return (
    <div className="min-h-screen p-6" style={{ background: "#0f0f1a" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/admin/events/${eventId}`} className="text-white/40 hover:text-white transition">←</Link>
          <div>
            <h1 className="text-2xl font-black text-white">Estadísticas</h1>
            {stats && <p className="text-white/40 text-sm">{stats.event.name} · /{stats.event.slug}</p>}
          </div>
          <span className="ml-auto flex items-center gap-2 text-green-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Tiempo real
          </span>
        </div>

        {!stats ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Giros totales", value: kpi!.totalSpins, color: "#fff" },
                { label: "Ganadores", value: kpi!.totalWinners, color: "#D4AC0D" },
                { label: "Win rate", value: `${stats.winRate}%`, color: "#27ae60" },
                { label: "Giros (24h)", value: kpi!.spinsLast24h, color: "#2980b9" },
                { label: "Pendientes", value: kpi!.pending, color: "#f39c12" },
                { label: "Canjeados", value: kpi!.redeemed, color: "#27ae60" },
                { label: "Expirados", value: kpi!.expired, color: "#e74c3c" },
                { label: "Items activos", value: kpi!.totalItems, color: "#8e44ad" },
              ].map((k) => (
                <div key={k.label} className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-white/40 text-xs mt-1">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Bar: items per collection */}
              <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <h3 className="text-white font-bold mb-4">Items por colección</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.itemsDistribution}>
                    <XAxis dataKey="name" tick={{ fill: "#aaa", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#aaa", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", color: "#fff" }} />
                    <Bar dataKey="count" fill="#C0392B" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie: redemption states */}
              <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <h3 className="text-white font-bold mb-4">Estado de canjes</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Pendientes", value: kpi!.pending },
                        { name: "Canjeados", value: kpi!.redeemed },
                        { name: "Expirados", value: kpi!.expired },
                      ]}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {["#f39c12","#27ae60","#e74c3c"].map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "none", color: "#fff" }} />
                    <Legend formatter={(v) => <span style={{ color: "#aaa", fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Last winners */}
            {stats.lastWinners.length > 0 && (
              <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <h3 className="text-white font-bold mb-4">Últimos canjes</h3>
                <div className="space-y-3">
                  {stats.lastWinners.map((w, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-white font-medium">{w.itemSnapshot.name}</span>
                      <span className="text-white/40 font-mono text-xs ml-auto">{w.code}</span>
                      {w.redeemedAt && (
                        <span className="text-white/30 text-xs">{new Date(w.redeemedAt).toLocaleTimeString("es-AR")}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
