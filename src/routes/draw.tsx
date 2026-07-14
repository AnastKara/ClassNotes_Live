import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db, auth } from "@/integrations/firebase/client";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { DrawApp } from "@/components/draw-app";

export const Route = createFileRoute("/")({
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
  const [role, setRole] = useState<Role>("student");
  const [activeId, setActiveId] = useState<string>(DEFAULT_ROOM_ID);
  const [rooms, setRooms] = useState<Record<string, Room>>({});

  useEffect(() => {
    const r = localStorage.getItem("cn.role") as Role | null;
    if (r === "teacher" || r === "student") setRole(r);
  }, []);

  useEffect(() => {
    localStorage.setItem("cn.role", role);
  }, [role]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Failed to sign in anonymously:", e);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
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
  }, []);

  const active = rooms[activeId];
  const roomLocked = !!active?.locked;
  const canEdit = role === "teacher" || !roomLocked;

  const roomId = useMemo(() => activeId, [activeId]);

  return (
    <DrawApp
      roomId={roomId}
      canEdit={canEdit}
      activeId={activeId}
      role={role}
      onBackToClass={() => {
        // Navigation: go home (ClassNotes container)
        window.location.href = "/";
      }}
    />
  );
}

