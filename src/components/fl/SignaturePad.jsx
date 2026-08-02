import { useRef, useState, useEffect } from 'react';

// Reusable canvas-based signature pad. Captures drawn signature as base64 PNG.
export default function SignaturePad({ onSave, label = 'Sign here' }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [color] = useState('#0a0a0a');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [color]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const start = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stop = () => {
    if (isDrawing) setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const save = () => {
    if (!hasSignature) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave?.(dataUrl);
  };

  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 6px', color: '#666' }}>{label}</p>
      <div style={{ border: '2px dashed #c9a66b', borderRadius: 8, background: '#fff', padding: 4, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          style={{ width: '100%', height: 150, cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={start}
          onMouseMove={draw}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={start}
          onTouchMove={draw}
          onTouchEnd={stop}
        />
        {!hasSignature && (
          <p style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#bbb', fontSize: 14, pointerEvents: 'none', margin: 0 }}>
            ✍️ Draw your signature above
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={clear} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Clear</button>
        <button type="button" onClick={save} disabled={!hasSignature} style={{ padding: '8px 16px', border: '0', borderRadius: 6, background: hasSignature ? '#0a0a0a' : '#ccc', color: '#fff', cursor: hasSignature ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>Apply Signature</button>
      </div>
    </div>
  );
}