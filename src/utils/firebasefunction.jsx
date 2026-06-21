import { auth, db } from "./firebaseconfig";
import { 
  setDoc, doc, getDoc 
} from "firebase/firestore";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
  ,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

// ترجمة أخطاء Firebase
export function getFrontendErrorMessage(errorCode) {
  switch (errorCode) {
    case "Firebase: Error (auth/user-not-found).":
      return "This email is not registered, please make sure you enter a registered email.";
    case "Firebase: Error (auth/wrong-password).":
      return "The password entered is wrong. Please make sure you enter the correct password.";
    case "Firebase: Password should be at least 6 characters (auth/weak-password).":
      return "The password should be at least 6 characters.";
    case "Firebase: Error (auth/email-already-in-use).":
      return "The email address is already in use. Please use a different email.";
    default:
      return "An error occurred. Please try again.";
  }
}

//sign in google//

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const res = await signInWithPopup(auth, provider);
    const user = res.user;

    // إذا المستخدم جديد، احفظه بـ Firestore
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        fullname: user.displayName,
        email: user.email,
        phone: "",
        role: "user",
        createdAt: serverTimestamp(),
      });
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: "فشل تسجيل الدخول بغوغل" };
  }
}

// تسجيل مستخدم جديد
export const registerUser = async (username, email, password) => {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;

    await setDoc(doc(db, "users", user.uid), {
      username: username,
      email: user.email,
      role: "user", // أو "admin" حسب الحاجة
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: getFrontendErrorMessage(error.message) };
  }
};

// تسجيل دخول مستخدم
export const signInUser = async (email, password) => {
  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    const user = res.user;

    // جلب بيانات المستخدم من Firestore
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    const data = docSnap.exists() ? docSnap.data() : {};

    return { success: true, user: { uid: user.uid, email: user.email, displayName: data.username, role: data.role } };
  } catch (error) {
    return { success: false, error: getFrontendErrorMessage(error.message) };
  }
};

// تسجيل الخروج
export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// جلب بيانات المستخدم (إذا احتجنا)
export const fetchUserData = async (uid) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return { success: false, error: "User not found" };
    return { success: true, data: docSnap.data() };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
