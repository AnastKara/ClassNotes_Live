import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db, auth } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { DrawApp } from "@/components/draw-app";

export const Route = createFileRoute("/draw")({
  component: DrawRoute,
  ssr: false,
});

type Role = "student" | "teacher";

interface Room {
  id: string;
  name: string;
  content: string;
  locked: boolean;
}

const DEFAULT_ROOM_ID = "math";

function DrawRoute() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [activeId, setActiveId] = useState<string>(DEFAULT_ROOM_ID);
  const [rooms, setRooms] = useState<Record<string, Room>>({});

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user || user.isAnonymous) {
        navigate({ to: "/login" });
        return;
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [navigate]);

  // Fetch role from backend profile
  useEffect(() => {
    if (!authReady) return;
    let alive = true;

    async function syncRole() {
      try {
        const tokenUser = auth.currentUser;
        if (!tokenUser) return;

        const idToken = await tokenUser.getIdToken(true);
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}/api/users/me`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as any;
        const nextRole = data?.user?.role;
        if (alive && (nextRole === "teacher" || nextRole === "student")) {
          setRole(nextRole);
        }
      } catch {
        // ignore
      }
    }

    void syncRole();
    return () => {
      alive = false;
    };
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    let alive = true;
    const roomsRef = collection(db, "rooms");
    const q = query(roomsRef);

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!alive) return;
        const map: Record<string, Room> = {};
        snapshot.forEach((d) => {
          const data = d.data() as Room;
          map[d.id] = { ...data, id: d.id };
        });
        setRooms(map);
      },
      (err) => {
        console.error("Rooms subscription error:", err);
      },
    );

    return () => {
      alive = false;
      unsub();
    };
  }, [authReady]);

  const active = rooms[activeId];
  const roomLocked = !!active?.locked;
  const canEdit = role === "teacher" || !roomLocked;

  const roomId = useMemo(() => activeId, [activeId]);

  if (!authReady) return null;

  return (
    <DrawApp
      roomId={roomId}
      canEdit={canEdit}
      activeId={activeId}
      role={role}
      onBackToClass={() => {
        navigate({ to: "/" });
      }}
    />
  );
}
