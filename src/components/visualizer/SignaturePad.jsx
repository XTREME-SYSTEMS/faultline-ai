import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function SignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const start = (e) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSig(true);
  };

  const stop = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  const save = async () => {
    if (!hasSig) return;
    const canvas = canvasRef.current;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], "signature.png", { type: "image/png" });
    onSave?.(file);
  };

  return (
    <div className="space-y-3">
      <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-2 bg-white">
        <canvas
          ref={canvasRef}
          width={800}
          height={200}
          className="w-full h-40 touch-none cursor-crosshair"
          onMouseDown={start}
          onMouseMove={draw}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={start}
          onTouchMove={draw}
          onTouchEnd={stop}
        />
        {!hasSig && (
          <p className="absolute inset-0 flex items-center justify-center text-[12px] text-slate-400 pointer-events-none">
            Sign here with your finger or stylus
          </p>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={clear} className="text-[13px]">Clear</Button>
        <Button onClick={save} disabled={!hasSig} className="bg-slate-900 hover:bg-slate-800 text-[13px]">Save signature</Button>
      </div>
    </div>
  );
}