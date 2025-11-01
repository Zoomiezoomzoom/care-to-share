import React, { useEffect, useMemo, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
// Lightweight shim to satisfy TS when Google Maps types aren't installed
declare const google: any;

type MarkerData = {
  lat?: number;
  lng?: number;
  name: string;
  address: string;
};

type Props = {
  markers: MarkerData[];
  zoom?: number;
  className?: string;
};

type LatLng = { lat: number; lng: number };

export default function MapView({ markers, zoom = 11, className }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  const center = useMemo<LatLng>(() => {
    const withCoords = markers.filter((m) => m.lat && m.lng);
    if (withCoords.length > 0) {
      const avgLat = withCoords.reduce((a, m) => a + (m.lat as number), 0) / withCoords.length;
      const avgLng = withCoords.reduce((a, m) => a + (m.lng as number), 0) / withCoords.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: 32.2988, lng: -90.1848 }; // Jackson default
  }, [markers]);

  useEffect(() => {
    if (!mapRef.current) return;
    const apiKey = import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) return;
    const mapId = (import.meta.env.PUBLIC_GOOGLE_MAPS_MAP_ID as string | undefined) || undefined;

    const loader = new Loader({ apiKey, version: 'weekly' });
    let map: any | undefined;
    let pins: any[] = [];

    loader.importLibrary('maps').then(async () => {
      const mapsLib: any = await (google as any).maps.importLibrary('maps');
      const { Map } = mapsLib;
      map = new Map(mapRef.current as HTMLDivElement, { center, zoom, ...(mapId ? { mapId } : {}) });

      pins.forEach((p) => p.map = null);
      pins = [];
      if (mapId) {
        const markerLib: any = await (google as any).maps.importLibrary('marker');
        const { AdvancedMarkerElement } = markerLib;
        markers.forEach((m) => {
          if (!m.lat || !m.lng) return;
          const position = { lat: m.lat, lng: m.lng } as LatLng;
          const marker = new AdvancedMarkerElement({ map, position, title: m.name });
          pins.push(marker);
        });
      } else {
        markers.forEach((m) => {
          if (!m.lat || !m.lng) return;
          const position = { lat: m.lat, lng: m.lng } as LatLng;
          const marker = new (google as any).maps.Marker({ map, position, title: m.name });
          pins.push(marker);
        });
      }
    });

    return () => {
      pins.forEach((p) => (p.map = null));
    };
  }, [markers, center, zoom]);

  const classes = className ?? "h-72 w-full rounded-lg ring-1 ring-[rgb(0_0_0/0.06)] bg-white";
  return <div ref={mapRef} className={classes} />;
}


