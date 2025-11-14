"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Chatbot() {
  const pathname = usePathname();

  // Hide on login, forgot-password, any reset-password (dynamic token)
  const hidden =
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const HIDE_STYLE_ID = "botpress-hide-css";
    const FORCE_STYLE_ID = "botpress-force-css";

    const removeWidgetNodes = () => {
      document
        .querySelectorAll(".bpw-root, #bp-web-widget, [data-botpress-widget]")
        .forEach((n) => n.remove());
    };

    const ensureHideCss = () => {
      let s = document.getElementById(HIDE_STYLE_ID);
      if (!s) {
        s = document.createElement("style");
        s.id = HIDE_STYLE_ID;
        s.textContent = `
          .bpw-widget, .bpw-root, #bp-web-widget, [data-botpress-widget] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(s);
      }
    };

    const removeHideCss = () => {
      const s = document.getElementById(HIDE_STYLE_ID);
      if (s) s.remove();
    };

    const removeForceCss = () => {
      const s = document.getElementById(FORCE_STYLE_ID);
      if (s) s.remove();
    };

    if (hidden) {
      // Keep styles enforced
      ensureHideCss();
      removeForceCss();
      removeWidgetNodes();

      // Observe DOM for any reinjected widget and kill it immediately
      const observer = new MutationObserver(() => {
        const nodes = document.querySelectorAll(
          ".bpw-root, #bp-web-widget, [data-botpress-widget]"
        );
        if (nodes.length) {
          ensureHideCss();
          nodes.forEach((n) => n.remove());
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Allow future injection again after leaving hidden route
      // but prevent stale flag from blocking logic
      window.__botpressWidgetLoading = false;

      return () => observer.disconnect();
    }

    // Visible route
    removeHideCss();

    // If already loaded once, just force visible styling and exit
    if (window.__botpressWidgetLoading) {
      let s = document.getElementById(FORCE_STYLE_ID);
      if (!s) {
        s = document.createElement("style");
        s.id = FORCE_STYLE_ID;
        s.textContent = `
          .bpw-widget, .bpw-root, #bp-web-widget, [data-botpress-widget] {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 2147483647 !important;
            pointer-events: auto !important;
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
          }
        `;
        document.head.appendChild(s);
      }
      return;
    }

    // First-time load on allowed route
    window.__botpressWidgetLoading = true;

    const injectUrl = "https://cdn.botpress.cloud/webchat/v3.3/inject.js";
    const configScriptUrl =
      "https://files.bpcontent.cloud/2025/10/05/19/20251005194326-PAW56RH8.js";

    const injectScript = document.createElement("script");
    injectScript.src = injectUrl;
    injectScript.async = true;
    injectScript.onload = () => {
      const cfg = document.createElement("script");
      cfg.src = configScriptUrl;
      cfg.defer = true;
      cfg.async = false;
      cfg.onload = () => {
        let s = document.getElementById(FORCE_STYLE_ID);
        if (!s) {
          s = document.createElement("style");
            s.id = FORCE_STYLE_ID;
            s.textContent = `
              .bpw-widget, .bpw-root, #bp-web-widget, [data-botpress-widget] {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 2147483647 !important;
                pointer-events: auto !important;
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
              }
            `;
            document.head.appendChild(s);
        }
      };
      cfg.onerror = () => {
        window.__botpressWidgetLoading = false;
      };
      document.body.appendChild(cfg);
    };
    injectScript.onerror = () => {
      window.__botpressWidgetLoading = false;
    };
    document.body.appendChild(injectScript);
  }, [hidden, pathname]);

  // Render nothing
  return null;
}