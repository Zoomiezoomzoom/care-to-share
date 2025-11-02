import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response("Use POST /api/contact to submit the form.", {
    status: 405,
    headers: { Allow: "POST" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") || "";

    let get: (key: string) => string;
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      get = (key: string) => (form.get(key) ?? "").toString().trim();
    } else if (contentType.includes("application/json")) {
      const json = await request.json();
      get = (key: string) => (json?.[key] ?? "").toString().trim();
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      get = (key: string) => (params.get(key) ?? "").toString().trim();
    }

    const org = get("org");
    const contactType = get("contact_type") || "individual";
    const name = get("name");
    const email = get("email");
    const phone = get("phone");
    const message = get("message");
    const honeypot = get("website");

    if (honeypot) {
      return new Response(null, { status: 303, headers: { Location: "/message-sent" } });
    }
    if (!name || !email || !message) {
      return new Response("Missing required fields", { status: 400 });
    }

    const RESEND_API_KEY = (import.meta as any).env?.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
    const CONTACT_TO_EMAIL = (import.meta as any).env?.CONTACT_TO_EMAIL ?? process.env.CONTACT_TO_EMAIL;
    const CONTACT_FROM_EMAIL = (import.meta as any).env?.CONTACT_FROM_EMAIL ?? process.env.CONTACT_FROM_EMAIL ?? "onboarding@resend.dev";

    if (!RESEND_API_KEY || !CONTACT_TO_EMAIL) {
      console.error("Contact email not configured. Set RESEND_API_KEY and CONTACT_TO_EMAIL env vars.");
      return new Response("Server error", { status: 500 });
    }

    const subject = `New contact form message from ${name}`;
    const text = `Contact type: ${contactType}\nOrganization: ${org || "(not provided)"}\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "(not provided)"}\n\nMessage:\n${message}`;
    const html = `<div style="font-family:system-ui,Segoe UI,Roboto,Arial">
  <h2 style="margin:0 0 12px 0">New contact form message</h2>
  <p><strong>Contact type:</strong> ${contactType}</p>
  <p><strong>Organization:</strong> ${org || "(not provided)"}</p>
  <p><strong>Name:</strong> ${name}</p>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Phone:</strong> ${phone || "(not provided)"}</p>
  <pre style="white-space:pre-wrap;line-height:1.5">${message}</pre>
</div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: CONTACT_FROM_EMAIL, to: CONTACT_TO_EMAIL, subject, text, html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Resend API error", res.status, body);
      return new Response("Server error", { status: 500 });
    }

    return new Response(null, {
      status: 303,
      headers: { Location: "/message-sent" },
    });
  } catch (err) {
    console.error("Contact submit error", err);
    return new Response("Server error", { status: 500 });
  }
};


