import React, { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./integrations/firebase";

export function TokenLogger() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const token = await user.getIdToken();
      console.log("Firebase ID token:", token);
    });

    return () => unsubscribe();
  }, []);

  return null;
}
