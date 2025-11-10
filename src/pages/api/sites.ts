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

function to12h(time: string): string {
  const m = String(time ?? '').match(/^(\d{2}):(\d{2})$/);
  if (!m) return time;
  let h = Number(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}

function formatOpenHours(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const obj = JSON.parse(value);
    const order = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const labels: Record<string,string> = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };
    if (typeof obj === 'object' && obj) {
      const parts: string[] = [];
      for (const d of order) {
        const slots = Array.isArray(obj[d]) ? obj[d] : [];
        if (!slots.length) continue;
        const ranges = slots.map((s: any) => `${to12h(s?.open ?? '')}–${to12h(s?.close ?? '')}`).join(', ');
        parts.push(`${labels[d]} ${ranges}`);
      }
      if (parts.length) return parts.join(' · ');
    }
  } catch {}
  // Fallback: plain string passed through
  return value || undefined;
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
          hours: formatOpenHours(r.open_hours ?? undefined),
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


