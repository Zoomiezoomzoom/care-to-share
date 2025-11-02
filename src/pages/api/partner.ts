import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../lib/supabase";

// Ensure this endpoint runs at request time (needed for POST in static sites)
export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response("Use POST /api/partner to submit the form.", {
    status: 405,
    headers: { Allow: "POST" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") || "";

    // Parse body with graceful fallbacks
    let get: (key: string) => string;
    let has: (key: string) => boolean;

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      get = (key: string) => (form.get(key) ?? "").toString().trim();
      has = (key: string) => form.has(key);
    } else if (contentType.includes("application/json")) {
      const json = await request.json();
      get = (key: string) => (json?.[key] ?? "").toString().trim();
      has = (key: string) => Object.prototype.hasOwnProperty.call(json ?? {}, key);
    } else {
      // Try to treat body as URL-encoded text (common when Content-Type is missing)
      const text = await request.text();
      const params = new URLSearchParams(text);
      get = (key: string) => (params.get(key) ?? "").toString().trim();
      has = (key: string) => params.has(key);
    }

    const data = {
      org: get("org"),
      name: get("name"),
      email: get("email"),
      phone: get("phone"),
      address: get("address"),
      city: get("city"),
      zip: get("zip"),

      businessType: get("business_type") || (get("business_type_other") ? "Other" : ""),
      businessTypeOther: get("business_type_other") || null,

      offerDropoff: has("offer_dropoff"),
      offerPickup: has("offer_pickup"),
      offerBoth: has("offer_both"),
      openHours: get("open_hours"),

      duration: get("duration") || null,
      durationDates: get("duration_dates") || null,

      storageSpace: get("storage_space") || null,

      additionalInfo: get("additional_info") || null,

      ackParticipation: has("ack_participation"),
      ackFollowup: has("ack_followup"),
    };

    // Basic validation
    const required = [
      data.org,
      data.name,
      data.email,
      data.phone,
      data.address,
      data.city,
      data.zip,
      data.openHours,
    ];
    if (required.some((v) => !v)) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Map to Supabase table column names
    const record = {
      id: (globalThis as any).crypto?.randomUUID?.() ? crypto.randomUUID() : undefined,
      submitted_at: new Date().toISOString(),
      org: data.org,
      contact_name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      zip: data.zip,
      business_type: data.businessType,
      business_type_other: data.businessTypeOther,
      offer_dropoff: data.offerDropoff,
      offer_pickup: data.offerPickup,
      offer_both: data.offerBoth,
      open_hours: data.openHours,
      duration: data.duration,
      duration_dates: data.durationDates,
      storage_space: data.storageSpace,
      additional_info: data.additionalInfo,
      user_agent: request.headers.get("user-agent") || null,
    } as const;

    const { error } = await supabaseAdmin
      .from("partner_registrations")
      .insert([record]);

    if (error) {
      console.error("Supabase insert error", error);
      return new Response("Server error", { status: 500 });
    }

    return new Response(null, {
      status: 303,
      headers: { Location: "/thanks" },
    });
  } catch (err) {
    console.error("Partner registration error", err);
    return new Response("Server error", { status: 500 });
  }
};






