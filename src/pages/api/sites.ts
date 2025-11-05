import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../lib/supabase";

export const prerender = false;

type Site = {
  slug: string;
  name: string;
  type: 'drop-off' | 'pick-up' | 'both';
  category: string;
  address: string;
  city: string;
  zip: string;
  phone?: string;
  hours?: string;
  lat?: number;
  lng?: number;
};

function inferType(r: any): Site['type'] | null {
  const drop = !!r.offer_dropoff;
  const pick = !!r.offer_pickup;
  const both = !!r.offer_both;
  if (both || (drop && pick)) return 'both';
  if (drop) return 'drop-off';
  if (pick) return 'pick-up';
  return null;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const city = (url.searchParams.get('city') || '').trim();

    const query = supabaseAdmin
      .from('partner_registrations')
      .select(
        [
          'id',
          'org',
          'address',
          'city',
          'zip',
          'phone',
          'open_hours',
          'business_type',
          'offer_dropoff',
          'offer_pickup',
          'offer_both',
        ].join(', ')
      );

    const { data, error } = city
      ? await query.ilike('city', city)
      : await query;

    if (error) {
      console.error('Supabase select error', error);
      return new Response('Server error', { status: 500 });
    }

    const sites: Site[] = (data || [])
      .map((r: any) => {
        const type = inferType(r);
        if (!type) return null;
        const site: Site = {
          slug: r.id,
          name: r.org,
          type,
          category: r.business_type || 'partner',
          address: r.address,
          city: r.city,
          zip: r.zip,
          phone: r.phone ?? undefined,
          hours: r.open_hours ?? undefined,
        };
        return site;
      })
      .filter(Boolean) as Site[];

    return new Response(JSON.stringify(sites), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('Sites API error', err);
    return new Response('Server error', { status: 500 });
  }
};


