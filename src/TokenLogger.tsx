import React, { useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export function TokenLogger() {
  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const token = await user.getIdToken();
      console.log("Firebase ID token:", token);
    });

    return () => unsubscribe();
  }, []);

  return null;
}
