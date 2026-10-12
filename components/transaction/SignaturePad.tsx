"use client";

import { useRef, useState, type PointerEvent } from "react";

interface SignaturePadProps {
  signed: boolean;
  onSigned: (signed: boolean) => void;
}

export function SignaturePad({ signed, onSigned }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const hasInkRef = useRef(false);

  function getContext() {
    const canvas = canvasRef.current;
    return canvas?.getContext("2d") ?? null;
  }

  function pointerPos(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: PointerEvent<HTMLCanvasElement>) {
    const ctx = getContext();
    if (!ctx) return;
    setDrawing(true);
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const ctx = getContext();
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#171717";
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInkRef.current = true;
  }

  function handlePointerUp() {
    if (drawing && hasInkRef.current) onSigned(true);
    setDrawing(false);
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
    onSigned(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={320}
        height={140}
        className="w-full touch-none rounded-lg border border-neutral-300 bg-white"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div className="flex items-center justify-between">
        <button type="button" onClick={handleClear} className="text-sm text-neutral-500">
          Clear signature
        </button>
        {signed && <span className="text-sm text-emerald-600">Signature captured</span>}
      </div>
    </div>
  );
}
