// ============================================================
// src/hooks/useNotifications.js
// Firebase Cloud Messaging Hook (Improved Version)
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  requestPermissionAndGetToken,
  subscribeForegroundMessages,
} from "../utils/firebaseMessaging";

/**
 * @typedef {"idle"|"loading"|"granted"|"denied"|"unsupported"|"error"} NotificationStatus
 */

export function useNotifications() {
  // ── State ────────────────────────────────────────────────
  const [status, setStatus] = useState("idle");
  const [foregroundMsg, setForegroundMsg] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const unsubscribeRef = useRef(null);

  const isSupported = typeof window !== "undefined" && "Notification" in window;

  // ── Initial permission sync ──────────────────────────────
  useEffect(() => {
    if (!isSupported) {
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "granted") {
      setStatus("granted");
    } else if (Notification.permission === "denied") {
      setStatus("denied");
    }
  }, [isSupported]);

  // ── Foreground message listener ──────────────────────────
  useEffect(() => {
    if (status !== "granted") return;

    const unsub = subscribeForegroundMessages((payload) => {
      setForegroundMsg(payload);
    });

    unsubscribeRef.current = unsub;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [status]);

  // ── Enable Notifications ────────────────────────────────
  const enableNotifications = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const result = await requestPermissionAndGetToken();

      if (result.success) {
        setStatus("granted");
      } else {
        if (result.error === "permission_denied") {
          setStatus("denied");
          setErrorMessage(
            "لقد رفضت الإذن. يمكنك تفعيله من إعدادات المتصفح."
          );
        } else if (result.error === "notifications_not_supported") {
          setStatus("unsupported");
          setErrorMessage("متصفحك لا يدعم الإشعارات.");
        } else {
          setStatus("error");
          setErrorMessage("حدث خطأ أثناء تفعيل الإشعارات.");
        }
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage("Unexpected error while enabling notifications.");
    }
  }, []);

  // ── Return API ───────────────────────────────────────────
  return {
    status,
    enableNotifications,
    foregroundMsg,
    errorMessage,
    isSupported,
    canNotify: status === "granted",
  };
}