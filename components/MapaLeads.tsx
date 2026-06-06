"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { Lead } from "@/lib/types";
import "leaflet/dist/leaflet.css";

interface Props {
  leads: Lead[];
  onOpenLead: (id: string) => void;
}

function colorForScore(score: number): string {
  if (score >= 80) return "#22c55e"; // green-500
  if (score >= 60) return "#eab308"; // yellow-500
  return "#ef4444"; // red-500
}

export default function MapaLeads({ leads, onOpenLead }: Props) {
  const center = useMemo<[number, number]>(() => {
    if (leads.length === 0) return [-23.5505, -46.6333]; // SP fallback
    const sumLat = leads.reduce((acc, l) => acc + (l.lat ?? 0), 0);
    const sumLng = leads.reduce((acc, l) => acc + (l.lng ?? 0), 0);
    return [sumLat / leads.length, sumLng / leads.length];
  }, [leads]);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        style={{ height: 600, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {leads.map((l) => {
          if (l.lat == null || l.lng == null) return null;
          const color = colorForScore(l.score);
          return (
            <CircleMarker
              key={l.id}
              center={[l.lat, l.lng]}
              radius={9}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.6,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{l.nome}</div>
                  {l.categoria && (
                    <div className="text-xs text-gray-500">{l.categoria}</div>
                  )}
                  <div className="mt-1">
                    <span className="font-medium">Score:</span> {l.score}
                  </div>
                  {l.site && (
                    <div className="mt-1 truncate">
                      <a
                        href={l.site}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline"
                      >
                        {(() => {
                          try {
                            return new URL(l.site).hostname.replace(/^www\./, "");
                          } catch {
                            return l.site;
                          }
                        })()}
                      </a>
                    </div>
                  )}
                  <button
                    onClick={() => onOpenLead(l.id)}
                    className="mt-2 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                  >
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
