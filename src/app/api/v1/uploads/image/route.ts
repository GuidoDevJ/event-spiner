import { NextRequest } from "next/server";
import { uploadImage } from "@/lib/cloudinary";
import { ok, err, serverError } from "@/lib/api-response";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB — Vercel hard cap is 4.5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-org-id");
    if (!orgId) return err("Unauthorized", 401);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) ?? "eventspin";

    if (!file) return err("No file provided");
    if (!ALLOWED_TYPES.includes(file.type)) return err("Unsupported file type");
    if (file.size > MAX_SIZE) return err("File exceeds 4MB limit");

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadImage(buffer, `eventspin/${folder}`);

    return ok({ url });
  } catch (e) {
    return serverError(e);
  }
}
