import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
// Lightweight shim to satisfy TS when Google Maps types aren't installed
declare const google: any;

type MarkerData = {
  slug?: string; // stable id when available
  lat?: number;
  lng?: number;
  name: string;
  address: string;
  city?: string;
  zip?: string;
  type?: 'drop-off' | 'pick-up' | 'both';
};

type Props = {
  markers: MarkerData[];
  zoom?: number;
  className?: string;
  active?: MarkerData | null;
};

type LatLng = { lat: number; lng: number };

export default function MapView({ markers, zoom = 11, className, active }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const geocoderRef = useRef<any | null>(null);
  const pinsRef = useRef<Map<string, any>>(new Map());
  const fitDebounceRef = useRef<number | null>(null);
  const infoWindowRef = useRef<any | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const center = useMemo<LatLng>(() => {
    const withCoords = markers.filter((m) => m.lat && m.lng);
    if (withCoords.length > 0) {
      const avgLat = withCoords.reduce((a, m) => a + (m.lat as number), 0) / withCoords.length;
      const avgLng = withCoords.reduce((a, m) => a + (m.lng as number), 0) / withCoords.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: 32.2988, lng: -90.1848 }; // Jackson default
  }, [markers]);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current) return;
    const apiKey = import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) return;
    const mapId = (import.meta.env.PUBLIC_GOOGLE_MAPS_MAP_ID as string | undefined) || undefined;

    const loader = new Loader({ apiKey, version: 'weekly' });
    let cancelled = false;

    loader.importLibrary('maps').then(async () => {
      if (cancelled || !mapRef.current) return;
      const mapsLib: any = await (google as any).maps.importLibrary('maps');
      const { Map } = mapsLib;
      const map = new Map(mapRef.current as HTMLDivElement, {
        center,
        zoom,
        // Hide default Google controls; legal attribution will remain as required
        disableDefaultUI: true,
        mapTypeControl: false,
        zoomControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        scaleControl: false,
        clickableIcons: false,
        gestureHandling: 'greedy',
        ...(mapId ? { mapId } : {}),
      });
      mapInstanceRef.current = map;
      geocoderRef.current = new (google as any).maps.Geocoder();
      infoWindowRef.current = new (google as any).maps.InfoWindow();
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      // remove markers
      pinsRef.current.forEach((p) => (p.map = null));
      pinsRef.current.clear();
      setMapReady(false);
    };
  }, []);

  // Debounced fit to current markers
  const scheduleFitToMarkers = () => {
    if (fitDebounceRef.current) {
      window.clearTimeout(fitDebounceRef.current);
    }
    fitDebounceRef.current = window.setTimeout(() => {
      const map = mapInstanceRef.current;
      if (!map) return;
      const all = Array.from(pinsRef.current.values());
      if (all.length === 0) return;
      const bounds = new (google as any).maps.LatLngBounds();
      all.forEach((mk: any) => {
        const pos = mk.position ?? mk.gposition ?? mk.position?.lat ? mk.position : null;
        const lat = mk.getPosition ? mk.getPosition().lat() : (pos?.lat ?? null);
        const lng = mk.getPosition ? mk.getPosition().lng() : (pos?.lng ?? null);
        if (lat != null && lng != null) bounds.extend({ lat, lng });
      });
      // Prefer fitBounds for groups; for 1 marker, pan/zoom for smoother feel
      if (all.length === 1) {
        const p = all[0].getPosition();
        if (p) {
          map.panTo(p);
          map.setZoom(Math.max(map.getZoom?.() ?? 11, 14));
        }
      } else {
        map.fitBounds(bounds);
      }
    }, 200);
  };

  const colorForType = (t?: MarkerData['type']) => {
    if (t === 'drop-off') return '#2563EB'; // blue-600
    if (t === 'pick-up') return '#16A34A';  // green-600
    return '#DC2626'; // both (red-600)
  };

  const letterForType = (t?: MarkerData['type']) => {
    if (t === 'drop-off') return 'D';
    if (t === 'pick-up') return 'P';
    return 'B';
  };

  const typeBadge = (t?: MarkerData['type']) => {
    const label = t === 'drop-off' ? 'Drop Off' : t === 'pick-up' ? 'Pick Up' : 'Both';
    const bg = t === 'drop-off' ? '#2563EB' : t === 'pick-up' ? '#16A34A' : '#C86D4B';
    return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${bg};color:#fff;font-size:10px;font-weight:700;">${label}</span>`;
  };

  // Update markers smoothly when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    const mapId = (import.meta.env.PUBLIC_GOOGLE_MAPS_MAP_ID as string | undefined) || undefined;
    let cancelled = false;

    const keyOf = (m: MarkerData) => m.slug || `${m.name}|${m.address}|${m.city ?? ''}|${m.zip ?? ''}`;

    const existingKeys = new Set(pinsRef.current.keys());

    const addMarker = async (m: MarkerData, position: LatLng) => {
      if (cancelled) return;
      const buildInfoHtml = () => {
        const query = encodeURIComponent(`${m.name} ${m.address ?? ''} ${m.city ?? ''} ${m.zip ?? ''}`.trim());
        const details = m.slug ? `<a href='/site/${m.slug}' style="display:inline-block;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-weight:600;color:#374151;text-decoration:none">Details</a>` : '';
        return `
          <div style="min-width:220px;max-width:280px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px;">
              <div style="font-weight:700;font-size:14px;color:#1f2937;">${m.name}</div>
              ${typeBadge(m.type)}
            </div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">${m.address || ''}${m.city ? `, ${m.city}` : ''}${m.zip ? ` ${m.zip}` : ''}</div>
            <div style="display:flex;gap:8px;align-items:center;">
              <a target="_blank" href="https://www.google.com/maps/search/?api=1&query=${query}" style="display:inline-block;padding:8px 10px;border-radius:8px;background:#C86D4B;color:#fff;font-weight:700;text-decoration:none">Directions</a>
              ${details}
            </div>
          </div>
        `;
      };
      const color = colorForType(m.type);
      if (mapId) {
        const markerLib: any = await (google as any).maps.importLibrary('marker');
        if (cancelled) return;
        const { AdvancedMarkerElement } = markerLib;
        // Custom badge element with letter glyph
        const el = document.createElement('div');
        el.style.width = '28px';
        el.style.height = '28px';
        el.style.background = color;
        el.style.border = '3px solid #ffffff';
        el.style.borderRadius = '9999px';
        el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
        el.style.color = '#ffffff';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontWeight = '700';
        el.style.fontSize = '12px';
        el.style.lineHeight = '1';
        el.textContent = letterForType(m.type);
        const adv = new AdvancedMarkerElement({ map, position, title: m.name, content: el });
        pinsRef.current.set(keyOf(m), adv);
        adv.addListener?.('click', () => {
          infoWindowRef.current?.setContent(buildInfoHtml());
          infoWindowRef.current?.open({ map, anchor: adv });
        });
      } else {
        // Classic marker with larger circle symbol + label
        const marker = new (google as any).maps.Marker({
          map,
          position,
          title: m.name,
          icon: {
            path: (google as any).maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          label: {
            text: letterForType(m.type),
            color: '#ffffff',
            fontWeight: '700',
            fontSize: '12px',
          },
        });
        pinsRef.current.set(keyOf(m), marker);
        marker.addListener('click', () => {
          infoWindowRef.current?.setContent(buildInfoHtml());
          infoWindowRef.current?.open(map, marker);
        });
      }
    };

    const geocoder = geocoderRef.current;
    const fullAddress = (m: MarkerData) => {
      const city = (m.city || '').trim();
      return [
        m.address,
        city && city.toLowerCase() !== 'other' ? city : undefined,
        m.zip,
        'MS',
      ]
        .filter(Boolean)
        .join(', ');
    };

    // Add/update current markers
    markers.forEach((m) => {
      const k = keyOf(m);
      existingKeys.delete(k);
      const existing = pinsRef.current.get(k);
      if (existing) return; // already present, skip
      if (m.lat != null && m.lng != null) {
        addMarker(m, { lat: m.lat, lng: m.lng });
      } else if (geocoder) {
        const addr = fullAddress(m);
        if (!addr) return;
        geocoder.geocode({ address: addr }, (results: any, status: string) => {
          if (cancelled) return;
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            addMarker(m, { lat: loc.lat(), lng: loc.lng() });
            scheduleFitToMarkers();
          }
        });
      }
    });

    // Remove stale markers
    existingKeys.forEach((k) => {
      const mk = pinsRef.current.get(k);
      if (mk) {
        try { mk.map = null; } catch {}
        pinsRef.current.delete(k);
      }
    });

    // After mass updates, adjust view
    scheduleFitToMarkers();

    return () => { cancelled = true; };
  }, [markers, mapReady]);

  // Focus map on the active marker when it changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const geocoder = geocoderRef.current;
    if (!map || !active) return;
    const goTo = (pos: LatLng) => {
      map.panTo(pos);
      map.setZoom(Math.max(map.getZoom?.() ?? 11, 15));
    };
    if (active.lat && active.lng) {
      goTo({ lat: active.lat, lng: active.lng });
      return;
    }
    const city = (active.city || '').trim();
    const parts = [
      active.address,
      city && city.toLowerCase() !== 'other' ? city : undefined,
      active.zip,
      'MS', // Help geocoder disambiguate within Mississippi
    ]
      .filter(Boolean)
      .join(', ');
    if (!parts || !geocoder) return;
    geocoder.geocode({ address: parts }, (results: any, status: string) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location;
        goTo({ lat: loc.lat(), lng: loc.lng() });
      }
    });
  }, [active]);

  const classes = className ?? "h-72 w-full rounded-lg ring-1 ring-[rgb(0_0_0/0.06)] bg-white";

  const changeZoom = (delta: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    let current = 0;
    try { current = map.getZoom?.() ?? 0; } catch { current = 0; }
    map.setZoom(current + delta);
  };

  return (
    <div className={`relative ${classes}`}>
      <div ref={mapRef} className="h-full w-full" />
      {/* Custom zoom controls (placed below the Full map button area) */}
      <div className="pointer-events-auto absolute top-14 right-3 flex flex-col gap-2">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => changeZoom(1)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white text-gray-800 shadow border border-gray-200 hover:bg-gray-50"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => changeZoom(-1)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white text-gray-800 shadow border border-gray-200 hover:bg-gray-50"
        >
          −
        </button>
      </div>
    </div>
  );
}


