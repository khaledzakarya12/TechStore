// context.js
import { createContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseconfig"; // تأكد من المسار الصحيح

export const MainContext = createContext({});

export const MainProvider = ({ children }) => {
  const [currentuser, setCurrentuser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setCurrentuser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <MainContext.Provider value={{ currentUser: currentuser, setCurrentuser, loading }}>
  {children}
</MainContext.Provider>
  );
};
