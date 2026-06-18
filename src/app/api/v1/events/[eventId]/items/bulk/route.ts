import { NextRequest } from "next/server";
import Papa from "papaparse";
import { connectDB } from "@/lib/db/connect";
import { Item } from "@/lib/db/models/Item";
import { Collection } from "@/lib/db/models/Collection";
import { created, err, notFound, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const orgId = req.headers.get("x-org-id");
    if (!orgId) return err("Unauthorized", 401);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const collectionId = formData.get("collectionId") as string | null;

    if (!file) return err("No file provided");
    if (!collectionId) return err("collectionId is required");
    if (!file.name.endsWith(".csv")) return err("Only CSV files are supported");

    const text = await file.text();

    await connectDB();

    const collection = await Collection.findOne({ _id: collectionId, eventId, organizationId: orgId });
    if (!collection) return notFound("Collection not found");

    const schemaKeys = collection.itemSchema.fields.map((f) => f.key);

    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });

    if (result.errors.length > 0) {
      return err(`CSV parse error: ${result.errors[0].message}`);
    }

    const rows = result.data;
    if (!rows.length) return err("CSV file is empty");

    // Validate required columns
    const firstRow = rows[0];
    if (!firstRow.nombre && !firstRow.name) return err("CSV must have a 'nombre' or 'name' column");
    if (!firstRow.imageurl && !firstRow.image_url) return err("CSV must have an 'imageURL' or 'image_url' column");

    const items = rows.map((row) => {
      const name = row.nombre ?? row.name ?? "";
      const imageURL = row.imageurl ?? row.image_url ?? "";
      const weight = parseInt(row.peso ?? row.weight ?? "50", 10) || 50;

      const metadata: Record<string, string | number> = {};
      for (const key of schemaKeys) {
        if (row[key] !== undefined) {
          metadata[key] = row[key];
        }
      }

      return { name, imageURL, weight, metadata, collectionId, eventId, organizationId: orgId };
    });

    const inserted = await Item.insertMany(items, { ordered: false });
    return created({ inserted: inserted.length, total: rows.length });
  } catch (e) {
    return serverError(e);
  }
}
