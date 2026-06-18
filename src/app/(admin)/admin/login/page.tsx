"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

interface LoginForm { email: string; password: string; }

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await axios.post("/api/v1/auth/login", data);
      const { accessToken, user } = res.data.data;
      setAuth(accessToken, user);
      router.push("/admin");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al ingresar";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(145deg, #1a1a2e, #16213e, #0f3460)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">EventSpin</h1>
          <p className="text-white/50 mt-1 text-sm">Panel de Administración</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl p-8 space-y-5"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div>
            <label className="text-white/70 text-sm block mb-1.5">Email</label>
            <input
              type="email"
              {...register("email", { required: "Email obligatorio" })}
              className="w-full px-4 py-3 rounded-xl text-white outline-none text-sm"
              style={{ background: "rgba(255,255,255,0.07)", border: errors.email ? "1px solid #e74c3c" : "1px solid rgba(255,255,255,0.15)" }}
              placeholder="admin@empresa.com"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-white/70 text-sm block mb-1.5">Contraseña</label>
            <input
              type="password"
              {...register("password", { required: "Contraseña obligatoria" })}
              className="w-full px-4 py-3 rounded-xl text-white outline-none text-sm"
              style={{ background: "rgba(255,255,255,0.07)", border: errors.password ? "1px solid #e74c3c" : "1px solid rgba(255,255,255,0.15)" }}
              placeholder="••••••••"
            />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold tracking-wide disabled:opacity-50 transition"
            style={{ background: "linear-gradient(135deg, #C0392B, #922b21)" }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
