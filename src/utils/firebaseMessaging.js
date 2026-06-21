// ============================================================
// src/utils/firebaseMessaging.js
// FIXED & PRODUCTION READY VERSION
// ============================================================

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from "firebase/messaging";

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

// ── Firebase Config ─────────────────────────────────────────
const firebaseConfig = {
apiKey: "AIzaSyDShTsc9b4GQKo63I5FkgtbtULBZ_tT_kY",
  authDomain: "shopping1-f3eb3.firebaseapp.com",
  projectId: "shopping1-f3eb3",
  storageBucket: "shopping1-f3eb3.firebasestorage.app",
  messagingSenderId: "237522810667",
  appId: "1:237522810667:web:ce937817f9ed760b52f76e",
  measurementId: "G-6TZJQGCZ39"
};

// ── VAPID KEY ───────────────────────────────────────────────
export const VAPID_KEY =
  "BFUuwgRllm-bS3jS0JsBPeyx4sCy_sHcQXzSlDa2MvEBGtilWH2U89IrHihmPqOSBvzO0M_dTlFhF27osgITnQA";

// ── Firebase App Singleton ──────────────────────────────────
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ── Firestore ───────────────────────────────────────────────
export const db = getFirestore(app);

// ── Messaging Instance ──────────────────────────────────────
let messagingInstance = null;

export async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;

  const supported = await isSupported();
  if (!supported) return null;

  messagingInstance = getMessaging(app);
  return messagingInstance;
}

// ── Service Worker ──────────────────────────────────────────
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );

    console.log("[FCM] SW registered:", registration.scope);
    return registration;
  } catch (err) {
    console.error("[FCM] SW error:", err);
    return null;
  }
}

// ── Firestore Tokens ────────────────────────────────────────
const TOKENS_COLLECTION = "fcmTokens";

async function tokenExists(token) {
  const q = query(
    collection(db, TOKENS_COLLECTION),
    where("token", "==", token)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function saveTokenToFirestore(token) {
  const exists = await tokenExists(token);
  if (exists) return;

  await addDoc(collection(db, TOKENS_COLLECTION), {
    token,
    createdAt: serverTimestamp(),
    platform: "web",
  });

  console.log("[FCM] Token saved");
}

export async function removeInvalidToken(token) {
  const q = query(
    collection(db, TOKENS_COLLECTION),
    where("token", "==", token)
  );

  const snap = await getDocs(q);

  await Promise.all(
    snap.docs.map((d) =>
      deleteDoc(doc(db, TOKENS_COLLECTION, d.id))
    )
  );
}

// ── MAIN FLOW (FIXED) ───────────────────────────────────────
export async function requestPermissionAndGetToken() {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) {
      return { success: false, error: "notifications_not_supported" };
    }

    // ✅ FIX 1: permission FIRST
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, error: "permission_denied" };
    }

    // ✅ FIX 2: register SW AFTER permission
    const swRegistration = await registerServiceWorker();
    if (!swRegistration) {
      return { success: false, error: "sw_failed" };
    }

    // ✅ FIX 3: get token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      return { success: false, error: "no_token" };
    }

    await saveTokenToFirestore(token);

    console.log("[FCM] TOKEN:", token);

    return { success: true, token };
  } catch (err) {
    console.error("[FCM ERROR]", err);

    if (err?.code === "messaging/invalid-vapid-key") {
      return { success: false, error: "invalid_vapid" };
    }

    return {
      success: false,
      error: err?.message || "token_error",
    };
  }
}
const result = await requestPermissionAndGetToken();
console.log("FCM RESULT:", result);

// ── FOREGROUND MESSAGES ─────────────────────────────────────
export async function subscribeForegroundMessages(callback) {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    console.log("[FCM] foreground:", payload);
    callback(payload);
  });
}