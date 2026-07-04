import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { db, auth } from "@/integrations/firebase/client";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

export const Route = createFileRoute("/")({
  component: ClassNotes,
  ssr: false,
});

interface Room {
  id: string;
  name: string;
  content: string;
  locked: boolean;
}

const SUBJECTS = ["math", "physics", "chemistry", "history"] as const;
type Role = "student" | "teacher";
type View = "notes" | "cards";

interface Flashcard {
  id: string;
  room_id: string;
  front: string;
  back: string;
  created_at: string;
}

type InitStatus = "connecting" | "live" | "offline";

function ClassNotes(): JSX.Element {
  const [role, setRole] = useState<Role>("student");
  const [activeId, setActiveId] = useState<string>("math");
  const [view, setView] = useState<View>("notes");
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [status, setStatus] = useState<InitStatus>("connecting");
  const [initError, setInitError] = useState<string | null>(null);

  const [peers, setPeers] = useState(1);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const skipNextEcho = useRef<Record<string, string>>({});

  // saved role
  useEffect(() => {
    const r = localStorage.getItem("cn.role") as Role | null;
    if (r === "teacher" || r === "student") setRole(r);
  }, []);

  // Firebase env validation: prevent blank screen when env vars are missing
  useEffect(() => {
    try {
      // accessing db triggers env-var validation in src/integrations/firebase/client.ts
      void db;
    } catch (e) {
      setInitError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cn.role", role);
  }, [role]);

  // Anonymous authentication for presence tracking
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Sign in anonymously for presence tracking
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Failed to sign in anonymously:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // initial fetch + realtime subscription for rooms
  useEffect(() => {
    let alive = true;
    
    const roomsRef = collection(db, "rooms");
    const unsubscribe = onSnapshot(roomsRef, (snapshot) => {
      if (!alive) return;
      const map: Record<string, Room> = {};
      snapshot.forEach((doc) => {
        const data = doc.data() as Room;
        map[doc.id] = { ...data, id: doc.id };
      });
      setRooms(map);
      setStatus("live");
    }, (error) => {
      console.error("Rooms subscription error:", error);
      setStatus("offline");
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const active = rooms[activeId];
  const canEdit = role === "teacher" || (active && !active.locked);

  const pushContent = useCallback(async (id: string, content: string) => {
    skipNextEcho.current[id] = content;
    try {
      const roomRef = doc(db, "rooms", id);
      await updateDoc(roomRef, { 
        content, 
        updated_at: new Date().toISOString() 
      });
      setStatus("live");
    } catch (error) {
      setStatus("offline");
    }
  }, []);

  // throttled push
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRooms((prev) => ({
      ...prev,
      [activeId]: { ...prev[activeId], content: value },
    }));
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => pushContent(activeId, value), 150);
  };

  const toggleLock = async () => {
    if (role !== "teacher" || !active) return;
    const next = !active.locked;
    setRooms((prev) => ({ ...prev, [activeId]: { ...prev[activeId], locked: next } }));
    try {
      const roomRef = doc(db, "rooms", activeId);
      await updateDoc(roomRef, { locked: next });
    } catch (error) {
      console.error("Failed to toggle lock:", error);
    }
  };

  // fetch + subscribe flashcards for active room
  useEffect(() => {
    setCardIdx(0);
    setFlipped(false);
    
    const flashcardsRef = collection(db, "flashcards");
    const q = query(
      flashcardsRef,
      where("room_id", "==", activeId),
      orderBy("created_at", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newCards = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Flashcard[];
      setCards(newCards);
    }, (error) => {
      console.error("Flashcards subscription error:", error);
    });

    return () => unsubscribe();
  }, [activeId]);

  const addCard = async () => {
    const front = newFront.trim();
    const back = newBack.trim();
    if (!front || !back) return;
    setNewFront("");
    setNewBack("");
    try {
      const flashcardsRef = collection(db, "flashcards");
      await addDoc(flashcardsRef, {
        room_id: activeId,
        front,
        back,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to add card:", error);
    }
  };

  const deleteCard = async (id: string) => {
    try {
      const cardRef = doc(db, "flashcards", id);
      await deleteDoc(cardRef);
    } catch (error) {
      console.error("Failed to delete card:", error);
    }
  };

  const wordCount = active ? active.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const lineCount = active ? active.content.split("\n").length : 0;
  const currentCard = cards[cardIdx];

  return (
    <div className="min-h-screen flex flex-col">
      {initError && (
        <div className="p-6">
          <div className="max-w-xl border border-border rounded-md p-4">
            <div className="text-lg font-semibold">Firebase is not configured</div>
            <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
              {initError}
            </div>
          </div>
        </div>
      )}

      {!initError && (
        <>
          {/* top bar */}

      <header className="flex items-center justify-between border-b border-border px-4 h-10 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-accent">●</span>
          <span className="text-muted-foreground">classnotes.live</span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span>
            {status === "live" ? "connected" : status === "connecting" ? "connecting…" : "offline"}
          </span>
          <span>{peers} online</span>
          <button
            onClick={() => setRole(role === "teacher" ? "student" : "teacher")}
            className="border border-border px-2 py-0.5 hover:bg-muted transition-colors"
            aria-label="Toggle role"
          >
            role: {role}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* sidebar */}
        <aside className="w-52 border-r border-border p-3 flex flex-col text-sm">
          <div className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">
            subjects
          </div>
          <ul className="flex flex-col gap-0.5">
            {SUBJECTS.map((id) => {
              const r = rooms[id];
              const isActive = id === activeId;
              return (
                <li key={id}>
                  <button
                    onClick={() => setActiveId(id)}
                    className={
                      "w-full text-left px-2 py-1 flex items-center justify-between group " +
                      (isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    <span>
                      <span className="text-muted-foreground mr-2">{isActive ? ">" : " "}</span>
                      {id}
                    </span>
                    {r?.locked && <span className="text-danger text-xs">[locked]</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto pt-3 text-[10px] text-muted-foreground leading-relaxed">
            {role === "teacher"
              ? "teacher mode. lock a room to freeze edits."
              : "student mode. type freely unless the room is locked."}
          </div>
        </aside>

        {/* editor */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between border-b border-border px-4 h-9 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>
                <span className="text-foreground">{activeId}</span>
                <span className="mx-2">/</span>
                <button
                  onClick={() => setView("notes")}
                  className={view === "notes" ? "text-foreground" : "hover:text-foreground"}
                >
                  notes.md
                </button>
                <span className="mx-2">·</span>
                <button
                  onClick={() => setView("cards")}
                  className={view === "cards" ? "text-foreground" : "hover:text-foreground"}
                >
                  cards ({cards.length})
                </button>
              </span>
              {view === "notes" && active?.locked && (
                <span className="text-danger">— locked by teacher</span>
              )}
            </div>
            {view === "notes" && role === "teacher" && (
              <button
                onClick={toggleLock}
                className={
                  "border px-2 py-0.5 transition-colors " +
                  (active?.locked
                    ? "border-danger text-danger hover:bg-danger hover:text-background"
                    : "border-border hover:bg-muted")
                }
              >
                {active?.locked ? "unlock" : "lock room"}
              </button>
            )}
          </div>

          {view === "notes" ? (
            <>
              <div className="flex-1 min-h-0 relative">
                <textarea
                  ref={textareaRef}
                  value={active?.content ?? ""}
                  onChange={onChange}
                  disabled={!canEdit || !active}
                  spellCheck={false}
                  placeholder={active ? "// start typing. everyone here sees it." : "// loading…"}
                  className="absolute inset-0 w-full h-full resize-none bg-background text-foreground caret-accent p-4 pl-14 outline-none text-sm leading-6 font-mono disabled:text-muted-foreground disabled:cursor-not-allowed"
                />
                <div
                  aria-hidden
                  className="absolute top-0 left-0 h-full w-10 pt-4 pointer-events-none text-right pr-2 text-xs text-muted-foreground leading-6 border-r border-border select-none overflow-hidden"
                >
                  {Array.from({ length: Math.max(lineCount, 20) }).map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
              </div>
              <footer className="border-t border-border px-4 h-7 flex items-center justify-between text-[10px] text-muted-foreground">
                <div>
                  {lineCount} lines · {wordCount} words · {active?.content.length ?? 0} chars
                </div>
                <div>utf-8 · md · saved</div>
              </footer>
            </>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              {/* study area */}
              <div className="flex-1 min-h-0 flex items-center justify-center p-6">
                {cards.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    // no cards yet. add one below.
                  </div>
                ) : (
                  <div className="w-full max-w-xl flex flex-col items-center gap-4">
                    <div className="text-[10px] text-muted-foreground">
                      card {cardIdx + 1} / {cards.length}
                    </div>
                    <button
                      onClick={() => setFlipped((f) => !f)}
                      className="w-full min-h-[180px] border border-border p-6 text-left hover:bg-muted transition-colors flex flex-col justify-between"
                    >
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {flipped ? "back" : "front"}
                      </div>
                      <div className="text-lg leading-snug whitespace-pre-wrap">
                        {flipped ? currentCard.back : currentCard.front}
                      </div>
                      <div className="text-[10px] text-muted-foreground text-right">
                        click to {flipped ? "hide" : "reveal"}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => {
                          setFlipped(false);
                          setCardIdx((i) => (i - 1 + cards.length) % cards.length);
                        }}
                        className="border border-border px-3 py-1 hover:bg-muted"
                      >
                        prev
                      </button>
                      <button
                        onClick={() => {
                          setFlipped(false);
                          setCardIdx((i) => (i + 1) % cards.length);
                        }}
                        className="border border-border px-3 py-1 hover:bg-muted"
                      >
                        next
                      </button>
                      <button
                        onClick={() => {
                          const id = currentCard.id;
                          setCardIdx((i) => Math.max(0, Math.min(i, cards.length - 2)));
                          setFlipped(false);
                          deleteCard(id);
                        }}
                        className="border border-border px-3 py-1 text-muted-foreground hover:text-danger hover:border-danger"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* composer */}
              <div className="border-t border-border p-3 flex flex-col gap-2 text-xs">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  new card
                </div>
                <div className="flex gap-2">
                  <input
                    value={newFront}
                    onChange={(e) => setNewFront(e.target.value)}
                    placeholder="front — question / term"
                    className="flex-1 bg-background border border-border px-2 py-1 outline-none focus:border-accent"
                  />
                  <input
                    value={newBack}
                    onChange={(e) => setNewBack(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCard();
                    }}
                    placeholder="back — answer / definition"
                    className="flex-1 bg-background border border-border px-2 py-1 outline-none focus:border-accent"
                  />
                  <button
                    onClick={addCard}
                    disabled={!newFront.trim() || !newBack.trim()}
                    className="border border-border px-3 py-1 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    add
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      </>)}
    </div>
  );
}