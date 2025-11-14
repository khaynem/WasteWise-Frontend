"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function AdminNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showLogout, setShowLogout] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if screen is mobile size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMenuOpen(false); // Close mobile menu when switching to desktop
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMenuOpen && !target.closest('nav')) {
        setIsMenuOpen(false);
      }
    };

    if (isMobile && isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen, isMobile]);

  const handleLogout = () => {
    router.push('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const renderMenuContent = () => (
    <>
      {/* Menu Items */}
      <div style={{ flex: 1, paddingTop: "20px" }}>
        <Link
          href="/admin/adashboard"
          onClick={closeMenu}
          style={{
            display: "block",
            padding: "15px 20px",
            color: "white",
            textDecoration: "none",
            transition: "background-color 0.2s",
            backgroundColor: pathname === "/admin/adashboard" ? "#059669" : "transparent",
            borderLeft: pathname === "/admin/adashboard" ? "4px solid #10b981" : "4px solid transparent",
            fontWeight: pathname === "/admin/adashboard" ? "bold" : "normal",
          }}
          onMouseEnter={(e) => {
            if (pathname !== "/admin/adashboard") {
              e.currentTarget.style.backgroundColor = "#059669";
            }
          }}
          onMouseLeave={(e) => {
            if (pathname !== "/admin/adashboard") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <i className="fas fa-tachometer-alt" style={{ marginRight: "10px" }}></i>
          Dashboard
        </Link>
        
        <Link
          href="/admin/aschedule"
          onClick={closeMenu}
          style={{
            display: "block",
            padding: "15px 20px",
            color: "white",
            textDecoration: "none",
            transition: "background-color 0.2s",
            backgroundColor: pathname === "/admin/aschedule" ? "#059669" : "transparent",
            borderLeft: pathname === "/admin/aschedule" ? "4px solid #10b981" : "4px solid transparent",
            fontWeight: pathname === "/admin/aschedule" ? "bold" : "normal",
          }}
          onMouseEnter={(e) => {
            if (pathname !== "/admin/aschedule") {
              e.currentTarget.style.backgroundColor = "#059669";
            }
          }}
          onMouseLeave={(e) => {
            if (pathname !== "/admin/aschedule") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <i className="fas fa-calendar-alt" style={{ marginRight: "10px" }}></i>
          Schedule Management
        </Link>
        <Link
          href="/admin/areports"
          onClick={closeMenu}
          style={{
            display: "block",
            padding: "15px 20px",
            color: "white",
            textDecoration: "none",
            transition: "background-color 0.2s",
            backgroundColor: pathname === "/admin/areports" ? "#059669" : "transparent",
            borderLeft: pathname === "/admin/areports" ? "4px solid #10b981" : "4px solid transparent",
            fontWeight: pathname === "/admin/areports" ? "bold" : "normal",
          }}
          onMouseEnter={(e) => {
            if (pathname !== "/admin/areports") {
              e.currentTarget.style.backgroundColor = "#059669";
            }
          }}
          onMouseLeave={(e) => {
            if (pathname !== "/admin/areports") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <i className="fas fa-exclamation-triangle" style={{ marginRight: "10px" }}></i>
          Violation Reports
        </Link>
        
        <Link
          href="/admin/users"
          onClick={closeMenu}
          style={{
            display: "block",
            padding: "15px 20px",
            color: "white",
            textDecoration: "none",
            transition: "background-color 0.2s",
            backgroundColor: pathname === "/admin/users" ? "#059669" : "transparent",
            borderLeft: pathname === "/admin/users" ? "4px solid #10b981" : "4px solid transparent",
            fontWeight: pathname === "/admin/users" ? "bold" : "normal",
          }}
          onMouseEnter={(e) => {
            if (pathname !== "/admin/users") {
              e.currentTarget.style.backgroundColor = "#059669";
            }
          }}
          onMouseLeave={(e) => {
            if (pathname !== "/admin/users") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <i className="fas fa-users" style={{ marginRight: "10px" }}></i>
          Users
        </Link>

        {/* Admin Challenges */}
        <Link
          href="/admin/achallenges"
          onClick={closeMenu}
          style={{
            display: "block",
            padding: "15px 20px",
            color: "white",
            textDecoration: "none",
            transition: "background-color 0.2s",
            backgroundColor: pathname === "/admin/achallenges" ? "#059669" : "transparent",
            borderLeft: pathname === "/admin/achallenges" ? "4px solid #10b981" : "4px solid transparent",
            fontWeight: pathname === "/admin/achallenges" ? "bold" : "normal",
          }}
          onMouseEnter={(e) => {
            if (pathname !== "/admin/achallenges") {
              e.currentTarget.style.backgroundColor = "#059669";
            }
          }}
          onMouseLeave={(e) => {
            if (pathname !== "/admin/achallenges") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <i className="fas fa-trophy" style={{ marginRight: "10px" }}></i>
          Challenges
        </Link>
      </div>

      {/* Bottom Divider */}
      <div
        style={{
          height: "1px",
          backgroundColor: "#059669",
          margin: "0 20px",
        }}
      />

      {/* User Section */}
      <div
        style={{
          padding: "20px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
            padding: "10px",
            borderRadius: "8px",
            transition: "background-color 0.2s",
          }}
          onClick={() => setShowLogout(!showLogout)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#059669";
          }}
          onMouseLeave={(e) => {
            if (!showLogout) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <div
            style={{
              width: "35px",
              height: "35px",
              backgroundColor: "#059669",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="fas fa-user" style={{ color: "white" }}></i>
          </div>
          <div>
            <div style={{ fontWeight: "bold", fontSize: "14px" }}>Admin User</div>
            <div style={{ fontSize: "12px", color: "#d1fae5" }}>admin@gmail.com</div>
          </div>
        </div>

        {/* Logout Dropdown */}
        {showLogout && (
          <div
            style={{
              position: "absolute",
              bottom: "80px",
              left: "20px",
              right: "20px",
              backgroundColor: "#059669",
              borderRadius: "8px",
              padding: "10px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                borderRadius: "4px",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#047857";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <i className="fas fa-sign-out-alt" style={{ marginRight: "8px" }}></i>
              Logout
            </button>
          </div>
        )}
      </div>
    </>
  );

  // Mobile header with burger menu
  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <header
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "60px",
            backgroundColor: "#047857",
            display: "flex",
            alignItems: "center",
            padding: "0 1rem",
            color: "white",
            zIndex: 1001,
          }}
        >
          <button
            onClick={toggleMenu}
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: "20px",
              cursor: "pointer",
              padding: "5px",
              marginRight: "10px",
            }}
          >
            <i className={isMenuOpen ? "fas fa-times" : "fas fa-bars"}></i>
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                backgroundColor: "white",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img 
                src="/images/wwlogo.webp" 
                alt="WasteWise Logo" 
                style={{ width: "20px", height: "20px" }}
              />
            </div>
            <span style={{ fontWeight: "bold", fontSize: "18px" }}>WasteWise</span>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div
            style={{
              position: "fixed",
              top: "60px",
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 1000,
            }}
            onClick={closeMenu}
          />
        )}

        {/* Mobile Sidebar */}
        <nav
          style={{
            position: "fixed",
            top: "60px",
            left: isMenuOpen ? 0 : "-250px",
            width: "250px",
            height: "calc(100vh - 60px)",
            backgroundColor: "#047857",
            display: "flex",
            flexDirection: "column",
            color: "white",
            zIndex: 1001,
            transition: "left 0.3s ease",
          }}
        >
          {renderMenuContent()}
        </nav>
      </>
    );
  }

  // Desktop sidebar
  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "250px",
        height: "100vh",
        backgroundColor: "#047857", 
        display: "flex",
        flexDirection: "column",
        color: "white",
        zIndex: 1000,
      }}
    >
      {/* Logo Section */}
      <div
        style={{
          padding: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: "white",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img 
            src="/images/wwlogo.webp" 
            alt="WasteWise Logo" 
            style={{ width: "30px", height: "30px" }}
          />
        </div>
        <span style={{ fontWeight: "bold", fontSize: "20px" }}>WasteWise</span>
      </div>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          backgroundColor: "#059669",
          margin: "0 20px",
        }}
      />

      {renderMenuContent()}
    </nav>
  );
}
