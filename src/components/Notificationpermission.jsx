import React, { useEffect, useState } from "react";
import { useNotifications } from "../hooks/Usenotifications";

// ── styles ───────────────────────────────────────────────
const styles = {
  card: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: 9999,
    background: "var(--np-bg, #1a1a2e)",
    color: "var(--np-text, #eaeaea)",
    borderRadius: "16px",
    padding: "20px 24px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxWidth: "340px",
    width: "calc(100vw - 48px)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    animation: "npSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "15px",
    fontWeight: "700",
  },

  subtitle: {
    fontSize: "13px",
    lineHeight: "1.6",
    opacity: 0.8,
    margin: 0,
  },

  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 20px",
    borderRadius: "10px",
    border: "none",
    background: "var(--np-accent, #e94560)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  successBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#4ade80",
  },

  errorText: {
    fontSize: "13px",
    color: "#f87171",
  },

  dismiss: {
    position: "absolute",
    top: "10px",
    right: "12px",
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    opacity: 0.6,
  },

  spinnerWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
};

// ── icons ───────────────────────────────────────────────
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const Spinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5"
    style={{ animation: "spin 0.8s linear infinite" }}>
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
    <path d="M12 2a10 10 0 0 1 10 10" />
  </svg>
);

// ── main component ───────────────────────────────────────
export default function NotificationPermission({
  hideWhenGranted = false,
} = {}) {
  const { status, enableNotifications, errorMessage } =
    useNotifications();

  const [dismissed, setDismissed] = useState(false);

  // ❌ hide if requested + granted
  if (hideWhenGranted && status === "granted") return null;

  const hideCard =
    dismissed || (hideWhenGranted && status === "granted");

  return (
    <>
      {!hideCard && (
        <div style={styles.card}>

          {/* close button */}
          <button
            style={styles.dismiss}
            onClick={() => setDismissed(true)}
          >
            ×
          </button>

          {/* title */}
          <div style={styles.titleRow}>
            <BellIcon />
            <span>إشعارات TechStore</span>
          </div>

          {/* IDLE */}
          {status === "idle" && (
            <>
              <p style={styles.subtitle}>
                فعّل الإشعارات لتصلك أحدث المنتجات فوراً.
              </p>

              <button style={styles.button} onClick={enableNotifications}>
                <BellIcon /> تفعيل الإشعارات
              </button>
            </>
          )}

          {/* LOADING */}
          {status === "loading" && (
            <div style={styles.spinnerWrap}>
              <Spinner /> جارٍ التفعيل...
            </div>
          )}

          {/* GRANTED */}
          {status === "granted" && (
            <div style={styles.successBadge}>
              <CheckIcon /> الإشعارات مفعّلة
            </div>
          )}

          {/* DENIED */}
          {status === "denied" && (
            <p style={styles.errorText}>
              تم رفض الإذن. يمكنك تفعيله من إعدادات المتصفح.
            </p>
          )}

          {/* UNSUPPORTED */}
          {status === "unsupported" && (
            <p style={styles.subtitle}>
              متصفحك لا يدعم الإشعارات.
            </p>
          )}

          {/* ERROR */}
          {status === "error" && (
            <>
              <p style={styles.errorText}>{errorMessage}</p>
              <button style={styles.button} onClick={enableNotifications}>
                إعادة المحاولة
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}