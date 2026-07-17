import { createFileRoute, redirect } from "@tanstack/react-router";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { db, auth } from "@/integrations/firebase/client";
import { onAuthStateChanged, signOut, getIdToken } from "firebase/auth";
import { useNavigate } from "@tanstack/react-router";
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
export type Role = "student" | "teacher";

type View = "notes" | "cards" | "draw";

type CardsMode = "study" | "quiz";

// Microsoft Notes-inspired colorful palette
const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  math: { bg: "oklch(0.65 0.15 250)", text: "oklch(0.65 0.15 250)" },
  physics: { bg: "oklch(0.65 0.15 280)", text: "oklch(0.65 0.15 280)" },
  chemistry: { bg: "oklch(0.65 0.15 180)", text: "oklch(0.65 0.15 180)" },
  history: { bg: "oklch(0.65 0.15 40)", text: "oklch(0.65 0.15 40)" },
};

const CARD_BG_COLORS: Record<string, string> = {
  blue: "oklch(0.92 0.05 250)",
  green: "oklch(0.92 0.05 150)",
  orange: "oklch(0.92 0.05 40)",
  purple: "oklch(0.92 0.05 280)",
  pink: "oklch(0.92 0.05 340)",
  yellow: "oklch(0.92 0.05 80)",
  teal: "oklch(0.92 0.05 180)",
  red: "oklch(0.92 0.05 25)",
};

const CARD_TEXT_COLORS: Record<string, string> = {
  blue: "oklch(0.65 0.15 250)",
  green: "oklch(0.65 0.15 150)",
  orange: "oklch(0.65 0.15 40)",
  purple: "oklch(0.65 0.15 280)",
  pink: "oklch(0.65 0.15 340)",
  yellow: "oklch(0.65 0.15 80)",
  teal: "oklch(0.65 0.15 180)",
  red: "oklch(0.65 0.15 25)",
};

interface Flashcard {
  id: string;
  room_id: string;
  front: string;
  back: string;
  created_at: string;
}

type InitStatus = "connecting" | "live" | "offline";

function ClassNotes() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
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

  const [cardsMode, setCardsMode] = useState<CardsMode>("study");
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(false);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizTotalCount, setQuizTotalCount] = useState(0);

  const normalizeQuizAnswer = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

  const isQuizCorrect = (expected: string, actual: string) => {
    const e = normalizeQuizAnswer(expected);
    const a = normalizeQuizAnswer(actual);
    if (!a) return false;
    return a === e;
  };

  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const skipNextEcho = useRef<Record<string, string>>({});

  // Auth guard: redirect anonymous users to login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Not signed in at all
        navigate({ to: "/login" });
        return;
      }
      // Check if the user is anonymous (created via signInAnonymously)
      if (user.isAnonymous) {
        navigate({ to: "/login" });
        return;
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [navigate]);

  // Fetch role from backend profile (custom claims -> users/me profile)
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
        if (alive && (nextRole === "teacher" || nextRole === "student")) setRole(nextRole);
      } catch {
        // ignore
      }
    }

    void syncRole();
    return () => {
      alive = false;
    };
  }, [authReady]);

  // Firebase env validation: show a UI error if Firebase env vars are missing
  useEffect(() => {
    try {
      // `db` may be undefined if env vars are missing
      if (!db || !auth) {
        setInitError("Firebase is not configured (missing VITE_FIREBASE_* env vars).");
      }
    } catch (e) {
      setInitError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // initial fetch + realtime subscription for rooms

  useEffect(() => {
    if (!authReady) return;
    let alive = true;

    const roomsRef = collection(db, "rooms");
    const unsubscribe = onSnapshot(
      roomsRef,
      (snapshot) => {
        if (!alive) return;
        const map: Record<string, Room> = {};

        snapshot.forEach((doc) => {
          const data = doc.data() as Room;

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
      },
    );

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [authReady]);

  const active = rooms[activeId];
  const roomLocked = !!active?.locked;
  const canEdit = role === "teacher" || !roomLocked;

  const pushContent = useCallback(async (id: string, content: string) => {
    skipNextEcho.current[id] = content;
    try {
      const roomRef = doc(db, "rooms", id);
      await updateDoc(roomRef, {
        content,
        updated_at: new Date().toISOString(),
      });
      setStatus("live");
    } catch (error) {
      setStatus("offline");
    }
  }, []);

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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate({ to: "/login" });
    } catch (e) {
      console.error("Sign out failed:", e);
    }
  };

  // fetch + subscribe flashcards for active room
  useEffect(() => {
    if (!authReady) return;
    setCardIdx(0);
    setFlipped(false);

    const flashcardsRef = collection(db, "flashcards");
    const q = query(flashcardsRef, where("room_id", "==", activeId), orderBy("created_at", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newCards = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Flashcard[];
        setCards(newCards);
      },
      (error) => {
        console.error("Flashcards subscription error:", error);
      },
    );

    return () => unsubscribe();
  }, [activeId, authReady]);

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

  const cardColorKey =
    Object.keys(CARD_BG_COLORS)[cardIdx % Object.keys(CARD_BG_COLORS).length] || "blue";
  const cardColor = CARD_BG_COLORS[cardColorKey];
  const cardTextColor = CARD_TEXT_COLORS[cardColorKey];

  const statusText =
    status === "live" ? "Connected" : status === "connecting" ? "Connecting…" : "Offline";

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="border-2 border-foreground px-6 py-4 shadow-[4px_4px_0px_0px_var(--foreground)]">
          <div className="text-lg font-bold">checking auth...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {initError && (
        <div className="p-6">
          <div className="max-w-xl border-2 border-foreground p-4 shadow-[4px_4px_0px_0px_var(--foreground)]">
            <div className="text-lg font-bold">Firebase is not configured</div>
            <div className="mt-2 text-sm whitespace-pre-wrap">{initError}</div>
          </div>
        </div>
      )}

      {!initError && (
        <>
          {/* top bar */}
          <header className="flex items-center justify-between border-b-2 border-foreground px-4 h-10 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-accent" aria-hidden>
                ●
              </span>
              <span className="font-bold">classnotes.live</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs">{statusText}</span>
              <span className="text-xs">{peers} online</span>

              {/* Role badge */}
              <div className="border-2 border-foreground px-2 py-0.5 text-xs font-bold shadow-[2px_2px_0px_0px_var(--foreground)]">
                {role === "teacher" ? "TEACHER" : "student"}
              </div>

              {/* Theme toggle */}
              <button
                type="button"
                className="border-2 border-foreground px-3 py-0.5 hover:bg-foreground hover:text-background transition-colors text-xs font-bold shadow-[2px_2px_0px_0px_var(--foreground)]"
                onClick={() => {
                  const current =
                    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
                  const next = current === "dark" ? "light" : "dark";
                  localStorage.setItem("cn.theme", next);
                  document.documentElement.dataset.theme = next;
                  document.documentElement.style.colorScheme = next;
                }}
                aria-label="Toggle theme"
              >
                {document.documentElement.dataset.theme === "dark" ? "☀" : "☾"}
              </button>

              {/* Sign out */}
              <button
                type="button"
                onClick={handleSignOut}
                className="border-2 border-foreground px-3 py-0.5 hover:bg-foreground hover:text-background transition-colors text-xs font-bold shadow-[2px_2px_0px_0px_var(--foreground)]"
              >
                sign out
              </button>
            </div>
          </header>

          <div className="flex flex-1 min-h-0">
            {/* sidebar */}
            <aside className="w-64 border-r-2 border-foreground p-3 flex flex-col text-sm r-20">
              <div className="text-xs font-bold uppercase tracking-wider mb-3">subjects</div>

              <div className="mb-2">
                <div className="text-[12px] mb-1">Add or select a subject room</div>

                <div className="flex gap-2">
                  <AddSubjectInline
                    SUBJECTS_ADD_BUTTON_LABEL={SUBJECTS_ADD_BUTTON_LABEL}
                    rooms={rooms}
                    setActiveId={setActiveId}
                  />
                </div>
              </div>

              <ul className="flex flex-col gap-1" aria-label="Subject rooms">
                {SUBJECTS.map((id) => {
                  const r = rooms[id];
                  const isActive = id === activeId;
                  const color = SUBJECT_COLORS[id as string] || SUBJECT_COLORS.math;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(id)}
                        className={
                          "w-full text-left px-2 py-1 flex items-center justify-between group transition-colors " +
                          (isActive ? "text-foreground" : "hover:bg-muted")
                        }
                        style={{
                          backgroundColor: isActive
                            ? color.bg.replace("oklch", "oklch").replace("0.65", "0.15")
                            : "transparent",
                        }}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <span className="flex items-center gap-2">
                          <span style={{ color: color.text }} aria-hidden>
                            {isActive ? "▸" : " "}
                          </span>
                          <span className={"truncate " + (isActive ? "font-bold text-white" : "")}>
                            {id}
                          </span>
                        </span>
                        {r?.locked && (
                          <span className="border-2 border-danger text-danger text-xs font-bold px-1.5 py-0.5">
                            LOCKED
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-auto pt-3 text-[12px] leading-relaxed">
                {role === "teacher"
                  ? "Teacher: lock a room to freeze edits. Students can still view."
                  : "Student: type freely unless the room is locked by a teacher."}
              </div>
            </aside>

            {/* editor */}
            <main className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between border-b-2 border-foreground px-4 h-9 text-sm">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{activeId}</span>
                    <span className="text-muted-foreground" aria-hidden>
                      /
                    </span>

                    <button
                      type="button"
                      onClick={() => setView("notes")}
                      className={view === "notes" ? "font-bold" : "hover:font-bold"}
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
                      className={view === "cards" ? "font-bold" : "hover:font-bold"}
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
                      className={view === "draw" ? "font-bold" : "hover:font-bold"}
                      aria-pressed={view === "draw"}
                    >
                      draw (students)
                    </button>
                  </span>

                  {view === "notes" && active?.locked && (
                    <span className="text-danger font-bold">— Locked by teacher</span>
                  )}
                </div>

                {view === "notes" && role === "teacher" && (
                  <button
                    type="button"
                    onClick={toggleLock}
                    className={
                      "border-2 px-3 py-0.5 transition-colors font-bold shadow-[2px_2px_0px_0px_var(--foreground)] " +
                      (active?.locked
                        ? "border-danger text-danger bg-danger/10"
                        : "border-foreground hover:bg-foreground hover:text-background")
                    }
                  >
                    {active?.locked ? "Unlock" : "Lock"}
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
                      className="absolute inset-0 w-full h-full resize-none bg-background text-foreground caret-accent p-4 pl-14 outline-none text-sm leading-6 font-mono disabled:text-muted-foreground disabled:cursor-not-allowed"
                    />

                    <div
                      aria-hidden
                      className="absolute top-0 left-0 h-full w-10 pt-4 pointer-events-none text-right pr-2 text-xs text-muted-foreground leading-6 border-r-2 border-foreground select-none overflow-hidden"
                    >
                      {Array.from({ length: Math.max(lineCount, 20) }).map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                  </div>

                  <footer className="border-t-2 border-foreground px-4 h-7 flex items-center justify-between text-xs">
                    <div>
                      {lineCount} lines · {wordCount} words · {active?.content.length ?? 0} chars
                    </div>
                    <div>utf-8 · md · {status === "live" ? "saved" : "pending"}</div>
                  </footer>
                </>
              ) : view === "cards" ? (
                <div className="flex-1 min-h-0 flex flex-col">
                  {/* mode toggle */}
                  <div className="px-4 pt-4">
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setCardsMode("study");
                          setQuizAnswer("");
                          setQuizSubmitted(false);
                          setQuizCorrect(false);
                        }}
                        className={
                          "border-2 px-3 py-1 transition-colors font-bold shadow-[2px_2px_0px_0px_var(--foreground)] " +
                          (cardsMode === "study"
                            ? "bg-foreground text-background"
                            : "border-foreground hover:bg-foreground hover:text-background")
                        }
                        aria-pressed={cardsMode === "study"}
                      >
                        Study
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCardsMode("quiz");
                          setQuizAnswer("");
                          setQuizSubmitted(false);
                          setQuizCorrect(false);
                        }}
                        className={
                          "border-2 px-3 py-1 transition-colors font-bold shadow-[2px_2px_0px_0px_var(--foreground)] " +
                          (cardsMode === "quiz"
                            ? "bg-foreground text-background"
                            : "border-foreground hover:bg-foreground hover:text-background")
                        }
                        aria-pressed={cardsMode === "quiz"}
                      >
                        Quiz
                      </button>

                      {cardsMode === "quiz" && (
                        <span className="ml-auto">
                          Score: {quizCorrectCount}/{quizTotalCount}
                        </span>
                      )}

                      {cardsMode === "quiz" && cards.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuizAnswer("");
                            setQuizSubmitted(false);
                            setQuizCorrect(false);
                            setQuizCorrectCount(0);
                            setQuizTotalCount(0);
                            setCardIdx(0);
                          }}
                          className="border-2 border-foreground px-3 py-1 hover:bg-foreground hover:text-background font-bold shadow-[2px_2px_0px_0px_var(--foreground)]"
                        >
                          Restart
                        </button>
                      )}
                    </div>
                  </div>

                  {/* study/quiz area */}
                  <div className="flex-1 min-h-0 flex items-center justify-center p-6">
                    {cards.length === 0 ? (
                      <div className="text-sm">No cards yet. Add one below to start.</div>
                    ) : cardsMode === "quiz" ? (
                      <div className="w-full max-w-xl flex flex-col items-center gap-4">
                        <div className="text-xs" aria-live="polite">
                          Question {cardIdx + 1} of {cards.length}
                        </div>

                        <div
                          className="w-full min-h-[180px] border-2 border-foreground p-6 shadow-[4px_4px_0px_0px_var(--foreground)]"
                          style={{ backgroundColor: cardColor }}
                        >
                          <div
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: cardTextColor }}
                          >
                            Question
                          </div>
                          <div className="text-lg leading-snug whitespace-pre-wrap mt-2">
                            {currentCard.front}
                          </div>

                          <div className="mt-4">
                            <label className="text-xs">Your answer</label>
                            <input
                              value={quizAnswer}
                              onChange={(e) => setQuizAnswer(e.target.value)}
                              disabled={quizSubmitted}
                              placeholder="Type your answer"
                              className="mt-1 w-full bg-background border-2 border-foreground px-3 py-2 outline-none text-sm"
                            />

                            <div className="mt-3 flex items-center gap-2">
                              {!quizSubmitted ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const expected = currentCard.back;
                                    const actual = quizAnswer;
                                    const correct = isQuizCorrect(expected, actual);
                                    setQuizCorrect(correct);
                                    setQuizSubmitted(true);

                                    setQuizCorrectCount((c) => c + (correct ? 1 : 0));
                                    setQuizTotalCount((t) => t + 1);
                                  }}
                                  disabled={!quizAnswer.trim()}
                                  className="border-2 border-foreground px-3 py-2 hover:bg-foreground hover:text-background font-bold shadow-[2px_2px_0px_0px_var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  Submit
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuizAnswer("");
                                      setQuizSubmitted(false);
                                      setQuizCorrect(false);
                                      setCardIdx((i) => (i + 1) % cards.length);
                                    }}
                                    className="border-2 border-foreground px-3 py-2 hover:bg-foreground hover:text-background font-bold shadow-[2px_2px_0px_0px_var(--foreground)]"
                                  >
                                    Next
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuizAnswer("");
                                      setQuizSubmitted(false);
                                      setQuizCorrect(false);
                                      setCardIdx((i) => (i - 1 + cards.length) % cards.length);
                                    }}
                                    className="border-2 border-foreground px-3 py-2 hover:bg-foreground hover:text-background font-bold shadow-[2px_2px_0px_0px_var(--foreground)]"
                                  >
                                    Prev
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  const id = currentCard.id;
                                  setCardIdx((i) => Math.max(0, Math.min(i, cards.length - 2)));
                                  setQuizAnswer("");
                                  setQuizSubmitted(false);
                                  setQuizCorrect(false);
                                  deleteCard(id);
                                }}
                                className="border-2 border-danger px-3 py-2 text-danger hover:bg-danger hover:text-background font-bold shadow-[2px_2px_0px_0px_var(--danger)]"
                              >
                                Delete
                              </button>
                            </div>

                            {quizSubmitted && (
                              <div className="mt-3 text-sm">
                                <div
                                  className={
                                    quizCorrect
                                      ? "text-green-700 font-bold"
                                      : "text-danger font-bold"
                                  }
                                >
                                  {quizCorrect ? "✓ Correct" : "✗ Incorrect"}
                                </div>
                                <div className="text-xs mt-1">Expected: {currentCard.back}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-xl flex flex-col items-center gap-4">
                        <div className="text-xs" aria-live="polite">
                          Card {cardIdx + 1} of {cards.length}
                        </div>

                        <button
                          type="button"
                          onClick={() => setFlipped((f) => !f)}
                          className="w-full min-h-[180px] border-2 border-foreground p-6 text-left hover:opacity-90 transition-opacity flex flex-col justify-between shadow-[4px_4px_0px_0px_var(--foreground)]"
                          aria-label={flipped ? "Hide answer" : "Show answer"}
                          style={{ backgroundColor: cardColor }}
                        >
                          <div
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: cardTextColor }}
                          >
                            {flipped ? "Answer" : "Question"}
                          </div>
                          <div className="text-lg leading-snug whitespace-pre-wrap">
                            {flipped ? currentCard.back : currentCard.front}
                          </div>
                          <div className="text-xs text-right">
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
                            className="border-2 border-foreground px-3 py-1 hover:bg-foreground hover:text-background font-bold shadow-[2px_2px_0px_0px_var(--foreground)]"
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFlipped(false);
                              setCardIdx((i) => (i + 1) % cards.length);
                            }}
                            className="border-2 border-foreground px-3 py-1 hover:bg-foreground hover:text-background font-bold shadow-[2px_2px_0px_0px_var(--foreground)]"
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
                            className="border-2 border-danger px-3 py-1 text-danger hover:bg-danger hover:text-background font-bold shadow-[2px_2px_0px_0px_var(--danger)]"
                            aria-label="Delete current card"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* composer */}
                  <div className="border-t-2 border-foreground p-3 flex flex-col gap-2 text-xs">
                    <div className="text-xs font-bold uppercase tracking-wider">New card</div>

                    <div className="flex gap-2">
                      <input
                        value={newFront}
                        onChange={(e) => setNewFront(e.target.value)}
                        placeholder="Front (question / term)"
                        aria-label="Card front"
                        className="flex-1 bg-background border-2 border-foreground px-2 py-1 outline-none"
                      />
                      <input
                        value={newBack}
                        onChange={(e) => setNewBack(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addCard();
                        }}
                        placeholder="Back (answer / definition)"
                        aria-label="Card back"
                        className="flex-1 bg-background border-2 border-foreground px-2 py-1 outline-none"
                      />
                      <button
                        type="button"
                        onClick={addCard}
                        disabled={!newFront.trim() || !newBack.trim()}
                        className="border-2 border-foreground px-3 py-1 hover:bg-foreground hover:text-background font-bold shadow-[2px_2px_0px_0px_var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <DrawingCanvas roomId={activeId} canEdit={canEdit} />
              )}
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
}: {
  SUBJECTS_ADD_BUTTON_LABEL: string;
  rooms: Record<string, Room>;
  setActiveId: (id: string) => void;
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
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Auth not ready. Try again.");
      }

      const idToken = await getIdToken(user, true);
      if (!idToken) {
        throw new Error("Auth token not available. Try again.");
      }

      const callCreateRoom = async (token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}/api/rooms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: roomId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const backendMessage =
            errorData?.error?.message ?? errorData?.message ?? JSON.stringify(errorData);
          const err = new Error(backendMessage || "Failed to create room");
          (err as any).status = response.status;
          throw err;
        }
      };

      try {
        await callCreateRoom(idToken);
      } catch (err) {
        const status = (err as any)?.status;
        if (status === 401) {
          const refreshedToken = await getIdToken(user, true);
          if (!refreshedToken) throw err;
          await callCreateRoom(refreshedToken);
        } else {
          throw err;
        }
      }

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
          className="flex-1 bg-background border-2 border-foreground px-2 py-1 outline-none"
          aria-label="New subject id"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <button
          type="button"
          onClick={add}
          className="border-2 border-foreground px-3 py-1 hover:bg-foreground hover:text-background font-bold shadow-[2px_2px_0px_0px_var(--foreground)]"
          aria-label="Add subject room"
        >
          + Add
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
