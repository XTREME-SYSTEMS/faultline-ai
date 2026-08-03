import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2, Trash2 } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function PhotoUpload({ photoUrls = [], onUploaded }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const badType = list.find((f) => !/^image\/(jpeg|png|webp)$/.test(f.type));
    if (badType) {
      setError("Use only JPG, PNG, or WEBP photos.");
      return;
    }
    const tooBig = list.find((f) => f.size > 12 * 1024 * 1024);
    if (tooBig) {
      setError("Each photo must be under 12 MB.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const uploaded = await Promise.all(
        list.map((file) => base44.integrations.Core.UploadFile({ file }))
      );
      const newUrls = uploaded.map((r) => r.file_url);
      onUploaded([...photoUrls, ...newUrls]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (idx) => {
    onUploaded(photoUrls.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border border-dashed border-slate-300 hover:border-slate-400 transition-colors py-8 text-center"
      >
        {busy ? (
          <Loader2 className="w-5 h-5 mx-auto animate-spin text-slate-400" />
        ) : (
          <Upload className="w-5 h-5 mx-auto text-slate-400" />
        )}
        <p className="mt-2 text-[14px] font-medium text-slate-900">
          {busy ? "Uploading photos…" : "Drop or choose project photos"}
        </p>
        <p className="text-[12px] text-slate-500">JPG, PNG, or WEBP. Up to 12 MB each. Select multiple at once.</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      {photoUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photoUrls.map((url, idx) => (
            <div key={url + idx} className="rounded-xl overflow-hidden border border-slate-200 relative group">
              <Image src={url} alt={`Project photo ${idx + 1}`} className="w-full h-32 sm:h-36" />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[11px] font-medium backdrop-blur-sm transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[9px] font-medium uppercase tracking-wide">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}