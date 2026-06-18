"use client";
import Image from "next/image";

interface Props {
  code: string;
  qrDataURL: string;
  onCopy: () => void;
  copied: boolean;
  primaryColor: string;
}

export default function QRDisplay({ code, qrDataURL, onCopy, copied, primaryColor }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
      <p className="text-white/60 text-sm uppercase tracking-widest">Tu código de canje</p>

      {/* QR */}
      <div className="bg-white p-3 rounded-xl">
        <Image src={qrDataURL} alt="QR Code" width={160} height={160} />
      </div>

      {/* Code text */}
      <button
        onClick={onCopy}
        className="font-mono text-2xl font-black tracking-widest text-white px-6 py-3 rounded-xl transition hover:scale-105 active:scale-95"
        style={{ background: "rgba(255,255,255,0.1)", border: `2px solid ${primaryColor}` }}
        title="Copiar código"
      >
        {code}
      </button>

      <p className="text-sm transition-all"
        style={{ color: copied ? "#27ae60" : "rgba(255,255,255,0.4)" }}>
        {copied ? "✓ ¡Código copiado!" : "Tocá para copiar · Mostrá el QR al staff"}
      </p>
    </div>
  );
}
