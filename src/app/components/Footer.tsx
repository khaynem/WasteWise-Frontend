"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Footer() {
  const pathname = usePathname();

  const SIDEBAR_WIDTH = 250;
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (pathname.startsWith("/login") || pathname.startsWith("/home")) return null;

  return (
    <footer
      style={{
        backgroundColor: "#1F2937",
        color: "white",
        textAlign: "center",
        padding: "2rem 1rem",
        // Offset for left sidebar on desktop, full width on mobile
        marginLeft: isMobile ? 0 : SIDEBAR_WIDTH,
        width: isMobile ? "100%" : `calc(100% - ${SIDEBAR_WIDTH}px)`,
        transition: "margin-left 0.2s ease, width 0.2s ease",
      }}
    >
      {/* Logo inside white circle */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "50%",
          width: "80px",
          height: "80px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src="/images/wwlogo.webp"
          alt="WasteWise Logo"
          style={{ width: "60px", height: "60px", objectFit: "cover" }}
        />
      </div>

      {/* Title */}
      <h2 style={{ marginTop: "1rem", color: "white", fontSize: "1.5rem" }}>
        WasteWise
      </h2>

      {/* Subtitle */}
      <p style={{ color: "#d1d5db", margin: "0.5rem 0 1rem" }}>
        Smart waste management for a greener future
      </p>

      {/* Copyright */}
      <p style={{ color: "#e5e7eb", fontSize: "0.9rem", margin: 0 }}>
        © 2025 ArcMon Techies. All rights reserved.
      </p>
    </footer>
  );
}
