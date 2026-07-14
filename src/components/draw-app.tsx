import React, { useEffect, useMemo } from "react";
import { DrawingCanvas } from "./drawing-canvas";
export type Role = "student" | "teacher";


export function DrawApp({
  roomId,
  canEdit,
  activeId,
  onBackToClass,
  role,
}: {
  roomId: string;
  canEdit: boolean;
  activeId: string;
  onBackToClass: () => void;
  role: Role;
}) {
  const title = useMemo(() => {
    return role === "teacher" ? "Draw (teacher)" : "Draw (student)";
  }, [role]);

  useEffect(() => {
    document.title = `${title} — classnotes.live`;
  }, [title]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 h-10 text-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToClass}
            className="border border-border px-3 py-0.5 hover:bg-muted rounded transition-colors"
          >
            ← Back
          </button>
          <span className="text-foreground font-medium">{activeId}</span>
          <span className="text-muted-foreground">/ draw</span>
        </div>

        <div className="flex items-center gap-3 text-muted-foreground">
          <span>
            {canEdit ? "Editing" : "View only"} · {role}
          </span>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <DrawingCanvas roomId={roomId} canEdit={canEdit} />
      </main>
    </div>
  );
}

