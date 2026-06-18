import QRCode from "qrcode";

export async function generateQRDataURL(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 256,
    margin: 2,
    color: { dark: "#1a1a2e", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

export function buildQRContent(eventSlug: string, code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/events/${eventSlug}/validate/${code}`;
}
