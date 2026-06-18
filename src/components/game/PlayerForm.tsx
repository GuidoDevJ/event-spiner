"use client";
import { useForm } from "react-hook-form";
import { PlayerDataField } from "@/types/models";

interface Props {
  fields: PlayerDataField[];
  onSubmit: (data: Record<string, string>) => void;
  onClose: () => void;
  primaryColor: string;
}

export default function PlayerForm({ fields, onSubmit, onClose, primaryColor }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<Record<string, string>>();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}>
        <h2 className="text-xl font-bold text-white mb-1">Antes de jugar</h2>
        <p className="text-white/50 text-sm mb-6">Ingresá tus datos para participar.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-white/70 text-sm block mb-1">{f.label}{f.required && " *"}</label>
              <input
                type={f.type}
                {...register(f.key, { required: f.required ? `${f.label} es obligatorio` : false })}
                className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none transition"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: errors[f.key] ? "1px solid #e74c3c" : "1px solid rgba(255,255,255,0.15)",
                }}
              />
              {errors[f.key] && (
                <p className="text-red-400 text-xs mt-1">{errors[f.key]?.message as string}</p>
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-white/60 text-sm border border-white/10 hover:bg-white/5 transition">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, #D4AC0D)` }}>
              Jugar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
