import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendOtpEmail(to, code) {
  const t = getTransporter();
  const info = await t.sendMail({
    from: process.env.SMTP_FROM || "SecureNotes <noreply@securenotes.local>",
    to,
    subject: "Your SecureNotes login code",
    text: `Your verification code is: ${code}\nIt expires in 5 minutes.`,
    html: `<div style="font-family:sans-serif;padding:24px;background:#0f172a;color:#fff;border-radius:12px;max-width:480px;margin:auto">
      <h2>SecureNotes 🔐</h2>
      <p>Your verification code is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#1e293b;padding:16px;text-align:center;border-radius:8px;margin:16px 0">${code}</div>
      <p style="color:#94a3b8;font-size:14px">This code expires in 5 minutes. If you didn't request it, ignore this email.</p>
    </div>`,
  });

  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log("📧 Email preview URL:", preview);
  return info;
}