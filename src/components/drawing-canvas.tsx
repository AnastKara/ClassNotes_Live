import { useRef, useEffect, useState, useCallback } from "react";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { cn } from "@/lib/utils";

interface DrawingCanvasProps {
  roomId: string;
  canEdit: boolean;
}

interface DrawingStroke {
  id: string;
  room_id: string;
  points: number[];
  color: string;
  width: number;
  created_at: string;
}

interface Comment {
  id: string;
  room_id: string;
  x: number;
  y: number;
  text: string;
  created_at: string;
}

const COLORS = ["#ffffff", "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57", "#ff9ff3", "#54a0ff"];
const STROKE_WIDTHS = [2, 4, 6, 8, 12];

export function DrawingCanvas({ roomId, canEdit }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(COLORS[0]);
  const [currentWidth, setCurrentWidth] = useState(STROKE_WIDTHS[1]);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const currentPointsRef = useRef<number[]>([]);

  // Load strokes and comments from Firestore
  useEffect(() => {
    if (!roomId) return;

    const strokesRef = collection(db, "strokes");
    const strokesQuery = query(strokesRef, where("room_id", "==", roomId));
    const unsubStrokes = onSnapshot(strokesQuery, (snapshot) => {
      const newStrokes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DrawingStroke[];
      setStrokes(newStrokes);
    });

    const commentsRef = collection(db, "comments");
    const commentsQuery = query(commentsRef, where("room_id", "==", roomId));
    const unsubComments = onSnapshot(commentsQuery, (snapshot) => {
      const newComments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];
      setComments(newComments);
    });

    return () => {
      unsubStrokes();
      unsubComments();
    };
  }, [roomId]);

  // Redraw canvas when strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 4) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      ctx.moveTo(stroke.points[0], stroke.points[1]);
      for (let i = 2; i < stroke.points.length; i += 2) {
        ctx.lineTo(stroke.points[i], stroke.points[i + 1]);
      }
      ctx.stroke();
    });
  }, [strokes]);

  const getPointerPos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;
    
    if ("touches" in e) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = e.clientX;
      y = e.clientY;
    }
    
    return {
      x: (x - rect.left) * (canvas.width / rect.width),
      y: (y - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canEdit) return;
    
    const pos = getPointerPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    currentPointsRef.current = [pos.x, pos.y];
    setIsDrawing(true);
  }, [canEdit, getPointerPos, currentColor, currentWidth]);

  const handlePointerMove = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canEdit) return;
    
    const pos = getPointerPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    currentPointsRef.current.push(pos.x, pos.y);
  }, [isDrawing, canEdit, getPointerPos]);

  const handlePointerUp = useCallback(async () => {
    if (!isDrawing || !canEdit) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.closePath();
    setIsDrawing(false);

    // Save the stroke to Firestore
    if (currentPointsRef.current.length >= 4) {
      try {
        const strokesRef = collection(db, "strokes");
        await addDoc(strokesRef, {
          room_id: roomId,
          points: currentPointsRef.current,
          color: currentColor,
          width: currentWidth,
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to save stroke:", error);
      }
    }
    
    currentPointsRef.current = [];
  }, [isDrawing, canEdit, roomId, currentColor, currentWidth]);

  const clearCanvas = async () => {
    if (!canEdit) return;
    
    // Clear all strokes from Firestore
    for (const stroke of strokes) {
      try {
        await deleteDoc(doc(db, "strokes", stroke.id));
      } catch (error) {
        console.error("Failed to delete stroke:", error);
      }
    }
  };

  const addComment = async (x: number, y: number) => {
    if (!canEdit || !newComment.trim()) return;
    
    try {
      const commentsRef = collection(db, "comments");
      await addDoc(commentsRef, {
        room_id: roomId,
        x,
        y,
        text: newComment.trim(),
        created_at: new Date().toISOString(),
      });
      setNewComment("");
      setActiveComment(null);
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const deleteComment = async (id: string) => {
    if (!canEdit) return;
    
    try {
      await deleteDoc(doc(db, "comments", id));
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canEdit) return;
    
    const pos = getPointerPos(e);
    setActiveComment(`${pos.x},${pos.y}`);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Toolbar */}
      <div className="border-b border-border px-4 h-9 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">drawing tools:</span>
          <div className="flex items-center gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className={cn(
                  "w-5 h-5 rounded-full border border-border",
                  currentColor === color && "ring-1 ring-accent"
                )}
                style={{ backgroundColor: color }}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            {STROKE_WIDTHS.map((width) => (
              <button
                key={width}
                onClick={() => setCurrentWidth(width)}
                className={cn(
                  "w-6 h-6 rounded border border-border flex items-center justify-center text-[10px]",
                  currentWidth === width && "bg-muted text-foreground"
                )}
              >
                {width}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowComments(!showComments)}
            className={cn(
              "border border-border px-2 py-0.5 hover:bg-muted",
              !showComments && "text-muted-foreground"
            )}
          >
            {showComments ? "hide" : "show"} comments
          </button>
        </div>
        {canEdit && (
          <button
            onClick={clearCanvas}
            className="border border-danger text-danger px-2 py-0.5 hover:bg-danger hover:text-background"
          >
            clear canvas
          </button>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-1 min-h-0 relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="absolute inset-0 w-full h-full cursor-crosshair bg-background"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onClick={handleCanvasClick}
        />

        {/* Comments overlay */}
        {showComments && comments.map((comment) => (
          <div
            key={comment.id}
            className="absolute bg-muted border border-border rounded px-2 py-1 text-xs max-w-[150px] cursor-pointer"
            style={{ left: comment.x, top: comment.y }}
            onClick={(e) => {
              e.stopPropagation();
              if (canEdit) {
                deleteComment(comment.id);
              }
            }}
          >
            {comment.text}
          </div>
        ))}

        {/* Comment input */}
        {activeComment && (
          <div
            className="absolute bg-background border border-border rounded p-2 shadow-lg"
            style={{ 
              left: parseInt(activeComment.split(",")[0]) + 10, 
              top: parseInt(activeComment.split(",")[1]) + 10 
            }}
          >
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const [x, y] = activeComment.split(",").map(Number);
                  addComment(x, y);
                }
                if (e.key === "Escape") {
                  setActiveComment(null);
                  setNewComment("");
                }
              }}
              placeholder="Type comment..."
              className="w-40 bg-background border border-border px-2 py-1 text-xs outline-none focus:border-accent"
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  );
}