"use client";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { Collection, SchemaField } from "@/types/models";
import toast from "react-hot-toast";

const NAV_LINKS = [
  { href: "", label: "Configuración" },
  { href: "collections", label: "Categorías de Premios" },
  { href: "items", label: "Premios" },
  { href: "redemptions", label: "Códigos de Canje" },
  { href: "stats", label: "Estadísticas" },
];

const FIELD_TYPES = ["text", "number", "url"] as const;
const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Texto",
  number: "Número",
  url: "URL (imagen/link)",
};

const emptyForm = { name: "", description: "" };
const emptyField = (): SchemaField => ({ key: "", label: "", type: "text", showInCard: false, showInWin: false });

const INPUT = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
} as const;

const SELECT_STYLE = {
  background: "#1a1a2e",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
} as const;

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-4 py-3 mb-5 text-sm leading-relaxed"
      style={{ background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.2)", color: "rgba(255,255,255,0.6)" }}>
      {children}
    </div>
  );
}

export default function CollectionsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: Collection[] }>({
    queryKey: ["collections", eventId],
    queryFn: () => apiClient.get(`/api/v1/events/${eventId}/collections`).then((r) => r.data),
    enabled: !!accessToken,
  });

  const collections = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/v1/events/${eventId}/collections`, {
        name: form.name,
        description: form.description || undefined,
        itemSchema: { fields },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections", eventId] });
      toast.success("Categoría creada");
      setForm(emptyForm);
      setFields([]);
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al crear";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (colId: string) =>
      apiClient.delete(`/api/v1/events/${eventId}/collections/${colId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections", eventId] });
      toast.success("Categoría eliminada");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al eliminar";
      toast.error(msg);
    },
  });

  function addField() {
    setFields((f) => [...f, emptyField()]);
  }

  function updateField(i: number, patch: Partial<SchemaField>) {
    setFields((f) => f.map((field, idx) => idx === i ? { ...field, ...patch } : field));
  }

  function removeField(i: number) {
    setFields((f) => f.filter((_, idx) => idx !== i));
  }

  return (
    <div className="min-h-screen" style={{ background: "#0f0f1a" }}>
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <Link href="/admin" className="text-white/40 hover:text-white transition">←</Link>
          <h1 className="text-2xl font-black text-white">Categorías de Premios</h1>
        </div>
        <p className="text-white/40 text-sm mb-8 ml-9">
          Organizá los premios en grupos. Cada categoría puede tener datos extra propios (ej: talle, valor, vencimiento).
        </p>

        {/* Sub-nav */}
        <div className="flex flex-wrap gap-2 mb-8 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
          {NAV_LINKS.map((l) => {
            const href = l.href ? `/admin/events/${eventId}/${l.href}` : `/admin/events/${eventId}`;
            const active = l.href === "collections";
            return (
              <Link key={l.href} href={href}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition"
                style={{ background: active ? "#C0392B" : "transparent", color: active ? "#fff" : "rgba(255,255,255,0.5)" }}>
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* Existing categories */}
        {isLoading ? (
          <div className="space-y-3 mb-8">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
            ))}
          </div>
        ) : collections.length > 0 ? (
          <div className="space-y-3 mb-8">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Categorías existentes</p>
            {collections.map((col) => (
              <div key={col._id} className="rounded-xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-white font-semibold">{col.name}</p>
                    {col.description && <p className="text-white/40 text-xs mt-0.5">{col.description}</p>}
                    <p className="text-white/30 text-xs mt-0.5">
                      {col.itemSchema.fields.length === 0
                        ? "Sin datos adicionales"
                        : `${col.itemSchema.fields.length} dato(s) adicional(es) por premio`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {col.itemSchema.fields.length > 0 && (
                      <button
                        onClick={() => setExpandedId(expandedId === col._id ? null : col._id)}
                        className="px-3 py-1.5 rounded-lg text-white/50 hover:text-white text-xs border border-white/10 hover:bg-white/10 transition">
                        {expandedId === col._id ? "Cerrar" : "Ver datos extra"}
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm(`¿Eliminar la categoría "${col.name}"?`)) deleteMutation.mutate(col._id); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80"
                      style={{ background: "#e74c3c22", color: "#e74c3c", border: "1px solid #e74c3c44" }}>
                      Eliminar
                    </button>
                  </div>
                </div>
                {expandedId === col._id && col.itemSchema.fields.length > 0 && (
                  <div className="px-5 pb-4 border-t border-white/5">
                    <p className="text-white/30 text-xs mt-3 mb-2">Datos adicionales configurados para los premios de esta categoría:</p>
                    <table className="w-full text-xs mt-1">
                      <thead>
                        <tr className="text-white/40">
                          <th className="text-left pb-2">Campo</th>
                          <th className="text-left pb-2">Título visible</th>
                          <th className="text-left pb-2">Tipo</th>
                          <th className="text-left pb-2">Lista de premios</th>
                          <th className="text-left pb-2">Pantalla ganador</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/70">
                        {col.itemSchema.fields.map((f) => (
                          <tr key={f.key} className="border-t border-white/5">
                            <td className="py-1.5 font-mono text-white/50">{f.key}</td>
                            <td className="py-1.5 font-medium">{f.label}</td>
                            <td className="py-1.5">{FIELD_TYPE_LABELS[f.type]}</td>
                            <td className="py-1.5">{f.showInCard ? "✓ Sí" : "—"}</td>
                            <td className="py-1.5">{f.showInWin ? "✓ Sí" : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 mb-8 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-white/30 text-sm">Todavía no hay categorías. Creá la primera acá abajo.</p>
            <p className="text-white/20 text-xs mt-1">Ejemplo: "Indumentaria", "Vouchers", "Electrónica"</p>
          </div>
        )}

        {/* Create form */}
        <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-white font-bold mb-1">Nueva categoría</h2>
          <p className="text-white/40 text-xs mb-5">
            Una categoría agrupa premios del mismo tipo. Podés tener una sola categoría general o varias según los premios del evento.
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-white/60 text-xs mb-1 block">Nombre de la categoría *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="ej: Indumentaria, Vouchers, Electrónica, Premios generales…"
                className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                style={INPUT}
              />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Descripción interna (opcional)</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="ej: Camisetas y gorras del mundial. Solo para referencia interna."
                className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                style={INPUT}
              />
            </div>
          </div>

          {/* Extra fields section */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-white/80 text-sm font-semibold">Datos adicionales por premio</h3>
                <p className="text-white/30 text-xs mt-0.5">Opcional — solo si los premios de esta categoría tienen información extra</p>
              </div>
              <button
                onClick={addField}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/70 hover:text-white border border-white/10 hover:bg-white/10 transition">
                + Agregar dato
              </button>
            </div>

            {fields.length === 0 ? (
              <InfoBox>
                <strong className="text-white/80">¿Cuándo agregar datos extra?</strong>
                <br />
                Si los premios de esta categoría tienen información específica que querés mostrar al jugador.
                <br /><br />
                Ejemplos:
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  <li>Categoría <em>Indumentaria</em> → dato <strong>Talle</strong> (texto: S, M, L, XL)</li>
                  <li>Categoría <em>Vouchers</em> → dato <strong>Valor</strong> (número: 5000)</li>
                  <li>Categoría <em>Vouchers</em> → dato <strong>Vencimiento</strong> (texto: 31/12/2026)</li>
                  <li>Categoría <em>Electrónica</em> → dato <strong>Modelo</strong> (texto: iPhone 15 Pro)</li>
                </ul>
                <br />
                Si los premios son simples (nombre + imagen) y no necesitás info extra, dejá esto vacío.
              </InfoBox>
            ) : (
              <div className="space-y-3 mt-3">
                {fields.map((field, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="text-white/40 text-xs mb-1 block">
                          Nombre interno
                          <span className="text-white/20 ml-1">(sin espacios)</span>
                        </label>
                        <input
                          value={field.key}
                          onChange={(e) => updateField(i, { key: e.target.value.toLowerCase().replace(/\s/g, "_") })}
                          placeholder="ej: talle"
                          className="w-full px-2 py-1.5 rounded-lg text-white text-xs outline-none font-mono"
                          style={{ ...INPUT, border: !field.key.trim() ? "1px solid #e74c3c88" : INPUT.border }}
                        />
                        {!field.key.trim() && <p className="text-red-400 text-xs mt-0.5">Requerido</p>}
                      </div>
                      <div>
                        <label className="text-white/40 text-xs mb-1 block">
                          Título visible
                          <span className="text-white/20 ml-1">(para el jugador)</span>
                        </label>
                        <input
                          value={field.label}
                          onChange={(e) => updateField(i, { label: e.target.value })}
                          placeholder="ej: Talle"
                          className="w-full px-2 py-1.5 rounded-lg text-white text-xs outline-none"
                          style={{ ...INPUT, border: !field.label.trim() ? "1px solid #e74c3c88" : INPUT.border }}
                        />
                        {!field.label.trim() && <p className="text-red-400 text-xs mt-0.5">Requerido</p>}
                      </div>
                      <div>
                        <label className="text-white/40 text-xs mb-1 block">Tipo de dato</label>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(i, { type: e.target.value as typeof FIELD_TYPES[number] })}
                          className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                          style={SELECT_STYLE}>
                          {FIELD_TYPES.map((t) => (
                            <option key={t} value={t} style={{ background: "#1a1a2e" }}>
                              {FIELD_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => removeField(i)}
                          className="w-full py-1.5 rounded-lg text-xs text-red-400 border border-red-400/20 hover:bg-red-400/10 transition">
                          Quitar
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 text-white/50 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.showInCard}
                          onChange={(e) => updateField(i, { showInCard: e.target.checked })}
                          className="accent-red-500"
                        />
                        <span>
                          Mostrar en lista de premios
                          <span className="text-white/25 block text-xs leading-tight">(página /premios del evento)</span>
                        </span>
                      </label>
                      <label className="flex items-center gap-2 text-white/50 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.showInWin}
                          onChange={(e) => updateField(i, { showInWin: e.target.checked })}
                          className="accent-red-500"
                        />
                        <span>
                          Mostrar al ganar
                          <span className="text-white/25 block text-xs leading-tight">(pantalla de ganador)</span>
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {fields.some((f) => !f.key.trim() || !f.label.trim()) && (
            <p className="text-red-400 text-xs mb-2 text-center">
              Completá el nombre interno y el título de todos los datos adicionales
            </p>
          )}
          {form.name.trim().length < 2 && form.name.length > 0 && (
            <p className="text-red-400 text-xs mb-2 text-center">
              El nombre de la categoría debe tener al menos 2 caracteres
            </p>
          )}
          <button
            onClick={() => createMutation.mutate()}
            disabled={
              form.name.trim().length < 2 ||
              fields.some((f) => !f.key.trim() || !f.label.trim()) ||
              createMutation.isPending
            }
            className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #C0392B, #922b21)" }}>
            {createMutation.isPending ? "Creando..." : "Crear categoría"}
          </button>
        </div>
      </div>
    </div>
  );
}
