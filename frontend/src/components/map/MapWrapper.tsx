/**
 * SHEildAI — MapWrapper
 *
 * A Leaflet map container with CartoDB Dark Matter tile layer (no API key needed).
 * Applies the SHEildAI dark theme and handles Leaflet CSS injection.
 *
 * Usage:
 *   <MapWrapper center={[12.97, 77.60]} zoom={14} style={{ height: '500px' }}>
 *     <HeatmapLayer segments={...} />
 *     <SafeRouteOverlay fastest={...} safest={...} />
 *   </MapWrapper>
 */

import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapWrapperProps {
  center: [number, number];
  zoom?: number;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Forces Leaflet map to recalculate size when container dimensions change */
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

export default function MapWrapper({
  center,
  zoom = 14,
  style,
  children,
}: MapWrapperProps) {
  return (
    <div style={{ position: 'relative', ...style }}>
      {/* Dark overlay style for Leaflet attribution */}
      <style>{`
        .leaflet-container {
          background: #08030a;
          font-family: 'DM Sans', sans-serif;
        }
        .leaflet-control-attribution {
          background: rgba(8,3,10,0.75) !important;
          color: #7a546c !important;
          font-size: 10px !important;
          backdrop-filter: blur(6px);
        }
        .leaflet-control-attribution a {
          color: #c8a0b8 !important;
        }
        .leaflet-control-zoom {
          border: 1px solid #2e1638 !important;
          border-radius: 10px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          background: rgba(19,10,24,0.9) !important;
          color: #fff0f6 !important;
          border-bottom: 1px solid #2e1638 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #2a0819 !important;
          color: #f0197d !important;
        }
        .leaflet-popup-content-wrapper {
          background: #130a18 !important;
          border: 1px solid #2e1638 !important;
          border-radius: 12px !important;
          color: #fff0f6 !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-tip {
          background: #130a18 !important;
        }
      `}</style>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
        zoomControl
      >
        {/* CartoDB Dark Matter — no API key required */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />
        <MapResizer />
        {children}
      </MapContainer>
    </div>
  );
}
