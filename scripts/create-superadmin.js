/**
 * Crea el primer superadmin y su organización.
 * Uso: node scripts/create-superadmin.mjs
 *
 * Requiere las variables de entorno de .env.local
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import readline from "readline/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI no está definido en .env.local");
  process.exit(1);
}

// ── Schemas inline (sin depender del transpilador de Next.js) ──────────────

const OrgSchema = new mongoose.Schema({
  name: String,
  slug: String,
  plan: { type: String, default: "enterprise" },
  maxEvents: { type: Number, default: 999 },
  maxItemsPerEvent: { type: Number, default: 999 },
  features: [String],
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  organizationId: mongoose.Schema.Types.ObjectId,
  email: { type: String, unique: true, lowercase: true },
  passwordHash: String,
  role: { type: String, default: "super_admin" },
  status: { type: String, default: "active" },
}, { timestamps: true });

const Organization = mongoose.models.Organization ?? mongoose.model("Organization", OrgSchema);
const User = mongoose.models.User ?? mongoose.model("User", UserSchema);

// ── Lectura interactiva ────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("\n╔══════════════════════════════════════╗");
console.log("║   EventSpin — Crear Super Admin      ║");
console.log("╚══════════════════════════════════════╝\n");

const orgName  = await rl.question("Nombre de la organización (ej: Casino Mocana): ");
const email    = await rl.question("Email del super admin: ");
const password = await rl.question("Contraseña (mín 8 chars): ");
rl.close();

if (!orgName.trim() || !email.trim() || password.length < 8) {
  console.error("\n❌  Datos inválidos. La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}

// ── Conectar y crear ───────────────────────────────────────────────────────

console.log("\n🔌  Conectando a MongoDB...");
await mongoose.connect(MONGODB_URI);
console.log("✅  Conectado.\n");

// Org
const slug = orgName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
let org = await Organization.findOne({ slug });
if (!org) {
  org = await Organization.create({ name: orgName.trim(), slug });
  console.log(`✅  Organización creada: "${org.name}" (${org._id})`);
} else {
  console.log(`ℹ️   Organización existente reutilizada: "${org.name}" (${org._id})`);
}

// User
const existing = await User.findOne({ email: email.toLowerCase().trim() });
if (existing) {
  console.error(`\n❌  Ya existe un usuario con el email "${email}".`);
  await mongoose.disconnect();
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);
const user = await User.create({
  organizationId: org._id,
  email: email.toLowerCase().trim(),
  passwordHash,
  role: "super_admin",
  status: "active",
});

console.log(`\n✅  Super admin creado:`);
console.log(`   ID:    ${user._id}`);
console.log(`   Email: ${user.email}`);
console.log(`   Rol:   ${user.role}`);
console.log(`   Org:   ${org.name}\n`);
console.log("🚀  Podés iniciar sesión en /admin/login\n");

await mongoose.disconnect();
