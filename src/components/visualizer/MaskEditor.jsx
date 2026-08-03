import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Wand2, Pentagon, Brush, Eraser, Undo2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

const W = 640;
const H = 400;
const TOOLS = [
  { key: "polygon", label: "Polygon", icon: Pentagon },
  { key: "brush", label: "Brush", icon: Brush },
  { key: "erase", label: "Erase", icon: Eraser },
];

export default function MaskEditor({ photoUrl, onMaskChange }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("brush");
  const [opacity, setOpacity] = useState([55]);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState([]);
  const [poly, setPoly] = useState([]);
  const drawing = useRef(false);

  const ctxOf = () => canvasRef.current?.getContext("2d");

  const snapshot = () => {
    const c = canvasRef.current;
    if (c) setHistory((h) => [...h.slice(-9), c.toDataURL()]);
  };

  const report = () => {
    const ctx = ctxOf();
    if (!ctx) return;
    const { data } = ctx.getImageData(0, 0, W, H);
    let on = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 20) on++;
    const pct = Math.round((on / (W * H)) * 100);
    onMaskChange?.({ dataUrl: canvasRef.current.toDataURL("image/png"), coverage: pct });
  };

  const paint = (e) => {
    const ctx = ctxOf();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    ctx.globalCompositeOperation = tool === "erase" ? "destination-out" : "source-over";
    ctx.fillStyle = "#F5C542";
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  };

  const addPolyPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const p = [
      ((e.clientX - rect.left) / rect.width) * W,
      ((e.clientY - rect.top) / rect.height) * H,
    ];
    const next = [...poly, p];
    setPoly(next);
    if (next.length >= 3) drawPolygon(next, true);
  };

  const drawPolygon = (points, preview) => {
    const ctx = ctxOf();
    if (preview && history.length) restore(history[history.length - 1], () => strokePoly(ctx, points));
    else strokePoly(ctx, points);
  };

  const strokePoly = (ctx, points) => {
    ctx.fillStyle = "#F5C542";
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    report();
  };

  const restore = (url, after) => {
    const ctx = ctxOf();
    const img = new window.Image();
    img.onload = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0);
      after?.();
    };
    img.src = url;
  };

  const autoDetect = () => {
    snapshot();
    const ctx = ctxOf();
    ctx.clearRect(0, 0, W, H);
    strokePoly(ctx, [
      [W * 0.08, H],
      [W * 0.26, H * 0.44],
      [W * 0.76, H * 0.44],
      [W * 0.97, H],
    ]);
  };

  const undo = () => {
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setPoly([]);
    if (prev) restore(prev, report);
    else reset();
  };

  const reset = () => {
    ctxOf()?.clearRect(0, 0, W, H);
    setPoly([]);
    report();
  };

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUrl]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
        <div className="relative transition-transform duration-300 origin-center" style={{ transform: `scale(${zoom})` }}>
          <img src={photoUrl} alt="Project floor" className="w-full h-[260px] sm:h-[300px] object-cover select-none" draggable={false} />
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            style={{ opacity: opacity[0] / 100 }}
            onPointerDown={(e) => {
              if (tool === "polygon") return addPolyPoint(e);
              snapshot();
              drawing.current = true;
              paint(e);
            }}
            onPointerMove={(e) => drawing.current && paint(e)}
            onPointerUp={() => {
              if (drawing.current) {
                drawing.current = false;
                report();
              }
            }}
            onPointerLeave={() => (drawing.current = false)}
          />
        </div>
        <span className="absolute bottom-2 left-3 text-[10px] tracking-[0.16em] text-[#F5C542]">AI FLOOR MASK</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-full text-[12px]" onClick={autoDetect}>
          <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Auto detect
        </Button>
        {TOOLS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            size="sm"
            variant={tool === key ? "default" : "outline"}
            className="rounded-full text-[12px]"
            onClick={() => { setTool(key); setPoly([]); }}
          >
            <Icon className="w-3.5 h-3.5 mr-1.5" /> {label}
          </Button>
        ))}
        <Button size="sm" variant="outline" className="rounded-full text-[12px]" onClick={undo}>
          <Undo2 className="w-3.5 h-3.5 mr-1.5" /> Undo
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full text-[12px]" onClick={reset}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(1, +(z - 0.15).toFixed(2)))}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center gap-3">
          <span className="text-[11px] text-slate-500 whitespace-nowrap">Mask opacity</span>
          <Slider value={opacity} onValueChange={setOpacity} min={10} max={100} step={5} />
        </div>
      </div>
    </div>
  );
}