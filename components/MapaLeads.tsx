"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { Lead } from "@/lib/types";
import "leaflet/dist/leaflet.css";

interface Props { leads: Lead[]; onOpenLead: (id: string) => void; }

function colorForScore(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  return "#ef4444";
}

export default function MapaLeads({ leads, onOpenLead }: Props) {
  const center = useMemo<[number, number]>(() => {
    if (leads.length === 0) return [-23.5505, -46.6333];
    const lat = leads.reduce((a, l) => a + (l.lat ?? 0), 0) / leads.length;
    const lng = leads.reduce((a, l) => a + (l.lng ?? 0), 0) / leads.length;
    return [lat, lng];
  }, [leads]);

  return (
    <div className="overflow-hidden rounded-xl border border-border"
      style={{ boxShadow: "0 0 0 1px oklch(0.145 0 0 / 0.10), 0 1px 3px 0 oklch(0.145 0 0 / 0.08)" }}>
      <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: 600, width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {leads.map((l) => {
          if (l.lat == null || l.lng == null) return null;
          const color = colorForScore(l.score);
          return (
            <CircleMarker key={l.id} center={[l.lat, l.lng]} radius={9}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.6, weight: 2 }}>
              <Popup>
                <div style={{ fontFamily: "Geist, sans-serif", minWidth: 160 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#0a0a0a" }}>{l.nome}</div>
                  {l.categoria && <div style={{ fontSize: 12, color: "#737373", marginBottom: 6 }}>{l.categoria}</div>}
                  <div style={{ fontSize: 12, marginBottom: 4 }}>
                    Score: <strong style={{ fontFamily: "Geist Mono, monospace" }}>{l.score}</strong>
                  </div>
                  {l.site && (
                    <div style={{ marginBottom: 4 }}>
                      <a href={l.site} target="_blank" rel="noreferrer"
                        style={{ fontSize: 12, color: "#ea580c", textDecoration: "underline" }}>
                        {(() => { try { return new URL(l.site).hostname.replace(/^www\./, ""); } catch { return l.site; } })()}
                      </a>
                    </div>
                  )}
                  <button onClick={() => onOpenLead(l.id)}
                    style={{
                      marginTop: 8, height: 28, padding: "0 10px", border: "none",
                      borderRadius: 8, background: "#ea580c", color: "#fff",
                      fontSize: 12, fontWeight: 500, cursor: "pointer",
                      fontFamily: "Geist, sans-serif",
                    }}>
                    Ver detalhes
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
