import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/integrations/firebase/client";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { DrawingCanvas } from "@/components/drawing-canvas";

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
const SUBJECTS_ADD_BUTTON_LABEL = "+";
type Role = "student" | "teacher";
type View = "notes" | "cards" | "draw";

// Microsoft Notes-like UI uses a vivid blue/teal accent.
// We keep the rest of the layout unchanged and just restyle the key components.

interface Flashcard {
  id: string;
  room_id: string;
  front: string;
  back: string;
  created_at: string;
}

type InitStatus = "connecting" | "live" | "offline";

function ClassNotes() {
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
    const unsubscribe = onSnapshot(
      roomsRef,
      (snapshot) => {
        if (!alive) return;
        const map: Record<string, Room> = {};

        snapshot.forEach((doc) => {
          const data = doc.data() as Room;

          // Prevent local writes -> snapshot echo -> state update -> rerender ping-pong.
          // If we just wrote this exact content, keep the existing value and clear the skip.
          const nextContentToSkip = skipNextEcho.current[doc.id];
          if (nextContentToSkip !== undefined && data.content === nextContentToSkip) {
            map[doc.id] = {
              ...data,
              id: doc.id,
            };
            delete skipNextEcho.current[doc.id];
            return;
          }

          map[doc.id] = { ...data, id: doc.id };
        });

        setRooms(map);
        setStatus("live");
      },
      (error) => {
        console.error("Rooms subscription error:", error);
        setStatus("offline");
      }
    );

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const active = rooms[activeId];
  const roomLocked = !!active?.locked;
  const canEdit = role === "teacher" || !roomLocked;


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

  const statusText =
    status === "live"
      ? "Connected"
      : status === "connecting"
        ? "Connecting…"
        : "Offline";

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
          <header className="flex items-center justify-between border-b border-border px-4 h-10 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-accent" aria-hidden>
                ●
              </span>
              <span className="text-muted-foreground">classnotes.live</span>
            </div>

            <div className="flex items-center gap-4 text-muted-foreground">
              <span aria-live="polite">{statusText}</span>
              <span aria-hidden>{peers} online</span>

              <button
                type="button"
                onClick={() => setRole(role === "teacher" ? "student" : "teacher")}
                className="border border-border px-3 py-0.5 hover:bg-muted transition-colors rounded"
                aria-label="Switch between teacher and student view"
              >
                role: {role}
              </button>
            </div>
          </header>

          <div className="flex flex-1 min-h-0">
            {/* sidebar */}
            <aside className="w-64 border-r border-border p-3 flex flex-col text-sm">
              <div className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">
                subjects
              </div>

              <div className="mb-2">
                <div className="text-[12px] text-muted-foreground mb-1">
                  Add or select a subject room
                </div>

                <div className="flex gap-2">
                  <input
                    value={activeId}
                    onChange={() => {
                      // no-op (keeps layout stable)
                    }}
                    className="hidden"
                    aria-hidden
                  />
                  <input
                    value={""}
                    onChange={() => {
                      // no-op; replaced below with local state control
                    }}
                    className="hidden"
                    aria-hidden
                  />

                  {/* Inline add: students can create a new subject room without using prompt dialogs */}
                  <AddSubjectInline
                    SUBJECTS_ADD_BUTTON_LABEL={SUBJECTS_ADD_BUTTON_LABEL}
                    rooms={rooms}
                    setActiveId={setActiveId}
                    db={db}
                    setDoc={setDoc}
                  />
                </div>
              </div>

              <ul className="flex flex-col gap-0.5" aria-label="Subject rooms">
                {SUBJECTS.map((id) => {
                  const r = rooms[id];
                  const isActive = id === activeId;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(id)}
                        className={
                          "w-full text-left px-2 py-1 flex items-center justify-between group rounded " +
                          (isActive
                            ? "bg-accent/10 text-foreground ring-1 ring-accent/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60")
                        }
                        aria-current={isActive ? "page" : undefined}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="text-muted-foreground"
                            aria-hidden
                          >
                            {isActive ? ">" : " "}
                          </span>
                          <span className="truncate">{id}</span>
                        </span>
                        {r?.locked && (
                          <span className="text-danger text-xs font-medium bg-danger/10 px-2 py-0.5 rounded">
                            Locked
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-auto pt-3 text-[12px] text-muted-foreground leading-relaxed">
                {role === "teacher"
                  ? "Teacher view: lock a room to freeze edits. Students can still view."
                  : "Student view: type freely unless the room is locked by a teacher."}
              </div>
            </aside>

            {/* editor */}
            <main className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between border-b border-border px-4 h-9 text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-foreground font-medium">{activeId}</span>
                    <span className="text-muted-foreground" aria-hidden>
                      / 
                    </span>

                    <button
                      type="button"
                      onClick={() => setView("notes")}
                      className={
                        view === "notes"
                          ? "text-accent font-semibold"
                          : "hover:text-foreground hover:text-accent/80"
                      }
                      aria-pressed={view === "notes"}
                    >
                      notes.md
                    </button>

                    <span className="text-muted-foreground" aria-hidden>
                      ·
                    </span>

                    <button
                      type="button"
                      onClick={() => setView("cards")}
                      className={
                        view === "cards"
                          ? "text-accent font-semibold"
                          : "hover:text-foreground hover:text-accent/80"
                      }
                      aria-pressed={view === "cards"}
                    >
                      cards ({cards.length})
                    </button>

                    <span className="text-muted-foreground" aria-hidden>
                      ·
                    </span>

                    <button
                      type="button"
                      onClick={() => setView("draw")}
                      className={
                        view === "draw"
                          ? "text-accent font-semibold"
                          : "hover:text-foreground hover:text-accent/80"
                      }
                      aria-pressed={view === "draw"}
                    >
                      draw
                    </button>
                  </span>

                  {view === "notes" && active?.locked && (
                    <span className="text-danger" role="status">
                      — Locked by teacher
                    </span>
                  )}
                </div>

                {view === "notes" && role === "teacher" && (
                  <button
                    type="button"
                    onClick={toggleLock}
                    className={
                      "border px-3 py-0.5 transition-colors rounded " +
                      (active?.locked
                        ? "border-danger/50 text-danger bg-danger/10 hover:bg-danger/15"
                        : "border-border hover:bg-accent/5 hover:border-accent/30")
                    }
                  >
                    {active?.locked ? "Unlock room" : "Lock room"}
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
                      disabled={!canEdit}
                      spellCheck={false}
                      placeholder={
                        canEdit
                          ? "Type here… everyone in this room sees updates in real time."
                          : "This room is locked. Ask your teacher to unlock it."
                      }
                      aria-label="Room notes"
                      className="absolute inset-0 w-full h-full resize-none bg-background text-foreground caret-accent p-4 pl-14 outline-none text-sm leading-6 font-mono disabled:text-muted-foreground disabled:cursor-not-allowed focus:ring-2 focus:ring-accent/40"
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

                  <footer className="border-t border-border px-4 h-7 flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      {lineCount} lines · {wordCount} words ·{" "}
                      {active?.content.length ?? 0} chars
                    </div>
                    <div>
                      utf-8 · md · {status === "live" ? "saved" : "pending"}
                    </div>
                  </footer>
                </>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col">
                  {/* study area */}
                  <div className="flex-1 min-h-0 flex items-center justify-center p-6">
                    {cards.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No cards yet. Add one below to start studying.
                      </div>
                    ) : (
                      <div className="w-full max-w-xl flex flex-col items-center gap-4">
                        <div className="text-xs text-muted-foreground" aria-live="polite">
                          Card {cardIdx + 1} of {cards.length}
                        </div>

                        <button
                          type="button"
                          onClick={() => setFlipped((f) => !f)}
                          className="w-full min-h-[180px] border border-border p-6 text-left hover:bg-accent/5 transition-colors flex flex-col justify-between rounded focus:outline-none focus:ring-2 focus:ring-accent/30"
                          aria-label={flipped ? "Hide answer" : "Show answer"}
                        >
                          <div className="text-xs text-muted-foreground uppercase tracking-wider">
                            {flipped ? "Answer" : "Question"}
                          </div>
                          <div className="text-lg leading-snug whitespace-pre-wrap">
                            {flipped ? currentCard.back : currentCard.front}
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            {flipped ? "Click to hide" : "Click to reveal"}
                          </div>
                        </button>

                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setFlipped(false);
                              setCardIdx((i) => (i - 1 + cards.length) % cards.length);
                            }}
                            className="border border-border px-3 py-1 hover:bg-muted rounded"
                          >
                            Prev
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFlipped(false);
                              setCardIdx((i) => (i + 1) % cards.length);
                            }}
                            className="border border-border px-3 py-1 hover:bg-muted rounded"
                          >
                            Next
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const id = currentCard.id;
                              setCardIdx((i) => Math.max(0, Math.min(i, cards.length - 2)));
                              setFlipped(false);
                              deleteCard(id);
                            }}
                            className="border border-border px-3 py-1 text-muted-foreground hover:text-danger hover:border-danger rounded"
                            aria-label="Delete current card"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* composer */}
                  <div className="border-t border-border p-3 flex flex-col gap-2 text-xs">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      New card
                    </div>

                    <div className="flex gap-2">
                      <input
                        value={newFront}
                        onChange={(e) => setNewFront(e.target.value)}
                        placeholder="Front (question / term)"
                        aria-label="Card front"
                        className="flex-1 bg-background border border-border px-2 py-1 outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 rounded"
                      />

                      <input
                        value={newBack}
                        onChange={(e) => setNewBack(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addCard();
                        }}
                        placeholder="Back (answer / definition)"
                        aria-label="Card back"
                        className="flex-1 bg-background border border-border px-2 py-1 outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 rounded"
                      />

                      <button
                        type="button"
                        onClick={addCard}
                        disabled={!newFront.trim() || !newBack.trim()}
                        className="border border-border px-3 py-1 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed rounded"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {view === "draw" && <DrawingCanvas roomId={activeId} canEdit={canEdit} />}
            </main>
          </div>
        </>
      )}
    </div>
  );
}

function AddSubjectInline({
  SUBJECTS_ADD_BUTTON_LABEL,
  rooms,
  setActiveId,
  db,
  setDoc,
}: {
  SUBJECTS_ADD_BUTTON_LABEL: string;
  rooms: Record<string, Room>;
  setActiveId: (id: string) => void;
  db: any;
  setDoc: any;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const add = async () => {
    setError(null);
    const roomId = value.trim();
    if (!roomId) {
      setError("Enter a subject name / id.");
      inputRef.current?.focus();
      return;
    }

    try {
      const roomRef = doc(db, "rooms", roomId);
      await setDoc(roomRef, {
        name: roomId,
        content: rooms[roomId]?.content ?? "",
        locked: rooms[roomId]?.locked ?? false,
        updated_at: new Date().toISOString(),
      });
      setValue("");
      setActiveId(roomId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Failed to add subject:", e);
      setError(`Failed to add subject: ${msg}`);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Subject id (e.g., biology)"
          className="flex-1 bg-background border border-border px-2 py-1 outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 rounded"
          aria-label="New subject id"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <button
          type="button"
          onClick={add}
          className="border border-border px-3 py-1 hover:bg-muted rounded"
          aria-label="Add subject room"
        >
          <span className="text-accent" aria-hidden>
            {SUBJECTS_ADD_BUTTON_LABEL}
          </span>
          <span className="ml-2">Add</span>
        </button>
      </div>

      {error && (
        <div className="mt-1 text-[12px] text-danger" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}