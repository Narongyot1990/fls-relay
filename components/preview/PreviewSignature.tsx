"use client";

import { useRef, type PointerEvent } from "react";

export function PreviewSignature({ onChange, clearLabel, label }: {
  onChange: (value: string | null) => void; clearLabel: string; label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const ink = useRef(false);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height };
  }
  function start(event: PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const p = point(event);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const p = point(event);
    ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a"; ctx.lineTo(p.x, p.y); ctx.stroke();
    ink.current = true;
  }
  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (ink.current) onChange(ref.current?.toDataURL("image/png") ?? null);
  }
  return <div>
    <canvas ref={ref} width={800} height={260} aria-label={label}
      onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      className="block h-40 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white" />
    <button type="button" className="mt-3 min-h-11 text-sm font-medium text-blue-600" onClick={() => {
      const canvas = ref.current;
      if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      ink.current = false; drawing.current = false; onChange(null);
    }}>{clearLabel}</button>
  </div>;
}
