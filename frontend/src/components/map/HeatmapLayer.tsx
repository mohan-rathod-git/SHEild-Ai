/**
 * SHEildAI — HeatmapLayer
 *
 * Renders a GeoJSON FeatureCollection of road segments as colour-coded
 * Leaflet Polylines overlaid on the map.
 *
 * Colour scheme:
 *   risk_score 0.00–0.35 → green  (#39e09b)  safe
 *   risk_score 0.35–0.65 → amber  (#f59e0b)  moderate
 *   risk_score 0.65–1.00 → red    (#ff1744)  danger
 *
 * Each segment shows a popup on click with name, score, lighting, and CCTV info.
 */

import { Polyline, Popup } from 'react-leaflet';

interface SegmentProperties {
  id: number | null;
  segment_name: string;
  risk_score: number;
  risk_level: 'safe' | 'moderate' | 'danger';
  lit_status: string;
  cctv_present: boolean;
  notes: string;
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: SegmentProperties;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
}

interface HeatmapLayerProps {
  segments: GeoJSONFeature[];
}

function riskColor(score: number): string {
  if (score < 0.35) return '#39e09b';   // safe green
  if (score < 0.65) return '#f59e0b';   // moderate amber
  return '#ff1744';                      // danger red
}

function riskOpacity(score: number): number {
  // More dangerous = more opaque
  return 0.4 + score * 0.5;
}

function riskWeight(score: number): number {
  return score > 0.65 ? 5 : score > 0.35 ? 4 : 3;
}

function litLabel(status: string): string {
  return {
    well_lit: '💡 Well lit',
    partially_lit: '🔅 Partially lit',
    unlit: '🌑 Unlit',
    unknown: '❓ Unknown',
  }[status] ?? status;
}

export default function HeatmapLayer({ segments }: HeatmapLayerProps) {
  if (!segments || segments.length === 0) return null;

  return (
    <>
      {segments.map((feature, idx) => {
        const { properties, geometry } = feature;
        const score = properties.risk_score ?? 0.5;

        // GeoJSON coords are [lng, lat]; Leaflet expects [lat, lng]
        const positions: [number, number][] = geometry.coordinates.map(
          ([lng, lat]) => [lat, lng]
        );

        return (
          <Polyline
            key={`seg-${properties.id ?? idx}`}
            positions={positions}
            pathOptions={{
              color: riskColor(score),
              weight: riskWeight(score),
              opacity: riskOpacity(score),
              lineCap: 'round',
              lineJoin: 'round',
            }}
          >
            <Popup>
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                minWidth: '180px',
                padding: '4px',
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#fff0f6',
                  marginBottom: '8px',
                  lineHeight: 1.3,
                }}>
                  {properties.segment_name}
                </div>

                {/* Risk badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: `${riskColor(score)}18`,
                  border: `1px solid ${riskColor(score)}44`,
                  color: riskColor(score),
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  marginBottom: '10px',
                }}>
                  {properties.risk_level} · {(score * 100).toFixed(0)}/100
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#c8a0b8' }}>
                  <span>{litLabel(properties.lit_status)}</span>
                  <span>{properties.cctv_present ? '📹 CCTV present' : '🚫 No CCTV'}</span>
                  {properties.notes && (
                    <span style={{ color: '#7a546c', fontStyle: 'italic', marginTop: '2px' }}>
                      {properties.notes}
                    </span>
                  )}
                </div>
              </div>
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
}
