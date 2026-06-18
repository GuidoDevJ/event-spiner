import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST ?? "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT ?? 465),
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/auth/verify?token=${token}`;
  await transporter.sendMail({
    from: `"EventSpin" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verificá tu cuenta — EventSpin",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2>¡Bienvenido a EventSpin!</h2>
        <p>Hacé clic en el siguiente botón para activar tu cuenta:</p>
        <a href="${url}" style="display:inline-block;background:#C0392B;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Verificar cuenta
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px;">Este link expira en 24 horas.</p>
      </div>
    `,
  });
}

export async function sendInviteEmail(to: string, token: string, orgName: string): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/admin/accept-invite?token=${token}`;
  await transporter.sendMail({
    from: `"EventSpin" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Invitación a ${orgName} — EventSpin`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2>Te invitaron a ${orgName}</h2>
        <p>Aceptá la invitación para acceder al panel de administración:</p>
        <a href="${url}" style="display:inline-block;background:#C0392B;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Aceptar invitación
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px;">Este link expira en 48 horas.</p>
      </div>
    `,
  });
}
