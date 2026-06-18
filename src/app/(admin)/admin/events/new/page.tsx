"use client";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

interface CreateEventForm {
  name: string;
  slug: string;
  startsAt: string;
  endsAt: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateEventForm>();

  const createMutation = useMutation({
    mutationFn: (body: CreateEventForm) =>
      apiClient.post("/api/v1/events", {
        ...body,
        startsAt: new Date(body.startsAt).toISOString(),
        endsAt: new Date(body.endsAt).toISOString(),
      }),
    onSuccess: (res) => {
      toast.success("Evento creado");
      router.push(`/admin/events/${res.data.data._id}`);
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al crear evento";
      toast.error(msg);
    },
  });

  const nameValue = watch("name");

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  return (
    <div className="min-h-screen" style={{ background: "#0f0f1a" }}>
      <div className="max-w-xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-white/40 hover:text-white transition">←</Link>
          <h1 className="text-2xl font-black text-white">Nuevo Evento</h1>
        </div>

        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="rounded-2xl p-6 space-y-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div>
            <label className="text-white/60 text-xs mb-1 block">Nombre del evento</label>
            <input
              {...register("name", { required: "Requerido" })}
              onChange={(e) => {
                setValue("name", e.target.value);
                setValue("slug", autoSlug(e.target.value));
              }}
              placeholder="Casino Mocana — Ruleta 2025"
              className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-white/60 text-xs mb-1 block">Slug (URL del juego)</label>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-sm">/events/</span>
              <input
                {...register("slug", {
                  required: "Requerido",
                  pattern: { value: /^[a-z0-9-]+$/, message: "Solo minúsculas, números y guiones" },
                })}
                placeholder="casino-mocana-2025"
                className="flex-1 px-3 py-2 rounded-lg text-white text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
            </div>
            {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/60 text-xs mb-1 block">Inicio</label>
              <input
                type="datetime-local"
                {...register("startsAt", { required: "Requerido" })}
                className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", colorScheme: "dark" }}
              />
              {errors.startsAt && <p className="text-red-400 text-xs mt-1">{errors.startsAt.message}</p>}
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Fin</label>
              <input
                type="datetime-local"
                {...register("endsAt", { required: "Requerido" })}
                className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", colorScheme: "dark" }}
              />
              {errors.endsAt && <p className="text-red-400 text-xs mt-1">{errors.endsAt.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full py-3 rounded-xl text-white font-bold tracking-wide disabled:opacity-50 transition"
            style={{ background: "linear-gradient(135deg, #C0392B, #922b21)" }}
          >
            {createMutation.isPending ? "Creando..." : "Crear evento"}
          </button>
        </form>
      </div>
    </div>
  );
}
