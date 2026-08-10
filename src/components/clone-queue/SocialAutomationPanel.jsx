import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Loader2, Facebook, Instagram, Youtube, Music2, Ghost, Send,
  Copy, Check, Sparkles, Zap, ExternalLink, AlertCircle, X,
} from 'lucide-react';

// SocialAutomationPanel — generates + posts social media content for a
// launched custom clone. Shows 5 platforms: Facebook (auto-post), Instagram
// (auto-post), TikTok/YouTube/Snapchat (copy for manual posting).
export default function SocialAutomationPanel({ clone, onClose }) {
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');
  const [postingTo, setPostingTo] = useState(null);
  const [postResults, setPostResults] = useState({});
  const [copied, setCopied] = useState(null);

  async function generate() {
    setGenerating(true);
    setError('');
    setContent(null);
    try {
      const res = await base44.functions.invoke('generateSocialContent', {
        business_name: clone.business_name,
        industry: clone.industry,
        tagline: clone.content_pack?.tagline,
        hero_headline: clone.content_pack?.hero_headline,
        about_text: clone.content_pack?.about_text,
        vercel_url: clone.vercel_url,
        niche: clone.niche,
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setContent(d.content);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function postToFacebook() {
    if (!content?.facebook) return;
    setPostingTo('facebook');
    try {
      // List pages first
      const pagesRes = await base44.functions.invoke('facebookManager', { action: 'list_pages' });
      const pages = pagesRes.pages || [];
      if (pages.length === 0) {
        setPostResults(prev => ({ ...prev, facebook: { error: 'No Facebook Pages found. Connect a Facebook Page first.' } }));
        return;
      }
      // Post to the first page
      const page = pages[0];
      const res = await base44.functions.invoke('facebookManager', {
        action: 'post',
        page_id: page.id,
        page_access_token: page.access_token,
        page_name: page.name,
        message: content.facebook.text,
        link_url: content.facebook.link || clone.vercel_url,
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setPostResults(prev => ({ ...prev, facebook: { success: true, page: page.name, post_id: d.post_id } }));
    } catch (e) {
      setPostResults(prev => ({ ...prev, facebook: { error: e.message } }));
    } finally {
      setPostingTo(null);
    }
  }

  async function copyToClipboard(text, platform) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(platform);
      setTimeout(() => setCopied(null), 2000);
    } catch (e) {}
  }

  const platforms = [
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2', autoPost: true, connected: true },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', autoPost: true, connected: false },
    { id: 'tiktok', name: 'TikTok', icon: Music2, color: '#000000', autoPost: false, connected: false },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', autoPost: false, connected: false },
    { id: 'snapchat', name: 'Snapchat', icon: Ghost, color: '#FFFC00', autoPost: false, connected: false },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'radial-gradient(circle at 82% 40%, #C89B3C30, transparent 25%), #0a0a0a',
        color: '#fff', padding: 24, borderRadius: 12, marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Social Media Automation</p>
          <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, margin: '8px 0 4px' }}>
            Promote <span style={{ color: '#E7C86E' }}>{clone.business_name}</span>
          </h2>
          <p style={{ color: '#aaa', fontSize: 13, margin: 0 }}>
            Auto-generate posts for 5 platforms from your cloned site
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 0, color: '#fff', cursor: 'pointer', padding: 8, borderRadius: 8 }}>
          <X size={20} />
        </button>
      </div>

      {/* Generate button */}
      {!content && !generating && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <button onClick={generate} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 32px',
            background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
            border: 0, borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}>
            <Sparkles size={20} /> Generate Social Content for All 5 Platforms
          </button>
          <p style={{ color: '#888', fontSize: 13, marginTop: 14 }}>
            Generates Facebook posts, Instagram captions, TikTok scripts, YouTube descriptions, and Snapchat snaps
          </p>
        </div>
      )}

      {generating && (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#C89B3C' }} />
          <p style={{ fontSize: 14, fontWeight: 600 }}>Generating social content for {clone.business_name}…</p>
        </div>
      )}

      {error && (
        <div style={{ padding: 14, background: '#f5d8d5', borderRadius: 8, color: '#a52d23', fontSize: 13, marginBottom: 16 }}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: 8 }} />{error}
        </div>
      )}

      {/* Platform cards */}
      {content && (
        <div style={{ display: 'grid', gap: 14 }}>
          {/* Facebook */}
          <PlatformCard platform={platforms[0]} content={content.facebook} result={postResults.facebook}>
            <PlatformField label="Post Text" value={content.facebook?.text} onCopy={() => copyToClipboard(content.facebook?.text, 'facebook')} copied={copied === 'facebook'} />
            <PlatformField label="Link" value={content.facebook?.link || clone.vercel_url} onCopy={() => copyToClipboard(content.facebook?.link || clone.vercel_url, 'facebook-link')} copied={copied === 'facebook-link'} />
            <button onClick={postToFacebook} disabled={postingTo === 'facebook'} style={postBtnStyle}>
              {postingTo === 'facebook' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {postingTo === 'facebook' ? 'Posting…' : 'Post to Facebook Now'}
            </button>
          </PlatformCard>

          {/* Instagram */}
          <PlatformCard platform={platforms[1]} content={content.instagram} result={postResults.instagram}>
            <PlatformField label="Caption" value={content.instagram?.caption} onCopy={() => copyToClipboard(content.instagram?.caption, 'ig-caption')} copied={copied === 'ig-caption'} />
            <PlatformField label="Hashtags" value={content.instagram?.hashtags?.join(' ')} onCopy={() => copyToClipboard(content.instagram?.hashtags?.join(' '), 'ig-tags')} copied={copied === 'ig-tags'} />
            <PlatformField label="Image Prompt" value={content.instagram?.image_prompt} onCopy={() => copyToClipboard(content.instagram?.image_prompt, 'ig-prompt')} copied={copied === 'ig-prompt'} />
            <div style={{ padding: '8px 12px', background: '#fff3e0', borderRadius: 6, fontSize: 12, color: '#B88214', marginTop: 8 }}>
              ⚡ Instagram auto-posting available — ask me to connect your Instagram Business account in chat.
            </div>
          </PlatformCard>

          {/* TikTok */}
          <PlatformCard platform={platforms[2]} content={content.tiktok}>
            <PlatformField label="Video Script" value={content.tiktok?.script} onCopy={() => copyToClipboard(content.tiktok?.script, 'tt-script')} copied={copied === 'tt-script'} />
            <PlatformField label="Caption" value={content.tiktok?.caption} onCopy={() => copyToClipboard(content.tiktok?.caption, 'tt-caption')} copied={copied === 'tt-caption'} />
            <PlatformField label="Hashtags" value={content.tiktok?.hashtags?.join(' ')} onCopy={() => copyToClipboard(content.tiktok?.hashtags?.join(' '), 'tt-tags')} copied={copied === 'tt-tags'} />
            <PlatformField label="Video Concept" value={content.tiktok?.video_concept} onCopy={() => copyToClipboard(content.tiktok?.video_concept, 'tt-concept')} copied={copied === 'tt-concept'} />
          </PlatformCard>

          {/* YouTube */}
          <PlatformCard platform={platforms[3]} content={content.youtube}>
            <PlatformField label="Title" value={content.youtube?.title} onCopy={() => copyToClipboard(content.youtube?.title, 'yt-title')} copied={copied === 'yt-title'} />
            <PlatformField label="Description" value={content.youtube?.description} onCopy={() => copyToClipboard(content.youtube?.description, 'yt-desc')} copied={copied === 'yt-desc'} />
            <PlatformField label="Tags" value={content.youtube?.tags?.join(', ')} onCopy={() => copyToClipboard(content.youtube?.tags?.join(', '), 'yt-tags')} copied={copied === 'yt-tags'} />
            <PlatformField label="Thumbnail Concept" value={content.youtube?.thumbnail_concept} onCopy={() => copyToClipboard(content.youtube?.thumbnail_concept, 'yt-thumb')} copied={copied === 'yt-thumb'} />
          </PlatformCard>

          {/* Snapchat */}
          <PlatformCard platform={platforms[4]} content={content.snapchat}>
            <PlatformField label="Caption" value={content.snapchat?.caption} onCopy={() => copyToClipboard(content.snapchat?.caption, 'sc-cap')} copied={copied === 'sc-cap'} />
            <PlatformField label="Image Prompt" value={content.snapchat?.image_prompt} onCopy={() => copyToClipboard(content.snapchat?.image_prompt, 'sc-prompt')} copied={copied === 'sc-prompt'} />
          </PlatformCard>

          {/* Regenerate */}
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button onClick={generate} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px',
              background: '#fff', border: '1px solid #ddd', borderRadius: 8,
              fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#666',
            }}>
              <Zap size={16} /> Regenerate Content
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const postBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
  background: '#1877F2', color: '#fff', border: 0, borderRadius: 6,
  fontWeight: 700, fontSize: 12, cursor: 'pointer', marginTop: 8,
};

function PlatformCard({ platform, content, result, children }) {
  const Icon = platform.icon;
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        borderBottom: '1px solid #eee', background: '#f8f7f4',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: platform.color, display: 'grid', placeItems: 'center' }}>
          <Icon size={18} style={{ color: platform.id === 'snapchat' ? '#000' : '#fff' }} />
        </div>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 15 }}>{platform.name}</b>
          <span style={{ fontSize: 11, marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: platform.connected ? '#d4edda' : '#eee', color: platform.connected ? '#237A4B' : '#888' }}>
            {platform.connected ? 'Connected' : platform.autoPost ? 'Needs connection' : 'Manual posting'}
          </span>
        </div>
        {result?.success && <Check size={18} style={{ color: '#237A4B' }} />}
      </div>
      <div style={{ padding: 16 }}>
        {children}
        {result?.error && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#f5d8d5', borderRadius: 6, fontSize: 12, color: '#a52d23' }}>
            {result.error}
          </div>
        )}
        {result?.success && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#d4edda', borderRadius: 6, fontSize: 12, color: '#237A4B' }}>
            ✓ Posted to {result.page} — post ID: {result.post_id}
          </div>
        )}
      </div>
    </div>
  );
}

function PlatformField({ label, value, onCopy, copied }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <small style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</small>
        <button onClick={onCopy} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 2, color: copied ? '#237A4B' : '#999' }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      <div style={{ padding: '8px 10px', background: '#f8f7f4', borderRadius: 6, fontSize: 12, color: '#333', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
        {value}
      </div>
    </div>
  );
}