// Edge Function: notify-application
// Triggered by a Database Webhook whenever a row is INSERTed into
// public.applications. It emails the applicant's details via Resend.
//
// Only RESEND_API_KEY is a secret (set it in the dashboard:
// Edge Functions -> Secrets). The recipient is hardcoded below.

// `declare` gives the local editor types for Deno globals; it produces no
// runtime code, so it's harmless when the function actually runs on Deno.
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

// ---- Configuration -----------------------------------------
// The address that receives notification emails. Change this to whatever
// account you want. NOTE (Resend test mode): until you verify a domain,
// this MUST be the email you signed up to Resend with, and NOTIFY_FROM
// must stay onboarding@resend.dev.
const NOTIFY_TO = "s@gmail.com";
const NOTIFY_FROM = "onboarding@resend.dev";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

interface ApplicationRecord {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  experience: string;
  cover_letter: string | null;
  resume_path: string | null;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: ApplicationRecord;
}

Deno.serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();

    // Only act on new applications.
    if (payload.type !== "INSERT") {
      return new Response("Ignored (not an insert)", { status: 200 });
    }

    const a = payload.record;

    const html = `
      <h2>New job application</h2>
      <table cellpadding="6" style="font-family: sans-serif; font-size: 14px;">
        <tr><td><strong>Name</strong></td><td>${escape(a.name)}</td></tr>
        <tr><td><strong>Email</strong></td><td>${escape(a.email)}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${escape(a.phone)}</td></tr>
        <tr><td><strong>Position</strong></td><td>${escape(a.position)}</td></tr>
        <tr><td><strong>Experience</strong></td><td>${escape(a.experience)}</td></tr>
        <tr><td valign="top"><strong>Cover letter</strong></td><td>${escape(a.cover_letter ?? "—")}</td></tr>
      </table>
      <p style="color:#666;font-size:12px;">Submitted ${new Date(a.created_at).toLocaleString()}. View the resume in your admin dashboard.</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: NOTIFY_TO,
        subject: `New application: ${a.name} — ${a.position}`,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend error:", detail);
      return new Response(`Email failed: ${detail}`, { status: 502 });
    }

    return new Response("Notification sent", { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    return new Response(`Error: ${message}`, { status: 500 });
  }
});

// Minimal HTML escaping so applicant text can't break the email markup.
function escape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
