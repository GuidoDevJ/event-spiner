import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { Organization } from "@/lib/db/models/Organization";
import { hashPassword } from "@/lib/auth/password";
import { signAccessToken } from "@/lib/auth/jwt";
import { sendVerificationEmail } from "@/lib/email";
import { ok, err, conflict, serverError } from "@/lib/api-response";
import { authLimiter } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2).optional(),
});

export async function POST(req: NextRequest) {
  const limit = authLimiter.check(req);
  if (!limit.success) return err("Too many requests", 429);

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const { email, password, organizationName } = parsed.data;

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) return conflict("Email already registered");

    // Create a default org if provided
    let org = await Organization.findOne({}).sort({ createdAt: 1 });
    if (organizationName) {
      const slug = organizationName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      org = await Organization.create({ name: organizationName, slug });
    }
    if (!org) return err("No organization found. Provide organizationName.");

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      organizationId: org._id,
      role: "org_admin",
      status: "inactive",
    });

    const verifyToken = await signAccessToken({
      sub: user._id.toString(),
      email,
      role: user.role,
      orgId: org._id.toString(),
    });

    await sendVerificationEmail(email, verifyToken);

    return ok({ message: "Check your email to verify your account." }, 201);
  } catch (e) {
    return serverError(e);
  }
}
