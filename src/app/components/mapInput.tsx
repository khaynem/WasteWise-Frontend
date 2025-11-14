"use client";

import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { LatLngLiteral, LatLngExpression } from "leaflet";

// Fix default icon issue
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({
  onSelect,
  initialPosition,
}: {
  onSelect?: (pos: LatLngLiteral) => void;
  initialPosition?: LatLngLiteral | null;
}) {
  const [position, setPosition] = useState<LatLngLiteral | null>(null);

  useEffect(() => {
    if (initialPosition && typeof initialPosition.lat === "number" && typeof initialPosition.lng === "number") {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  useMapEvents({
    click(e) {
      const pos: LatLngLiteral = { lat: Number(e.latlng.lat), lng: Number(e.latlng.lng) };
      setPosition(pos);
      onSelect?.(pos);
    },
  });

  return position ? <Marker position={position as LatLngExpression} /> : null;
}

export default function MapInput({
  onLocationSelect,
  initialPosition,
}: {
  onLocationSelect?: (pos: LatLngLiteral) => void;
  initialPosition?: LatLngLiteral | null;
}) {
  // Defer rendering until mounted to avoid DOM access before it's ready
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || typeof window === "undefined" || !document?.head) {
    return null; // wait until client is ready
  }

  const defaultCenter: LatLngExpression = [14.8292, 120.2828]; // Olongapo
  const center: LatLngExpression =
    initialPosition && typeof initialPosition.lat === "number" && typeof initialPosition.lng === "number"
      ? [initialPosition.lat, initialPosition.lng]
      : defaultCenter;

  return (
    <MapContainer center={center} zoom={13} style={{ height: "250px", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      <LocationMarker onSelect={onLocationSelect} initialPosition={initialPosition || null} />
    </MapContainer>
  );
}