'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';

interface AddressMapProps {
  latitude: number;
  longitude: number;
  label?: string;
  height?: number;
}

/**
 * Mapa de la dirección con Leaflet + tiles de OpenStreetMap (open source).
 * Se importa de forma dinámica (`ssr: false`) porque Leaflet necesita `window`.
 */
export function AddressMap({ latitude, longitude, label, height = 240 }: AddressMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      center: [latitude, longitude],
      zoom: 15,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // A veces el contenedor se monta dentro del modal con tamaño 0; forzamos
    // un recalculo después del primer frame.
    const resizeTimer = setTimeout(() => map.invalidateSize(), 150);

    mapRef.current = map;
    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const icon = L.divIcon({
      className: '',
      html: '<span style="display:block;width:18px;height:18px;border:3px solid #fcf9f8;background:#0d0d0d;border-radius:50%;box-shadow:0 2px 10px rgba(13,13,13,0.4)"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    if (!markerRef.current) {
      markerRef.current = L.marker([latitude, longitude], { icon }).addTo(map);
    } else {
      markerRef.current.setLatLng([latitude, longitude]);
    }

    map.invalidateSize();
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [latitude, longitude]);

  return (
    <div>
      <div
        ref={containerRef}
        style={{ height, width: '100%', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}
      />
      {label && (
        <p
          style={{
            margin: '6px 0 0',
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#5f5f58',
          }}
        >
          {label}
        </p>
      )}
    </div>
  );
}
