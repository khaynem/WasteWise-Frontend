"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BarangayNavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const SIDEBAR_WIDTH = 250;

  const links = [
    { name: "Dashboard", href: "/barangay/dashboard", icon: "fas fa-gauge" },
    { name: "Schedules", href: "/barangay/schedules", icon: "fas fa-calendar-alt" },
    { name: "Reports", href: "/barangay/reports", icon: "fas fa-clipboard-list" },
    { name: "Challenges", href: "/barangay/challenges", icon: "fas fa-trophy" },
    { name: "Community", href: "/barangay/community", icon: "fas fa-people-group" },
    { name: "Profile", href: "/barangay/profile", icon: "fas fa-user-circle" },
  ];

  const hideOnLogin = pathname?.startsWith("/login") || pathname?.startsWith("/home");

  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setIsMenuOpen(false);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setShowLogout(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMobile && isMenuOpen && !target.closest("nav")) {
        setIsMenuOpen(false);
      }
    };
    if (isMobile && isMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isMobile, isMenuOpen]);

  const toggleMenu = () => setIsMenuOpen((v) => !v);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    setIsMenuOpen(false);
    setShowLogout(false);
    router.push("/login");
  };

  const renderMenuLinks = () => (
    <div style={{ flex: 1, paddingTop: "20px" }}>
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.name}
            href={link.href}
            aria-label={link.name}
            onClick={closeMenu}
            style={{
              display: "block",
              padding: "15px 20px",
              color: "white",
              textDecoration: "none",
              backgroundColor: active ? "#059669" : "transparent",
              borderLeft: active ? "4px solid #10b981" : "4px solid transparent",
              fontWeight: active ? "bold" : "normal",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}>
              <i className={link.icon} aria-hidden="true" style={{ width: "18px", textAlign: "center" }} />
              <span>{link.name}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );

  const renderUserSection = () => (
    <div style={{ padding: "20px", position: "relative" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "10px", borderRadius: "8px" }}
        onClick={() => setShowLogout((v) => !v)}
      >
        <div style={{ width: "35px", height: "35px", backgroundColor: "#059669", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="fas fa-user" style={{ color: "white" }}></i>
        </div>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>Barangay</div>
          <div style={{ fontSize: "12px", color: "#d1fae5" }}>account</div>
        </div>
      </div>

      {showLogout && (
        <div style={{ position: "absolute", bottom: "80px", left: "20px", right: "20px", backgroundColor: "#059669", borderRadius: "8px", padding: "10px" }}>
          <button onClick={handleLogout} style={{ width: "100%", padding: "10px", backgroundColor: "transparent", border: "none", color: "white", cursor: "pointer", borderRadius: "4px" }}>
            <i className="fas fa-sign-out-alt" style={{ marginRight: "8px" }}></i>
            Logout
          </button>
        </div>
      )}
    </div>
  );

  if (hideOnLogin) return null;

  if (isMobile) {
    return (
      <>
        <header style={{ position: "fixed", top: 0, left: 0, right: 0, height: "60px", backgroundColor: "#047857", display: "flex", alignItems: "center", padding: "0 1rem", color: "white", zIndex: 1001 }}>
          <button onClick={toggleMenu} style={{ background: "none", border: "none", color: "white", fontSize: "20px", cursor: "pointer", padding: "5px", marginRight: "10px" }} aria-label={isMenuOpen ? "Close menu" : "Open menu"}>
            <i className={isMenuOpen ? "fas fa-times" : "fas fa-bars"}></i>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "30px", height: "30px", backgroundColor: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/images/wwlogo.webp" alt="WasteWise Logo" style={{ width: "20px", height: "20px" }} />
            </div>
            <span style={{ fontWeight: "bold", fontSize: "18px" }}>WasteWise</span>
          </div>
        </header>

        {isMenuOpen && <div style={{ position: "fixed", top: "60px", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000 }} onClick={closeMenu} />}

        <nav style={{ position: "fixed", top: "60px", left: isMenuOpen ? 0 : -SIDEBAR_WIDTH, width: SIDEBAR_WIDTH, height: "calc(100vh - 60px)", backgroundColor: "#047857", display: "flex", flexDirection: "column", color: "white", zIndex: 1001, transition: "left 0.3s ease" }}>
          {renderMenuLinks()}
          <div style={{ height: "1px", backgroundColor: "#059669", margin: "0 20px" }} />
          {renderUserSection()}
        </nav>
      </>
    );
  }

  return (
    <nav style={{ position: "fixed", left: 0, top: 0, width: SIDEBAR_WIDTH, height: "100vh", backgroundColor: "#047857", display: "flex", flexDirection: "column", color: "white", zIndex: 1001 }}>
      <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "40px", height: "40px", backgroundColor: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/images/wwlogo.webp" alt="WasteWise Logo" style={{ width: "30px", height: "30px" }} />
        </div>
        <span style={{ fontWeight: "bold", fontSize: "20px" }}>WasteWise</span>
      </div>

      <div style={{ height: "1px", backgroundColor: "#059669", margin: "0 20px" }} />

      {renderMenuLinks()}

      <div style={{ height: "1px", backgroundColor: "#059669", margin: "0 20px" }} />

      {renderUserSection()}
    </nav>
  );
}
