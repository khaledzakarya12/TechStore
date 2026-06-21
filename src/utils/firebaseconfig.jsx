import { initializeApp } from "firebase/app";
import { getAuth} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";
const firebaseConfig = {
  apiKey: "AIzaSyDShTsc9b4GQKo63I5FkgtbtULBZ_tT_kY",
  authDomain: "shopping1-f3eb3.firebaseapp.com",
  projectId: "shopping1-f3eb3",
  storageBucket: "shopping1-f3eb3.firebasestorage.app",
  messagingSenderId: "237522810667",
  appId: "1:237522810667:web:ce937817f9ed760b52f76e",
  measurementId: "G-6TZJQGCZ39"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
export const analytics = getAnalytics(app);

