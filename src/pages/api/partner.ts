import type { APIRoute } from "astro";
import { prisma } from "../../lib/prisma";

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/x-www-form-urlencoded")) {
      return new Response("Unsupported Media Type", { status: 415 });
    }

    const form = await request.formData();

    const get = (key: string) => (form.get(key) ?? "").toString().trim();
    const has = (key: string) => form.has(key);

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

    await prisma.partnerRegistration.create({ data });

    return new Response(null, {
      status: 303,
      headers: { Location: "/thanks" },
    });
  } catch (err) {
    console.error("Partner registration error", err);
    return new Response("Server error", { status: 500 });
  }
};






