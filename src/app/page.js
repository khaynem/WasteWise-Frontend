"use client";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect, use } from "react";
const MapInput = dynamic(() => import("./components/mapInput"), { ssr: false });
const MapPreview = dynamic(() => import("./components/MapPreview"), { ssr: false });

import Link from "next/link";
import { useMemo } from "react";
import api from "../lib/axios";
import { requireAuth } from "../lib/auth";
import { toast } from "react-toastify"; 
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BotpressWidget from "./components/BotpressWidget";

import {useRouter} from 'next/navigation';
import { getDeviceLocation } from "./utils/location";
import { locations as dataset } from "../data/locations.js";

// Fetch schedules from backend
const fetchSchedules = async () => {
  try {
    const response = await api.get("/api/user/schedules", {
      withCredentials: true
    });
      // },
    // });
    console.log("Fetched schedules:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return [];
  }
};

// Helper function to parse day string and calculate next pickup
function getNextPickupFromDay(dayString) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  // Handle "On call" case
  if (dayString.toLowerCase().includes("on call")) {
    return { daysLeft: "On call", dateStr: "", daysNum: null };
  }
  
  // Handle monthly schedules
  if (dayString.toLowerCase().includes("once a month")) {
    if (dayString.includes("Sunday")) {
      return getNextMonthly("Sunday");
    } else if (dayString.includes("1st Tuesday")) {
      return getNextMonthly("Tuesday", 1);
    } else if (dayString.includes("2nd Wednesday")) {
      return getNextMonthly("Wednesday", 2);
    } else if (dayString.includes("3rd Monday")) {
      return getNextMonthly("Monday", 3);
    }
  }
  
  // Handle regular weekly schedules
  const days = [];
  dayNames.forEach(day => {
    if (dayString.includes(day)) {
      days.push(day);
    }
  });
  
  if (days.length > 0) {
    return getNextDay(days);
  }
  
  return { daysLeft: "", dateStr: "", daysNum: null };
}

function getNextDay(days) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayIdx = today.getDay();
  let minDiff = 8;
  let nextDate = null;
  
  for (let d of days) {
    const idx = dayNames.indexOf(d);
    let diff = idx - todayIdx;
    if (diff < 0) diff += 7;
    if (diff === 0) diff = 7;
    if (diff < minDiff) {
      minDiff = diff;
      nextDate = new Date(today);
      nextDate.setDate(today.getDate() + diff);
    }
  }
  
  if (!nextDate) return { daysLeft: "", dateStr: "", daysNum: null };
  const options = { month: "long", day: "numeric" };
  return {
    daysLeft: minDiff === 1 ? "In 1 day" : `In ${minDiff} days`,
    dateStr: nextDate.toLocaleDateString(undefined, options),
    daysNum: minDiff
  };
}

function getNextMonthly(dayName, nth = 1) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const month = today.getMonth();
  const year = today.getFullYear();
  let count = 0;
  let nextDate = null;
  
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    date.setHours(0,0,0,0);
    if (date.getMonth() !== month) break;
    if (dayNames[date.getDay()] === dayName) {
      count++;
      if (count === nth && date >= today) {
        nextDate = date;
        break;
      }
    }
  }
  
  if (!nextDate) {
    const nextMonth = month + 1;
    const nextYear = nextMonth > 11 ? year + 1 : year;
    const realNextMonth = nextMonth % 12;
    count = 0;
    for (let d = 1; d <= 31; d++) {
      const date = new Date(nextYear, realNextMonth, d);
      date.setHours(0,0,0,0);
      if (date.getMonth() !== realNextMonth) break;
      if (dayNames[date.getDay()] === dayName) {
        count++;
        if (count === nth) {
          nextDate = date;
          break;
        }
      }
    }
  }
  
  if (!nextDate) return { daysLeft: "", dateStr: "", daysNum: null };
  const diff = Math.round((nextDate - today) / (1000 * 60 * 60 * 24));
  const options = { month: "long", day: "numeric" };
  return {
    daysLeft: diff === 0 ? "Today" : diff === 1 ? "In 1 day" : `In ${diff} days`,
    dateStr: nextDate.toLocaleDateString(undefined, options),
    daysNum: diff
  };
}

const getTypeColor = (typeName) => {
  const colors = {
    "Biodegradable": "#4CAF50",
    "Recyclable": "#2196F3", 
    "Residual": "#9E9E9E",
    "Bulky": "#FF9800",
    "Special Waste": "#F44336"
  };
  return colors[typeName] || "#666";
};

export default function Page() {
  const [schedules, setSchedules] = useState([]);
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [locCoord, setLocCoord] = useState(null);
  const [location, setLocation] = useState("");
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const imageInputRef = useRef();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const router = useRouter();

  // Sidebar/topnav offsets
  const SIDEBAR_WIDTH = 250;
  const TOPNAV_HEIGHT = 60;
  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const checkAuthentication = async () => {
      const user = await requireAuth(router, '/home');
      if (!user) {
        toast.error("Please sign in to continue.");
      }
    };
    checkAuthentication();
  }, [router]);

  // Auto-populate location from device on mount
  useEffect(() => {
    getDeviceLocation().then((coords) => {
      if (!coords) return;
      const { latitude, longitude } = coords;
      const latlng = { lat: latitude, lng: longitude };
      setLocCoord(latlng);
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      )
        .then((res) => res.json())
        .then((data) => {
          const addr = data?.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setLocation(addr);
        })
        .catch(() => {
          setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        });
    });
  }, []);
  
  // Fetch schedules on component mount
  useEffect(() => {
    const loadSchedules = async () => {
      const fetchedSchedules = await fetchSchedules();
      setSchedules(fetchedSchedules);
    };
    loadSchedules();
  }, []);

  // Get unique barangay names from API data
  const barangays = useMemo(() => {
    return schedules.map(s => s.barangay).sort();
  }, [schedules]);

  // Get schedule data for selected barangay
  const barangaySchedules = useMemo(() => {
    if (!selectedBarangay || schedules.length === 0) return [];
    
    const barangayData = schedules.find(s => s.barangay === selectedBarangay);
    if (!barangayData || !Array.isArray(barangayData.type)) return [];
    
    return barangayData.type.map(t => ({
      type: t.typeName,
      color: getTypeColor(t.typeName),
      schedule: t.day,
      next: getNextPickupFromDay(t.day)
    }));
  }, [selectedBarangay, schedules]);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImage(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("location", location);
      if (locCoord && typeof locCoord.lat === "number" && typeof locCoord.lng === "number") {
        formData.append("locCoords", JSON.stringify({ type: "Point", coordinates: [locCoord.lat, locCoord.lng] }));
      }
      formData.append("date", new Date().toISOString());
      if (image) formData.append("image", image);

      const response = await api.post("/api/user/report", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });

      toast.success("Report submitted successfully.");
      setTitle("");
      setDescription("");
      setLocation("");
      setLocCoord(null);
      setImage(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      console.log("response.data:", response.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleMapLocationSelect(latlng) {
    setLocCoord(latlng);
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`
    )
      .then((res) => res.json())
      .then((data) => {
        const addr =
          data?.display_name ||
          `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
        setLocation(addr);
      })
      .catch(() => {
        setLocation(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
      });
  }

  const junkshops = dataset?.junkshops || [];
  const [locQuery, setLocQuery] = useState("");
  const [locFocus, setLocFocus] = useState(null);
  const [showSuggest, setShowSuggest] = useState(false);

  const locMarkers = useMemo(() => {
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
    const q = locQuery.trim().toLowerCase();
    if (!q) return junkshops;
    return junkshops.filter((shop) => {
      const hay = `${shop?.name || ""} ${shop?.address || ""} ${shop?.phone || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [junkshops, locQuery]);

  function focusFirstMatch() {
     const q = locQuery.trim().toLowerCase();
     if (!q) {
       toast.info("Type a location name, address, or phone then press Enter.");
       return;
     }
     const match = filteredShops[0];
     if (!match?.coords) {
       toast.warn("No matching location found.");
       return;
     }
     const [latStr, lngStr] = match.coords.split(",").map((s) => s.trim());
     const lat = Number(latStr);
     const lng = Number(lngStr);
     if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
       toast.warn("Location has invalid coordinates.");
       return;
     }
     setLocFocus({ lat, lng });
    setShowSuggest(false); 
   }

  function selectShop(shop) {
     if (!shop?.coords) return;
     const [latStr, lngStr] = shop.coords.split(",").map((s) => s.trim());
     const lat = Number(latStr);
     const lng = Number(lngStr);
     if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
     setLocFocus({ lat, lng });
    setLocQuery(shop.name || ""); 
    setShowSuggest(false);
  }

  return (
    <main
      style={{
        background: "#F3FFF7",
        minHeight: "100vh",
        // Offset for fixed left sidebar on desktop
        marginLeft: isMobile ? 0 : `${SIDEBAR_WIDTH}px`,
        width: isMobile ? "100%" : `calc(100% - ${SIDEBAR_WIDTH}px)`,
        // Offset for fixed top header on mobile
        paddingTop: isMobile ? `${TOPNAV_HEIGHT + 16}px` : "2rem",
        paddingLeft: isMobile ? "1rem" : "2rem",
        paddingRight: isMobile ? "1rem" : "2rem",
        paddingBottom: "2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isMobile ? "1.25rem" : "2rem",
        transition: "margin-left 0.2s ease, width 0.2s ease, padding 0.2s ease",
      }}
    >
      <style>{`
        .custom-select-wrapper { position: relative; width: 100%; max-width: 340px; }
        .custom-select-wrapper select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23047857' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 1rem center; background-size: 1.2em;
        }
        @media (max-width: 900px) {
          .custom-select-wrapper select { background-position: right 0.8rem center; padding-right: 2.5rem; }
        }
        @media (max-width: 600px) {
          .custom-select-wrapper select { background-position: right 0.6rem center; padding-right: 2.2rem; }
        }

        /* Dashboard Recycling Locator styles */
        .dash-locator-grid { display: grid; grid-template-columns: 320px 1fr; gap: 12px; align-items: stretch; }
        @media (max-width: 900px) { .dash-locator-grid { grid-template-columns: 1fr; } }

        .dash-search-wrap { position: relative; }
        .dash-search-row { position: relative; display: flex; align-items: center; margin: 8px 0 6px 0; }
        .dash-search-input {
          width: 100%; padding: 0.55rem 2.1rem 0.55rem 0.7rem; border: 1px solid #e5e7eb; border-radius: 10px;
          background: #ffffff; color: #0f172a; outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .dash-search-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
        .dash-clear-btn { position: absolute; right: 8px; background: transparent; border: none; color: #64748b; font-size: 1.2rem; line-height: 1; cursor: pointer; padding: 2px 6px; border-radius: 6px; }
        .dash-clear-btn:hover { background: #f1f5f9; color: #0f172a; }

        .dash-suggest {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          width: 100%;
          max-height: 220px;
          overflow-y: auto;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #ffffff;
          box-shadow: 0 12px 24px rgba(4,120,87,0.12);
          list-style: none;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          scrollbar-width: thin;
          scrollbar-color: #10b981 #f3f4f6;
        }
        .dash-suggest::-webkit-scrollbar { width: 10px; }
        .dash-suggest::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 10px; }
        .dash-suggest::-webkit-scrollbar-thumb { background-color: #10b981; border-radius: 10px; border: 2px solid #f3f4f6; }
        .dash-suggest::-webkit-scrollbar-thumb:hover { background-color: #059669; }

        .dash-suggest-item {
          width: 100%;
          text-align: left;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 10px;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .dash-suggest-item:hover { background: #f0fff5; border-color: #86efac; }
        .dash-suggest-name { font-weight: 700; color: #065f46; font-size: 0.95rem; margin-bottom: 2px; }
        .dash-suggest-addr { font-size: 0.85rem; color: #475569; }

        /* Compact spacing on narrow screens */
        @media (max-width: 768px) {
          .section-responsive { padding: 1.1rem !important; }
          .flex-wrap-responsive { gap: 0.9rem !important; }
        }
      `}</style>

      <div className="main-container" style={{ width: "100%", maxWidth: "1100px", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        <section className="section-responsive"
          style={{
            background: "white",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            borderRadius: "1.1rem",
            padding: "2.2rem 2.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.2rem",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "1.1rem", color: "#047857", fontWeight: "bold" }}>
              Smart Waste Management
            </h1>
            <p style={{ fontSize: "1.1rem", marginBottom: "1.1rem", color: "#333" }}>
              Empowering Communities to Manage Waste Smarter and Build a Cleaner, Greener Future
            </p>
            <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
              <Link href="/schedules">
                <button
                  style={{
                    background: "#047857",
                    color: "white",
                    border: "none",
                    borderRadius: "0.6rem",
                    padding: "0.7rem 1.3rem",
                    fontSize: "0.95rem",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(4,120,87,0.08)",
                  }}
                >
                  <i className="fa-solid fa-calendar-days"></i>
                  Check Pickup Schedules
                </button>
              </Link>
              <Link href="/locators">
                <button
                  style={{
                    background: "white",
                    color: "#047857",
                    border: "2px solid #047857",
                    borderRadius: "0.6rem",
                    padding: "0.7rem 1.3rem",
                    fontSize: "0.95rem",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(4,120,87,0.08)",
                  }}
                >
                  <i className="fa-solid fa-location-dot"></i>
                  Find Centers
                </button>
              </Link>
            </div>
          </div>
          <div style={{ flex: "0 0 180px", display: "flex", justifyContent: "center" }}>
            <img
              src="/images/trash.webp"
              alt="Trash Bin"
              style={{
                maxWidth: "180px",
                width: "100%",
                borderRadius: "1.2rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                background: "#F3FFF7",
              }}
            />
          </div>
        </section>

        <div className="flex-wrap-responsive" style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
          <section className="section-responsive"
            style={{
              background: "white",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              borderRadius: "1.1rem",
              padding: "1.5rem 2rem",
              minWidth: "260px",
              flex: 1,
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                <i className="fa-solid fa-calendar-week" style={{ fontSize: "1.3rem", color: "#047857" }}></i>
                <span style={{ fontWeight: "bold", fontSize: "1.1rem", color: "#222" }}>
                  Collection Schedule
                </span>
              </div>
              <Link href="/schedules" style={{ color: "#047857", fontWeight: "bold", textDecoration: "underline", fontSize: "0.95rem" }}>
                View All
              </Link>
            </div>
            <div 
              style={{ margin: "1.1rem 0 1.2rem 0", fontSize: "1rem", color: "#555" }}>
              Select Barangay
            </div>
            <div
              className="custom-select-wrapper"
              tabIndex={-1}
              style={{ marginBottom: "1.2rem" }}
            >
              <select
                aria-label="Barangay Selection"
                value={selectedBarangay}
                onChange={e => {
                  setSelectedBarangay(e.target.value);
                  setDropdownOpen(false);
                }}
                style={{
                  background: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.8rem",
                  padding: "0.6rem 2.5rem 0.6rem 1.2rem",
                  fontSize: "0.95rem",
                  outline: "none",
                  width: "100%",
                  maxWidth: "340px",
                  color: selectedBarangay ? "#222" : "#888",
                  boxSizing: "border-box",
                  appearance: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  lineHeight: "1.2",
                  cursor: "pointer",
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23047857\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 1rem center",
                  backgroundSize: "1.2em"
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setDropdownOpen(false)}
              >
                <option value="" disabled>
                  Select Barangay
                </option>
                {barangays.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {(selectedBarangay && barangaySchedules.length > 0 ? barangaySchedules : []).map((s, index) => (
                <div
                  key={`${s.type}-${index}`}
                  style={{
                    background: s.color + "22",
                    borderRadius: "1.2rem",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    gap: "0.4rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: "bold", fontSize: "1rem", color: s.color }}>
                      {s.type}
                    </div>
                    <div style={{ fontWeight: "bold", color: s.color, fontSize: "0.95rem" }}>
                      Next: {s.next.daysLeft}{s.next.dateStr ? ` (${s.next.dateStr})` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.15rem" }}>
                    <div style={{ fontSize: "0.95rem", color: "#555" }}>
                      {s.schedule}
                    </div>
                  </div>
                </div>
              ))}
              {(!selectedBarangay || barangaySchedules.length === 0) && (
                <div style={{ color: "#888", fontSize: "0.95rem", textAlign: "center", marginTop: "1.2rem" }}>
                  Please select a barangay to view schedule.
                </div>
              )}
            </div>
          </section>

          {/* Recycling Locator card */}
          <section className="section-responsive"
            style={{
              background: "white",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              borderRadius: "1.1rem",
              padding: "1.5rem 2rem",
              minWidth: "260px",
              flex: 1,
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                <i className="fa-solid fa-map-location-dot" style={{ fontSize: "1.3rem", color: "#2196F3" }}></i>
                <span style={{ fontWeight: "bold", fontSize: "1.1rem", color: "#222" }}>
                  Recycling Locator
                </span>
              </div>
              <Link href="/locators" style={{ color: "#2196F3", fontWeight: "bold", textDecoration: "underline", fontSize: "0.95rem" }}>
                View More
              </Link>
            </div>
            <div style={{ margin: "1.1rem 0 0.8rem 0", fontSize: "1rem", color: "#555" }}>
              Find nearby recycling centers and drop-off points
            </div>

            {/* Search bar */}
            <div className="dash-search-wrap">
              <div className="dash-search-row">
                <input
                  type="text"
                  className="dash-search-input"
                  placeholder="Search by name, address, or phone…"
                  aria-label="Search junkshops"
                  value={locQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLocQuery(v);
                    setShowSuggest(Boolean(v.trim()));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusFirstMatch();
                    }
                  }}
                  onFocus={() => setShowSuggest(Boolean(locQuery.trim()))}
                />
                {locQuery && (
                  <button
                    type="button"
                    className="dash-clear-btn"
                    aria-label="Clear search"
                    onClick={() => { setLocQuery(""); setShowSuggest(false); }}
                    title="Clear"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Suggestions (overlay, does not push the map) */}
              {locQuery && showSuggest && (
                <ul className="dash-suggest" role="listbox" aria-label="Search results">
                  {filteredShops.length === 0 ? (
                    <li style={{ color: "#64748b", padding: "0.4rem 0.2rem", textAlign: "center" }}>
                      No results for “{locQuery}”.
                    </li>
                  ) : (
                    filteredShops.slice(0, 8).map((shop) => (
                      <li key={shop.id}>
                        <button
                          type="button"
                          className="dash-suggest-item"
                          title={shop.address}
                          onClick={() => selectShop(shop)}
                        >
                          <div className="dash-suggest-name">{shop.name}</div>
                          <div className="dash-suggest-addr">{shop.address}</div>
                        </button>
                      </li>
                    ))
                  )}
                  {Array.isArray(suggestions) && suggestions.length > 0 && (
                    <ul className="dash-suggest">
                      {suggestions.map((s) => (
                        <li key={s.id} className="dash-suggest-item">
                          <button type="button" onClick={() => handleSelectSuggestion(s)}>
                            <div className="dash-suggest-name">{s.name}</div>
                            <div className="dash-suggest-addr">{s.address}</div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </ul>
              )}
            </div>

            {/* Map preview */}
            <div
              style={{
                width: "100%",
                height: "260px",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                background: "#fff",
                marginTop: "10px",
                position: "relative",
                zIndex: 0, // ensure map sits below the suggestions stack
              }}
            >
              <MapPreview locations={junkshops} focus={locFocus} zoom={15} deviceLocation={locCoord}/>
            </div>
          </section>
        </div>

        {/* Report section */}
        <section className="section-responsive"
          style={{
            background: "white",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            borderRadius: "1.3rem",
            padding: "1.5rem 2rem",
            minHeight: "60px",
            position: "relative",
            marginTop: "1.2rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "1.3rem", color: "#F44336" }}></i>
              <span style={{ fontWeight: "bold", fontSize: "1.1rem", color: "#222" }}>
                Report Waste Violation
              </span>
            </div>
            <Link href="/reports" style={{ color: "#F44336", fontWeight: "bold", textDecoration: "underline", fontSize: "0.95rem" }}>
              View Reports
            </Link>
          </div>
          <form style={{ marginTop: "1.2rem", display: "flex", flexDirection: "column", gap: "1.2rem" }} onSubmit={handleSubmit}>
            <div>
              <label style={{ fontWeight: "bold", color: "#222", marginBottom: "0.4rem", display: "block", fontSize: "1rem" }}>
                Report Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter report title"
                style={{
                  width: "100%",
                  padding: "0.7rem 1rem",
                  borderRadius: "0.8rem",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem",
                  outline: "none",
                  marginBottom: "0.4rem",
                  background: "white",
                  color: "#222",
                }}
                required
              />
            </div>
            <div>
              <label style={{ fontWeight: "bold", color: "#222", marginBottom: "0.4rem", display: "block", fontSize: "1rem" }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the illegal dumping activity"
                rows={6}
                spellCheck
                aria-label="Report description"
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  borderRadius: "0.8rem",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem",
                  outline: "none",
                  marginBottom: "0.4rem",
                  background: "white",
                  color: "#222",
                  lineHeight: 1.5,
                  minHeight: "100px",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                required
              />
            </div>
            <div style={{ display: "flex", gap: "0.7rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: "bold", color: "#222", marginBottom: "0.4rem", display: "block", fontSize: "1rem" }}>
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  placeholder="Mark the area on the map"
                  style={{
                    width: "100%",
                    padding: "0.7rem 1rem",
                    borderRadius: "0.8rem",
                    border: "1px solid #d1d5db",
                    fontSize: "0.95rem",
                    outline: "none",
                    marginBottom: "0.4rem",
                    background: "white",
                    color: "#222",
                  }}
                  required
                  readOnly
                />
                <MapInput initialPosition={locCoord} onLocationSelect={handleMapLocationSelect} />
              </div>
              <div
                style={{
                  flex: 1,
                  border: "2px dashed #e0e0e0",
                  borderRadius: "1.2rem",
                  padding: "1rem",
                  textAlign: "center",
                  background: "#F9F9F9",
                  color: "#888",
                  marginBottom: "0.4rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.4rem",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                onClick={() => imageInputRef.current.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                tabIndex={0}
                role="button"
              >
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  ref={imageInputRef}
                  onChange={handleImageChange}
                />
                <i className="fa-solid fa-camera" style={{ fontSize: "1.3rem", color: "#F44336" }}></i>
                <div style={{ fontWeight: "bold", color: "#222", fontSize: "0.95rem" }}>
                  Click to upload or drag and drop
                </div>
                <div style={{ fontSize: "0.95rem", color: "#888" }}>
                  {image ? image.name : "No photo uploaded"}
                </div>
                {image && (
                  <img
                    src={URL.createObjectURL(image)}
                    alt="Preview"
                    style={{
                      marginTop: "0.4rem",
                      maxWidth: "100%",
                      maxHeight: "120px",
                      borderRadius: "0.5rem",
                    }}
                  />
                )}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "0.7rem" }}>
              <button
                type="submit"
                style={{
                  background: "#F44336",
                  color: "white",
                  border: "none",
                  borderRadius: "0.6rem",
                  padding: "0.7rem 1.3rem",
                  fontSize: "0.95rem",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                }}
                disabled={loading}
              >
                <i className="fa-solid fa-paper-plane"></i>
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        </section>
      </div>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" style={{ top: isMobile ? TOPNAV_HEIGHT + 8 : 8 }} />
      <BotpressWidget />
    </main>
    
  );
}