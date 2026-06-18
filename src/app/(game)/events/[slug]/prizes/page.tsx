"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { GameEvent, Collection, Item } from "@/types/models";

function ItemsGrid({ items, cardFields }: { items: Item[]; cardFields: { key: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item._id}
          className="rounded-xl overflow-hidden transition hover:scale-105"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div className="relative h-36">
            <Image src={item.imageURL} alt={item.name} fill className="object-cover" sizes="200px" />
          </div>
          <div className="p-3">
            <p className="font-bold text-white text-sm truncate">{item.name}</p>
            {cardFields.map((f) => {
              const val = item.metadata[f.key];
              if (!val) return null;
              return (
                <p key={f.key} className="text-white/50 text-xs mt-0.5">
                  {f.label}: {String(val)}
                </p>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PrizesPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: eventData } = useQuery<{ data: { event: GameEvent; collections: Collection[] } }>({
    queryKey: ["event", slug],
    queryFn: () => axios.get(`/api/v1/events/${slug}`).then((r) => r.data),
  });

  const event = eventData?.data?.event;
  const collections = eventData?.data?.collections ?? [];

  const { data: itemsData } = useQuery<{ data: Item[] }>({
    queryKey: ["items-all", event?._id],
    queryFn: () => axios.get(`/api/v1/events/${event!._id}/items`).then((r) => r.data),
    enabled: !!event,
  });

  const items = itemsData?.data ?? [];

  const bg = event
    ? `linear-gradient(145deg, ${event.theme.backgroundColor} 0%, #16213e 100%)`
    : "linear-gradient(145deg, #1a1a2e, #16213e)";

  const primary = event?.theme.primaryColor ?? "#C0392B";

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/events/${slug}`} className="text-white/60 hover:text-white transition text-sm">
            ← Volver al juego
          </Link>
          <h1 className="text-3xl font-black text-white">Premios disponibles</h1>
        </div>

        {items.length === 0 && (
          <div className="text-center text-white/50 mt-20">
            <p className="text-5xl mb-4">🎁</p>
            <p>No hay premios configurados aún.</p>
          </div>
        )}

        {/* Items grouped by collection when collections exist */}
        {collections.length > 0 && collections.map((col) => {
          const colItems = items.filter((i) => i.collectionId === col._id);
          if (!colItems.length) return null;

          const cardFields = col.itemSchema.fields.filter((f) => f.showInCard);

          return (
            <div key={col._id} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                {col.imageURL && (
                  <Image src={col.imageURL} alt={col.name} width={36} height={36} className="rounded-full object-cover" />
                )}
                <h2 className="text-xl font-bold text-white">{col.name}</h2>
                <span className="text-white/40 text-sm">({colItems.length} premios)</span>
              </div>
              <ItemsGrid items={colItems} cardFields={cardFields} />
            </div>
          );
        })}

        {/* Fallback: show all items flat when no collections are configured */}
        {collections.length === 0 && items.length > 0 && (
          <ItemsGrid items={items} cardFields={[]} />
        )}

        <div className="text-center mt-10">
          <Link
            href={`/events/${slug}`}
            className="inline-block px-10 py-3 rounded-full text-white font-bold text-lg"
            style={{ background: `linear-gradient(135deg, ${primary}, #D4AC0D)` }}
          >
            Jugar ahora
          </Link>
        </div>
      </div>
    </div>
  );
}
