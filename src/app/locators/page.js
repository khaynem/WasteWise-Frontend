"use client";

import { useMemo, useState, useEffect } from "react";
import styles from "./locators.module.css";
import dynamic from "next/dynamic";
import { locations as dataset } from "../../data/locations.js";

const MapPreview = dynamic(() => import("../components/MapPreview"), { ssr: false });

export default function LocatorsPage() {
  const junkshops = dataset?.junkshops || [];

  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const markers = useMemo(() => {
    return junkshops
      .map((item) => {
        if (typeof item?.coords !== "string") return null;
        const [latStr, lngStr] = item.coords.split(",").map((s) => s.trim());
        const lat = Number(latStr);
        const lng = Number(lngStr);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
      })
      .filter(Boolean);
  }, [junkshops]);

  const filteredShops = useMemo(() => {
    if (!normalizedQuery) return junkshops;
    return junkshops.filter((shop) => {
      const hay = `${shop?.name || ""} ${shop?.address || ""} ${shop?.phone || ""}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [junkshops, normalizedQuery]);

  const [focus, setFocus] = useState(null);
  const [activeId, setActiveId] = useState(null);

  // Device/user location state
  const [deviceLocation, setDeviceLocation] = useState(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    let mounted = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mounted) return;
        const lat = Number(pos.coords.latitude);
        const lng = Number(pos.coords.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        setDeviceLocation({ lat, lng });
        // Set initial center to device location only if no explicit focus yet
        setFocus((prev) => prev ?? { lat, lng });
      },
      () => {
        /* ignore geolocation errors silently */
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelect = (shop) => {
    if (!shop?.coords) return;
    const [latStr, lngStr] = shop.coords.split(",").map((s) => s.trim());
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setActiveId(shop.id);
    setFocus({ lat, lng });
  };

  const clearQuery = () => setQuery("");

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.pageLabel}>Locators</div>
        <p className={styles.pageDesc}>
          Locate nearby recycling facilities, junk shops, and other waste drop-off points in your area.
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.contentRow}>
          <aside className={styles.listCol}>
            <div className={styles.listHeader}>Junkshops & Recycling Centers</div>

            {/* Search bar */}
            <div className={styles.searchRow}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search junkshops by name, address, or phone…"
                aria-label="Search junkshops"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  aria-label="Clear search"
                  onClick={clearQuery}
                  title="Clear"
                >
                  ×
                </button>
              )}
            </div>

            <ul className={styles.list}>
              {filteredShops.length === 0 ? (
                <li className={styles.emptyState}>No results for “{query}”.</li>
              ) : (
                filteredShops.map((shop) => (
                  <li key={shop.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(shop)}
                      className={`${styles.listItem} ${activeId === shop.id ? styles.activeItem : ""}`}
                      title={shop.address}
                    >
                      <div className={styles.itemName}>{shop.name}</div>
                      <div className={styles.itemAddr}>{shop.address}</div>
                      {shop.phone && <div className={styles.itemPhone}>{shop.phone}</div>}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </aside>

          <div className={styles.mapCol}>
            <div className={styles.mapPlaceholder}>
              <MapPreview locations={junkshops} focus={focus} zoom={16} deviceLocation={deviceLocation} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}