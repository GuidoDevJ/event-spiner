"use client";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { Collection, Item } from "@/types/models";
import toast from "react-hot-toast";

export default function ItemsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const [selectedCol, setSelectedCol] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", imageURL: "", weight: 50, metadata: {} as Record<string, string> });

  const { data: colsData } = useQuery<{ data: Collection[] }>({
    queryKey: ["collections", eventId],
    queryFn: () => apiClient.get(`/api/v1/events/${eventId}/collections`).then((r) => r.data),
    enabled: !!accessToken,
  });

  const { data: itemsData } = useQuery<{ data: Item[] }>({
    queryKey: ["items", eventId, selectedCol],
    queryFn: () => apiClient.get(`/api/v1/events/${eventId}/items`, {
      params: selectedCol ? { collectionId: selectedCol } : {},
    }).then((r) => r.data),
    enabled: !!accessToken,
  });

  const collections = colsData?.data ?? [];
  const items = itemsData?.data ?? [];

  const currentCol = collections.find((c) => c._id === selectedCol);
  const schemaFields = currentCol?.itemSchema?.fields ?? [];

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => apiClient.delete(`/api/v1/events/${eventId}/items/${itemId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["items"] }); toast.success("Item eliminado"); },
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof newItem & { collectionId: string }) =>
      apiClient.post(`/api/v1/events/${eventId}/items`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      toast.success("Item creado");
      setNewItem({ name: "", imageURL: "", weight: 50, metadata: {} });
    },
    onError: () => toast.error("Error al crear"),
  });

  const uploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "items");
    const res = await apiClient.post("/api/v1/uploads/image", fd);
    return res.data.data.url;
  };

  const bulkImport = async (file: File) => {
    if (!selectedCol) return toast.error("Seleccioná una colección primero");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("collectionId", selectedCol);
    try {
      setUploading(true);
      const res = await apiClient.post(`/api/v1/events/${eventId}/items/bulk`, fd);
      const { inserted, total } = res.data.data;
      toast.success(`Importados ${inserted}/${total} items`);
      qc.invalidateQueries({ queryKey: ["items"] });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al importar";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "#0f0f1a" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/admin/events/${eventId}`} className="text-white/40 hover:text-white transition">←</Link>
          <h1 className="text-2xl font-black text-white">Items / Premios</h1>
        </div>

        {/* Collection selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setSelectedCol("")}
            className="px-4 py-2 rounded-full text-sm transition"
            style={{ background: !selectedCol ? "#C0392B" : "rgba(255,255,255,0.07)", color: "#fff" }}>
            Todos
          </button>
          {collections.map((c) => (
            <button key={c._id} onClick={() => setSelectedCol(c._id)}
              className="px-4 py-2 rounded-full text-sm transition"
              style={{ background: selectedCol === c._id ? "#C0392B" : "rgba(255,255,255,0.07)", color: "#fff" }}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Bulk import */}
        {selectedCol && (
          <div className="rounded-2xl p-5 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 className="text-white font-bold mb-3">Importación masiva (CSV)</h3>
            <p className="text-white/40 text-xs mb-3">
              Columnas requeridas: <code className="text-white/60">nombre, imageURL, peso</code>{" "}
              + {schemaFields.map((f) => <code key={f.key} className="text-white/60 mr-1">{f.key}</code>)}
            </p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) bulkImport(e.target.files[0]); }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition hover:opacity-80"
              style={{ background: "#2980b9" }}>
              {uploading ? "Importando..." : "Seleccionar CSV"}
            </button>
          </div>
        )}

        {/* Add item form */}
        {selectedCol && (
          <div className="rounded-2xl p-5 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 className="text-white font-bold mb-4">Agregar item</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs block mb-1">Nombre *</label>
                <input value={newItem.name} onChange={(e) => setNewItem(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
              </div>
              <div>
                <label className="text-white/60 text-xs block mb-1">Peso (1-100)</label>
                <input type="number" min={1} max={100} value={newItem.weight}
                  onChange={(e) => setNewItem(p => ({ ...p, weight: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-white/60 text-xs block mb-1">Imagen *</label>
                <div className="flex gap-2 items-center">
                  <input value={newItem.imageURL} readOnly placeholder="URL de la imagen"
                    className="flex-1 px-3 py-2 rounded-lg text-white text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
                  <input ref={imgRef} type="file" accept="image/*" className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploading(true);
                      const url = await uploadImage(f);
                      setNewItem(p => ({ ...p, imageURL: url }));
                      setUploading(false);
                    }} />
                  <button onClick={() => imgRef.current?.click()} disabled={uploading}
                    className="px-3 py-2 rounded-lg text-white text-xs border border-white/10 hover:bg-white/10 transition">
                    {uploading ? "..." : "Subir"}
                  </button>
                </div>
              </div>
              {schemaFields.map((f) => (
                <div key={f.key}>
                  <label className="text-white/60 text-xs block mb-1">{f.label}</label>
                  <input value={newItem.metadata[f.key] ?? ""}
                    onChange={(e) => setNewItem(p => ({ ...p, metadata: { ...p.metadata, [f.key]: e.target.value } }))}
                    className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
                </div>
              ))}
            </div>
            <button
              onClick={() => createMutation.mutate({ ...newItem, collectionId: selectedCol })}
              disabled={!newItem.name || !newItem.imageURL || createMutation.isPending}
              className="mt-4 px-5 py-2 rounded-xl text-white font-semibold text-sm disabled:opacity-50 transition hover:opacity-80"
              style={{ background: "#27ae60" }}>
              Agregar item
            </button>
          </div>
        )}

        {/* Items grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item._id} className="rounded-xl overflow-hidden group"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="relative h-32">
                <Image src={item.imageURL} alt={item.name} fill className="object-cover" sizes="200px" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  style={{ background: "rgba(0,0,0,0.6)" }}>
                  <button onClick={() => deleteMutation.mutate(item._id)}
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-bold"
                    style={{ background: "#e74c3c" }}>
                    Eliminar
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-white font-semibold text-sm truncate">{item.name}</p>
                <p className="text-white/30 text-xs">Peso: {item.weight}</p>
              </div>
            </div>
          ))}
          {!items.length && (
            <div className="col-span-4 text-center py-12 text-white/30">
              No hay items. {selectedCol ? "Agregá uno arriba o importá un CSV." : "Seleccioná una colección."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
