"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

// Device/user icon (distinct color)
const DeviceIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FlyToFocus({ focus, zoom = 18 }) {
  const map = useMap();
  useEffect(() => {
    if (focus && Number.isFinite(focus.lat) && Number.isFinite(focus.lng)) {
      map.flyTo([focus.lat, focus.lng], zoom, { duration: 0.6 });
    }
  }, [focus, zoom, map]);
  return null;
}

export default function MapPreview({ coordinates, location, locations, focus, zoom = 16, deviceLocation = null }) {
  // Normalize all inputs into markers with optional metadata (name/address/phone)
  const markers = [];

  // Helper to push a marker with meta
  const pushMarker = (lat, lng, meta = {}) => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      markers.push({ lat, lng, ...meta });
    }
  };

  // Single tuple [lat,lng]
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    const [lat, lng] = coordinates.map(Number);
    pushMarker(lat, lng);
  }

  // Single object {lat,lng} or {latitude,longitude}
  if (location && (location.lat ?? location.latitude) !== undefined) {
    const lat = Number(location.lat ?? location.latitude);
    const lng = Number(location.lng ?? location.longitude);
    pushMarker(lat, lng);
  }

  if (Array.isArray(locations)) {
    for (const loc of locations) {
      // dataset style with coords and metadata
      if (loc && typeof loc.coords === "string") {
        const [latStr, lngStr] = loc.coords.split(",").map((s) => s.trim());
        const lat = Number(latStr);
        const lng = Number(lngStr);
        pushMarker(lat, lng, {
          id: loc.id,
          name: loc.name,
          address: loc.address,
          phone: loc.phone,
        });
        continue;
      }
      // plain object
      if (loc && (loc.lat ?? loc.latitude) !== undefined) {
        const lat = Number(loc.lat ?? loc.latitude);
        const lng = Number(loc.lng ?? loc.longitude);
        pushMarker(lat, lng, {
          id: loc.id,
          name: loc.name,
          address: loc.address,
          phone: loc.phone,
        });
        continue;
      }
      // tuple
      if (Array.isArray(loc) && loc.length === 2) {
        const [a, b] = loc.map(Number);
        pushMarker(a, b);
      }
    }
  }

  // If no place markers and no device location, render nothing
  if (markers.length === 0 && !deviceLocation) return null;

  const initialCenter = focus
    ? [focus.lat, focus.lng]
    : deviceLocation && Number.isFinite(deviceLocation.lat) && Number.isFinite(deviceLocation.lng)
    ? [deviceLocation.lat, deviceLocation.lng]
    : [markers[0].lat, markers[0].lng];

  return (
    <MapContainer
      center={initialCenter}
      zoom={zoom}
      style={{ width: "100%", height: "100%", minHeight: "400px", borderRadius: "0.7rem" }}
      scrollWheelZoom={true}
      dragging={true}
      doubleClickZoom={true}
      zoomControl={true}
      attributionControl={false}
      touchZoom={true}
      keyboard={true}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Device/user marker (distinct) */}
      {deviceLocation && Number.isFinite(deviceLocation.lat) && Number.isFinite(deviceLocation.lng) ? (
        <Marker key="device-location" position={[deviceLocation.lat, deviceLocation.lng]} icon={DeviceIcon}>
          <Tooltip direction="top" offset={[0, -28]} opacity={0.95}>
            <div style={{ fontWeight: 700 }}>You are here</div>
          </Tooltip>
          <Popup>
            <div style={{ maxWidth: 220 }}>
              <div style={{ fontWeight: 700, color: "#065f46", marginBottom: 4 }}>Your location</div>
              <div style={{ fontSize: 13, color: "#334155" }}>
                Latitude: {deviceLocation.lat.toFixed(5)}, Longitude: {deviceLocation.lng.toFixed(5)}
              </div>
            </div>
          </Popup>
        </Marker>
      ) : null}

      {markers.map((m, idx) => (
        <Marker key={m.id ?? idx} position={[m.lat, m.lng]} icon={DefaultIcon}>
          {/* Hover tooltip (compact) */}
          <Tooltip direction="top" offset={[0, -28]} opacity={0.95}>
            <div style={{ fontWeight: 700 }}>{m.name || "Location"}</div>
            {m.address ? <div style={{ fontSize: 12 }}>{m.address}</div> : null}
          </Tooltip>
          {/* Click popup (detailed) */}
          <Popup>
            <div style={{ maxWidth: 220 }}>
              <div style={{ fontWeight: 700, color: "#065f46", marginBottom: 4 }}>
                {m.name || "Location"}
              </div>
              {m.address ? <div style={{ fontSize: 13, color: "#334155" }}>{m.address}</div> : null}
              {m.phone && m.phone !== "N/A" ? (
                <div style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>
                  Phone: {m.phone}
                </div>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
      <FlyToFocus focus={focus} zoom={18} />
    </MapContainer>
  );
}