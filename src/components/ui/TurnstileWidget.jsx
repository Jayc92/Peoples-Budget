import { useEffect, useRef } from "react";
import { TURNSTILE_SITE_KEY } from "../../config";

// Loads the Cloudflare Turnstile script once and renders an explicit widget.
// Reports the token via onToken (null when expired/errored). Remount the widget by
// changing its React `key` in the parent after each submit to get a fresh,
// single-use token. Renders nothing meaningful if the site key is unset.
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise = null;

function loadTurnstile() {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("turnstile-script-failed"));
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export default function TurnstileWidget({ onToken }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!TURNSTILE_SITE_KEY) return; // misconfigured: render nothing, no token
    loadTurnstile()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (t) => onToken(t),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      })
      .catch(() => { if (!cancelled) onToken(null); });
    return () => {
      cancelled = true;
      try {
        if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      } catch { /* ignore */ }
    };
  }, [onToken]);

  return <div className="turnstile" ref={containerRef} aria-label="Human verification" />;
}
