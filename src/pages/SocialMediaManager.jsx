import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Facebook, Send, Calendar, BarChart3, RefreshCw, ExternalLink, Users, Eye, ThumbsUp } from 'lucide-react';

export default function SocialMediaManager() {
  const [pages, setPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [selectedPage, setSelectedPage] = useState(null);
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState(null);
  const [pagePosts, setPagePosts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState([]);

  const loadPages = useCallback(async () => {
    setLoadingPages(true);
    try {
      const res = await base44.functions.invoke('facebookManager', { action: 'list_pages' });
      setPages(res.pages || []);
    } catch (e) {
      console.error('Failed to load pages:', e);
    } finally { setLoadingPages(false); }
  }, []);

  const loadScheduled = useCallback(async () => {
    try {
      const posts = await base44.entities.SocialPost.filter(
        { platform: 'facebook', status: 'scheduled' }, 'scheduled_time', 20
      );
      setScheduledPosts(posts || []);
    } catch (e) {}
  }, []);

  useEffect(() => { loadPages(); loadScheduled(); }, [loadPages, loadScheduled]);

  const selectPage = async (page) => {
    setSelectedPage(page);
    setPagePosts([]); setInsights(null); setPostResult(null);
    setLoadingPosts(true);
    try {
      const [postsRes, insRes] = await Promise.all([
        base44.functions.invoke('facebookManager', { action: 'posts', page_id: page.id, page_access_token: page.access_token }),
        base44.functions.invoke('facebookManager', { action: 'insights', page_id: page.id, page_access_token: page.access_token })
      ]);
      setPagePosts(postsRes.posts || []);
      setInsights(insRes.insights || null);
    } catch (e) { console.error(e); }
    finally { setLoadingPosts(false); }
  };

  const postNow = async () => {
    if (!message.trim() || !selectedPage) return;
    setPosting(true); setPostResult(null);
    try {
      const res = await base44.functions.invoke('facebookManager', {
        action: 'post',
        page_id: selectedPage.id,
        page_access_token: selectedPage.access_token,
        page_name: selectedPage.name,
        message,
        link_url: linkUrl || null
      });
      setPostResult({ type: 'success', msg: res.message });
      setMessage(''); setLinkUrl('');
      selectPage(selectedPage);
    } catch (e) {
      setPostResult({ type: 'error', msg: e.message || 'Post failed' });
    } finally { setPosting(false); }
  };

  const schedulePost = async () => {
    if (!message.trim() || !selectedPage || !scheduleTime) return;
    setPosting(true); setPostResult(null);
    try {
      const res = await base44.functions.invoke('facebookManager', {
        action: 'schedule',
        page_id: selectedPage.id,
        page_access_token: selectedPage.access_token,
        page_name: selectedPage.name,
        message,
        link_url: linkUrl || null,
        scheduled_time: new Date(scheduleTime).toISOString()
      });
      setPostResult({ type: 'success', msg: res.message });
      setMessage(''); setLinkUrl(''); setScheduleTime('');
      loadScheduled();
    } catch (e) {
      setPostResult({ type: 'error', msg: e.message || 'Schedule failed' });
    } finally { setPosting(false); }
  };

  return (
    <div className="portal-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Social Media Manager</p>
          <h1 style={{ fontSize: 36, fontFamily: 'Libre Caslon Display, serif' }}>Facebook Pages Manager</h1>
          <p style={{ color: '#666', fontSize: 15, marginTop: 6 }}>Post, schedule, and track engagement across all your Facebook business pages in one place.</p>
        </div>
        <button onClick={loadPages} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <RefreshCw size={14} /> Refresh Pages
        </button>
      </div>

      {/* Pages grid */}
      {loadingPages ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13 }}>Loading your Facebook Pages...</p>
        </div>
      ) : pages.length === 0 ? (
        <div style={{ padding: 40, border: '1px dashed #ddd', borderRadius: 12, textAlign: 'center', color: '#888' }}>
          <Facebook size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>No Facebook Pages found. Make sure you manage at least one Facebook Page and the connector is authorized.</p>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Facebook size={20} style={{ color: '#1877f2' }} /> Your Pages ({pages.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
            {pages.map(p => {
              const active = selectedPage?.id === p.id;
              return (
                <button key={p.id} onClick={() => selectPage(p)}
                  style={{ background: active ? '#0b0b0b' : '#fff', color: active ? '#fff' : '#333', border: `1px solid ${active ? '#0b0b0b' : '#e5e1da'}`, borderRadius: 12, padding: 16, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <b style={{ fontSize: 14, display: 'block' }}>{p.name}</b>
                  <small style={{ fontSize: 11, opacity: .7, display: 'block', marginTop: 4 }}>{p.category || 'Business'}</small>
                  {p.fan_count > 0 && <div style={{ fontSize: 11, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, opacity: .8 }}><Users size={11} /> {p.fan_count.toLocaleString()} fans</div>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Selected page panel */}
      {selectedPage && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Post composer */}
          <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Post to {selectedPage.name}</h3>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Write your post..."
              style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, resize: 'vertical', marginBottom: 12 }} />
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="Link URL (optional)"
              style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, marginBottom: 12 }} />
            <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={postNow} disabled={posting || !message.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', borderRadius: 8, background: posting ? '#ccc' : '#1877f2', color: '#fff', fontSize: 13, fontWeight: 700, border: 0, cursor: posting ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                <Send size={14} /> Post Now
              </button>
              <button onClick={schedulePost} disabled={posting || !message.trim() || !scheduleTime}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', borderRadius: 8, background: posting ? '#ccc' : '#0b0b0b', color: '#fff', fontSize: 13, fontWeight: 700, border: 0, cursor: posting ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                <Calendar size={14} /> Schedule
              </button>
            </div>
            {postResult && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: postResult.type === 'success' ? '#d4edda' : '#f5d8d5', color: postResult.type === 'success' ? '#155724' : '#a52d23', fontSize: 13 }}>
                {postResult.msg}
              </div>
            )}
          </div>

          {/* Insights */}
          <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={16} /> Page Insights (7-day)
            </h3>
            {loadingPosts ? (
              <div style={{ textAlign: 'center', padding: 20 }}><Loader2 size={20} className="animate-spin" style={{ margin: '0 auto' }} /></div>
            ) : insights ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {Object.entries(insights).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: '#666', textTransform: 'capitalize' }}>{key.replace(/page_/g, '').replace(/_/g, ' ')}</span>
                    <b style={{ fontSize: 18, fontFamily: 'Libre Caslon Display, serif' }}>{(val.total || 0).toLocaleString()}</b>
                  </div>
                ))}
                {!Object.keys(insights).length && <p style={{ fontSize: 13, color: '#888' }}>No insight data available yet.</p>}
              </div>
            ) : <p style={{ fontSize: 13, color: '#888' }}>No insights available.</p>}
          </div>
        </div>
      )}

      {/* Scheduled posts */}
      {scheduledPosts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={16} /> Scheduled Posts ({scheduledPosts.length})
          </h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {scheduledPosts.map(p => (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 13 }}>{p.page_name}</b>
                  <p style={{ fontSize: 12, color: '#666', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content}</p>
                </div>
                <span style={{ fontSize: 11, background: '#f8e5ce', color: '#a85c00', padding: '4px 10px', borderRadius: 10, flexShrink: 0 }}>
                  {new Date(p.scheduled_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent posts */}
      {selectedPage && pagePosts.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Recent Posts on {selectedPage.name}</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {pagePosts.map(p => (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 14 }}>
                <p style={{ fontSize: 13, marginBottom: 8 }}>{p.message || '(No text - photo/link post)'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <small style={{ fontSize: 11, color: '#888' }}>{new Date(p.created_time).toLocaleString()}</small>
                  {p.permalink_url && <a href={p.permalink_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#1877f2', fontSize: 12, fontWeight: 600 }}><ExternalLink size={12} /> View on Facebook</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}