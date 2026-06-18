"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";
import { Redemption } from "@/types/models";
import toast from "react-hot-toast";
import Link from "next/link";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#fef9e7", text: "#7d6608", label: "Pendiente" },
  redeemed: { bg: "#d5f5e3", text: "#1a7a4a", label: "Canjeado" },
  expired: { bg: "#fdedec", text: "#922b21", label: "Expirado" },
};

function Countdown({ ms }: { ms: number }) {
  const [remaining, setRemaining] = useState(ms);
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(t);
  }, [remaining]);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  if (remaining <= 0) return <span className="text-red-400 text-xs">Expirado</span>;
  return <span className="text-yellow-500 text-xs font-mono">{minutes}:{seconds.toString().padStart(2, "0")}</span>;
}

export default function RedemptionsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<Redemption | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["redemptions", eventId, page, statusFilter],
    queryFn: () =>
      apiClient.get(`/api/v1/events/${eventId}/redemptions`, {
        params: { page, limit: 50, ...(statusFilter && { status: statusFilter }) },
      }).then((r) => r.data),
    refetchInterval: 30_000,
    enabled: !!accessToken,
  });

  const redemptions: Redemption[] = data?.data?.redemptions ?? [];
  const pagination = data?.data?.pagination;

  const redeemMutation = useMutation({
    mutationFn: (code: string) =>
      apiClient.patch(`/api/v1/events/${eventId}/redemptions/${code}/redeem`, {}),
    onSuccess: (_, code) => {
      toast.success(`Código ${code} canjeado ✓`);
      qc.invalidateQueries({ queryKey: ["redemptions"] });
      if (searchResult?.code === code) setSearchResult((r) => r ? { ...r, status: "redeemed" } : null);
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al canjear";
      toast.error(msg);
    },
  });

  const handleSearch = async () => {
    if (!searchCode.trim()) return;
    try {
      const res = await apiClient.get(`/api/v1/events/${eventId}/redemptions/${searchCode.trim().toUpperCase()}`);
      setSearchResult(res.data.data);
    } catch {
      toast.error("Código no encontrado");
      setSearchResult(null);
    }
  };

  const exportCSV = async () => {
    try {
      const res = await apiClient.get(`/api/v1/events/${eventId}/redemptions/export`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8;" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `canjes-${eventId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al exportar");
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "#0f0f1a" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/admin/events/${eventId}`} className="text-white/40 hover:text-white transition">←</Link>
          <h1 className="text-2xl font-black text-white">Códigos de Canje</h1>
          <button onClick={exportCSV}
            className="ml-auto px-4 py-2 rounded-xl text-green-400 text-sm border border-green-400/30 hover:bg-green-400/10 transition">
            Exportar CSV
          </button>
        </div>

        {/* Stats row */}
        {pagination && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total", value: pagination.total, color: "#fff" },
              { label: "Pendientes", value: redemptions.filter(r => r.status === "pending").length, color: "#f39c12" },
              { label: "Canjeados", value: redemptions.filter(r => r.status === "redeemed").length, color: "#27ae60" },
              { label: "Expirados", value: redemptions.filter(r => r.status === "expired").length, color: "#e74c3c" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-white/40 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Code search / validate */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-white font-bold mb-4">Validar código</h2>
          <div className="flex gap-3">
            <input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="WIN-A3B5C7D9"
              className="flex-1 px-4 py-2.5 rounded-xl text-white font-mono text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
            <button onClick={handleSearch}
              className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition hover:opacity-80"
              style={{ background: "#C0392B" }}>
              Buscar
            </button>
          </div>

          {searchResult && (
            <div className="mt-4 flex items-center gap-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              <Image src={searchResult.itemSnapshot.imageURL} alt={searchResult.itemSnapshot.name}
                width={60} height={60} className="rounded-lg object-cover" />
              <div className="flex-1">
                <p className="text-white font-bold">{searchResult.itemSnapshot.name}</p>
                <p className="text-white/40 text-xs font-mono">{searchResult.code}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: STATUS_STYLES[searchResult.status]?.bg,
                    color: STATUS_STYLES[searchResult.status]?.text,
                  }}>
                  {STATUS_STYLES[searchResult.status]?.label}
                </span>
              </div>
              {searchResult.status === "pending" && (
                <button
                  onClick={() => redeemMutation.mutate(searchResult.code)}
                  disabled={redeemMutation.isPending}
                  className="px-5 py-2 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                  style={{ background: "#27ae60" }}>
                  CANJEAR
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {["", "pending", "redeemed", "expired"].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className="px-4 py-1.5 rounded-full text-sm transition"
              style={{
                background: statusFilter === s ? "#C0392B" : "rgba(255,255,255,0.07)",
                color: statusFilter === s ? "#fff" : "rgba(255,255,255,0.5)",
              }}>
              {s === "" ? "Todos" : STATUS_STYLES[s]?.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />)}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                  {["Código", "Premio", "Estado", "Creado", "Tiempo", "Acción"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-white/50 font-semibold text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr key={r._id} className="border-t border-white/5 hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-mono text-white/80 text-xs">{r.code}</td>
                    <td className="px-4 py-3 text-white">{r.itemSnapshot.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: STATUS_STYLES[r.status]?.bg, color: STATUS_STYLES[r.status]?.text }}>
                        {STATUS_STYLES[r.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">{new Date(r.createdAt).toLocaleString("es-AR")}</td>
                    <td className="px-4 py-3">
                      {r.status === "pending" ? <Countdown ms={r.timeRemainingMs} /> : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" && (
                        <button
                          onClick={() => redeemMutation.mutate(r.code)}
                          disabled={redeemMutation.isPending}
                          className="px-3 py-1 rounded-lg text-white text-xs font-bold disabled:opacity-50 transition hover:opacity-80"
                          style={{ background: "#27ae60" }}>
                          Canjear
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className="w-8 h-8 rounded-lg text-sm transition"
                style={{
                  background: page === p ? "#C0392B" : "rgba(255,255,255,0.07)",
                  color: page === p ? "#fff" : "rgba(255,255,255,0.5)",
                }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
