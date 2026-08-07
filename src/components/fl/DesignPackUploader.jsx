import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';

// DesignPackUploader — uploads a web/brand/logo pack image, runs AI vision extraction,
// and returns the extracted spec + pack_id. The pack_id is then passed to the generator
// so output matches the pack exactly (using the client's real data, not sample copy).
export default function DesignPackUploader({ onIngested, packType = 'web_pack', compact = false, projectId = null }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError(null); setResult(null);
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      // 1. Upload the image to get a file_url
      const upRes = await base44.integrations.Core.UploadFile({ file });
      const imageUrl = upRes.file_url || upRes.url;
      if (!imageUrl) throw new Error('Upload failed — no URL returned');
      setUploading(false);
      setExtracting(true);
      // 2. Run vision extraction
      const res = await base44.functions.invoke('ingestDesignPack', {
        image_url: imageUrl,
        pack_type: packType,
        pack_name: file.name.replace(/\.[^.]+$/, ''),
        project_id: projectId || undefined
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error + (data.detail ? ` — ${data.detail}` : ''));
      setResult(data);
      if (onIngested) onIngested(data.pack_id, data.spec, imageUrl);
    } catch (e) {
      setError(e.message || 'Ingestion failed');
    } finally {
      setUploading(false); setExtracting(false);
    }
  };

  const busy = uploading || extracting;

  return (
    <div style={{
      border: '2px dashed #d4c9a8', borderRadius: 12, padding: compact ? 16 : 24,
      background: '#faf9f4', textAlign: 'center', transition: 'border-color .2s'
    }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])} />

      {!busy && !result && !preview && (
        <div onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }}>
          <Upload size={compact ? 24 : 32} style={{ color: 'var(--gold-dark)', margin: '0 auto 10px' }} />
          <b style={{ fontSize: compact ? 13 : 15, display: 'block' }}>Upload a {packType.replace('_', ' ')}</b>
          <p style={{ color: '#888', fontSize: 12, margin: '6px 0 0' }}>
            Drop a design pack image — the AI reads it via vision and reproduces it exactly.
          </p>
        </div>
      )}

      {preview && (
        <div style={{ position: 'relative' }}>
          <img src={preview} alt="Pack preview" style={{ maxHeight: 160, borderRadius: 8, border: '1px solid #e5e1da' }} />
          {busy && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Loader2 size={26} className="animate-spin" style={{ color: 'var(--gold2)' }} />
              <b style={{ fontSize: 13, marginTop: 10 }}>{uploading ? 'Uploading…' : 'AI reading the pack…'}</b>
              <small style={{ color: '#ccc', fontSize: 11 }}>{extracting ? 'Extracting design spec via vision' : ''}</small>
            </div>
          )}
        </div>
      )}

      {result && (
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <CheckCircle2 size={18} style={{ color: '#237A4B' }} />
            <b style={{ fontSize: 14 }}>Pack ingested — design spec extracted</b>
          </div>
          <div style={{ fontSize: 12, color: '#666', display: 'grid', gap: 4 }}>
            {result.spec?.brand?.name && <span>• Brand: <b>{result.spec.brand.name}</b></span>}
            {result.spec?.brand?.colors?.primary && <span>• Primary color: <code style={{ background: '#fff', padding: '1px 5px', borderRadius: 3 }}>{result.spec.brand.colors.primary}</code></span>}
            {result.spec?.brand?.fonts?.heading && <span>• Fonts: {result.spec.brand.fonts.heading} / {result.spec.brand.fonts.body}</span>}
            {result.spec?.pages?.length > 0 && <span>• Pages: {result.spec.pages.length} ({result.spec.pages.map(p => p.name).join(', ')})</span>}
            {result.spec?.components?.length > 0 && <span>• Components: {result.spec.components.length}</span>}
          </div>
          <button onClick={() => { setResult(null); setPreview(null); }} style={{ marginTop: 12, background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Upload another</button>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a52d23', fontSize: 13, marginTop: 10 }}>
          <AlertCircle size={16} /> {error}
          <button onClick={() => { setError(null); setPreview(null); }} style={{ marginLeft: 'auto', background: 'none', border: 0, color: '#a52d23', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', textDecoration: 'underline' }}>retry</button>
        </div>
      )}
    </div>
  );
}