"use client";

import { usePathname } from "next/navigation";
import NavBar from "./NavBar";
import Footer from "./Footer";
import ConditionalChatbot from "./BotpressWidget";
import React, { useEffect, useState } from "react";

export default function ConditionalWrapper({ children }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isStandaloneRoute = pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  if (isAdminRoute || isStandaloneRoute) {
    // For admin, forgot-password, and reset-password routes, only render children without navbar/footer/chatbot
    return <>{children}</>;
  }

  // For other routes, render with navbar/footer/chatbot
  return (
    <>
      <NavBar />
      {children}
      <Footer />
      {/* <ConditionalChatbot /> */}
    </>
  );
}