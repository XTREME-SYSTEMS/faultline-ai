import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, Loader2, Zap, Plus, Trash2, Globe, CheckCircle2,
  AlertCircle, RefreshCw, Search, Sparkles, ExternalLink, Gauge,
  TrendingUp, BarChart3, Target, Tag, FileText, Bot, X, Eye, EyeOff,
} from 'lucide-react';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import PwaInstallButton from '@/components/PwaInstallButton';

export default function SEOConsole() {
  const [projects, setProjects] = useState([]);
  const [launchProjects, setLaunchProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [repoInput, setRepoInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, launches] = await Promise.all([
        base44.entities.SEOProject.list('-created_date', 100),
        base44.entities.LaunchProject.filter({ status: 'passed' }, '-created_date', 50).catch(() => []),
      ]);
      setProjects(list);
      setLaunchProjects(launches);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setAdding(true);
    setError('');
    try {
      const user = await base44.auth.me();
      const orgId = user?.data?.organization_id || user?.organization_id;
      await base44.entities.SEOProject.create({
        organization_id: orgId,
        site_url: urlInput.trim(),
        site_name: nameInput.trim() || urlInput.trim().replace(/^https?:\/\//, '').replace(/\/$/, '').split('.')[0],
        github_repo_url: repoInput.trim() || undefined,
        status: 'not_started',
        autonomous_enabled: true,
      });
      setUrlInput('');
      setNameInput('');
      setRepoInput('');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleAction(projectId, action) {
    setActionLoading(prev => ({ ...prev, [projectId + action]: true }));
    try {
      const project = projects.find(p => p.id === projectId);
      let fnName, payload;
      switch (action) {
        case 'crawl':
          fnName = 'seoCrawlSite';
          payload = { site_url: project.site_url, seo_project_id: projectId };
          break;
        case 'tags':
          fnName = 'seoGenerateTags';
          payload = { site_url: project.site_url, site_name: project.site_name, seo_project_id: projectId, crawl_report: project.crawl_report };
          break;
        case 'inject':
          fnName = 'seoInjectTags';
          payload = { seo_project_id: projectId, github_repo_url: project.github_repo_url, site_url: project.site_url, generated_tags: project.generated_tags, ga_measurement_id: project.ga_measurement_id };
          break;
        case 'ga':
          fnName = 'seoSetupAnalytics';
          payload = { site_url: project.site_url, site_name: project.site_name, seo_project_id: projectId };
          break;
        case 'sc':
          fnName = 'seoSubmitToSearchConsole';
          payload = { site_url: project.site_url, sitemap_url: project.sitemap_url, seo_project_id: projectId };
          break;
        case 'rank':
          fnName = 'seoTrackRankings';
          payload = { site_url: project.site_url, seo_project_id: projectId };
          break;
        case 'full':
          fnName = 'autonomousSEOEngine';
          payload = {};
          break;
      }
      await base44.functions.invoke(fnName, payload);
      setTimeout(load, 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [projectId + action]: false }));
    }
  }

  async function handleRunEngine() {
    setRunning(true);
    setError('');
    setRunResult(null);
    try {
      const res = await base44.functions.invoke('autonomousSEOEngine', {});
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setRunResult(d);
      setTimeout(load, 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this SEO project?')) return;
    try {
      await base44.entities.SEOProject.delete(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleToggleAutonomous(project) {
    await base44.entities.SEOProject.update(project.id, { autonomous_enabled: !project.autonomous_enabled });
    load();
  }

  async function handleLinkLaunch(seoProjectId, launchProjectId) {
    const lp = launchProjects.find(p => p.id === launchProjectId);
    await base44.entities.SEOProject.update(seoProjectId, {
      github_repo_url: lp?.github_repo_url,
      site_name: lp?.project_name || lp?.business_name,
      launch_project_id: launchProjectId,
    });
    load();
  }

  const stats = {
    total: projects.length,
    avgScore: projects.length > 0 ? Math.round(projects.reduce((s, p) => s + (p.seo_score || 0), 0) / projects.length) : 0,
    totalClicks: projects.reduce((s, p) => s + (p.total_clicks || 0), 0),
    avgPosition: projects.filter(p => p.avg_position > 0).length > 0
      ? (projects.filter(p => p.avg_position > 0).reduce((s, p) => s + p.avg_position, 0) / projects.filter(p => p.avg_position > 0).length).toFixed(1)
      : '—',
    gaSetup: projects.filter(p => p.ga_measurement_id).length,
    scVerified: projects.filter(p => p.search_console_verified).length,
    tagsInjected: projects.filter(p => p.tags_injected).length,
  };

  return (
    <>
      <XtremeOSSidebar />
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240 }}>
        {/* Header */}
        <div style={{
          background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a',
          color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Autonomous SEO Engine</p>
            <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 38, margin: '8px 0 4px', letterSpacing: '-.03em' }}>
              SEO <span style={{ color: '#E7C86E' }}>Console</span>
            </h1>
            <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>
              Crawl → Tag → Inject → GA4 → Search Console → Track Rankings. Fully autonomous.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <PwaInstallButton variant="dark" />
            <Link to="/app" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#aaa', fontSize: 13 }}>
              <ChevronLeft size={16} /> Back
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 13, marginBottom: 20, flexWrap: 'wrap' }}>
          <StatCard label="Sites" value={stats.total} icon={Globe} color="#C89B3C" />
          <StatCard label="Avg SEO Score" value={stats.avgScore} icon={Gauge} color={stats.avgScore >= 70 ? '#237A4B' : '#B88214'} />
          <StatCard label="Total Clicks" value={stats.totalClicks} icon={TrendingUp} color="#2563eb" />
          <StatCard label="Avg Position" value={stats.avgPosition} icon={Target} color="#4f46e5" />
          <StatCard label="GA Setup" value={stats.gaSetup} icon={BarChart3} color="#237A4B" />
          <StatCard label="SC Verified" value={stats.scVerified} icon={CheckCircle2} color="#237A4B" />
          <StatCard label="Tags Injected" value={stats.tagsInjected} icon={Tag} color="#237A4B" />
        </div>

        {/* Add Site Form */}
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', display: 'grid', placeItems: 'center' }}>
              <Plus size={20} style={{ color: '#111' }} />
            </div>
            <div>
              <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 20, margin: 0 }}>Add Site to SEO Engine</h3>
              <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>Enter the deployed URL. Optionally add the GitHub repo for auto tag injection.</p>
            </div>
          </div>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://example.com"
              style={{ flex: '2 1 300px', padding: '12px 14px', border: '1px solid #d7d7d7', borderRadius: 8, fontSize: 14, background: '#fff', color: '#111', outline: 'none' }}
              autoFocus
            />
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Site name (optional)"
              style={{ flex: '1 1 180px', padding: '12px 14px', border: '1px solid #d7d7d7', borderRadius: 8, fontSize: 14, background: '#fff', color: '#111', outline: 'none' }}
            />
            <input
              value={repoInput}
              onChange={e => setRepoInput(e.target.value)}
              placeholder="GitHub repo URL (optional)"
              style={{ flex: '2 1 300px', padding: '12px 14px', border: '1px solid #d7d7d7', borderRadius: 8, fontSize: 14, background: '#fff', color: '#111', outline: 'none' }}
            />
            <button type="submit" disabled={adding || !urlInput.trim()} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
              background: adding ? '#666' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
              border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: adding ? 'wait' : 'pointer',
            }}>
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {adding ? 'Adding…' : 'Add Site'}
            </button>
          </form>
          {error && (
            <div style={{ marginTop: 12, padding: 12, background: '#f5d8d5', borderRadius: 8, color: '#a52d23', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Run Engine Button */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <button onClick={handleRunEngine} disabled={running} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px',
            background: running ? '#333' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
            border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: running ? 'wait' : 'pointer',
          }}>
            {running ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
            {running ? 'Running Autonomous Engine…' : 'Run Autonomous Engine (All Sites)'}
          </button>
          <span style={{ fontSize: 12, color: '#888' }}>
            Runs the full pipeline: crawl → tags → inject → GA → Search Console → rankings
          </span>
        </div>

        {/* Run Result */}
        {runResult && (
          <div style={{ marginBottom: 20, padding: 16, background: '#e8f5ec', border: '1px solid #237A4B', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <b style={{ color: '#237A4B', fontSize: 14 }}>
                <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6 }} />
                Processed {runResult.processed} sites
              </b>
              <button onClick={() => setRunResult(null)} style={{ background: 'none', border: 0, cursor: 'pointer' }}>
                <X size={16} color="#999" />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {runResult.results?.map((r, i) => (
                <div key={i} style={{ padding: '8px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: 6, fontSize: 12 }}>
                  <b>{r.site_name || r.site_url}</b>
                  <span style={{ marginLeft: 8, color: '#888' }}>
                    {r.steps?.map(s => s.step + (s.success ? '✓' : '✗')).join(' → ') || r.error}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project List */}
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gauge size={20} style={{ color: '#C89B3C' }} />
            <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 20, margin: 0 }}>
              SEO Projects ({projects.length})
            </h3>
            <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 0, cursor: 'pointer', color: '#999', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#C89B3C' }} />
              Loading…
            </div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
              <Globe size={48} style={{ opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
              <p style={{ fontSize: 15, margin: '0 0 8px' }}>No SEO projects yet.</p>
              <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Add a deployed site URL above to start ranking.</p>
            </div>
          ) : (
            <div>
              {projects.map(project => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  launchProjects={launchProjects}
                  expanded={expandedId === project.id}
                  onToggle={() => setExpandedId(expandedId === project.id ? null : project.id)}
                  onAction={handleAction}
                  onDelete={handleDelete}
                  onToggleAuto={handleToggleAutonomous}
                  onLinkLaunch={handleLinkLaunch}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ProjectRow({ project, launchProjects, expanded, onToggle, onAction, onDelete, onToggleAuto, onLinkLaunch, actionLoading }) {
  const score = project.seo_score || 0;
  const scoreColor = score >= 80 ? '#237A4B' : score >= 50 ? '#B88214' : '#C63D34';

  return (
    <div style={{ borderBottom: '1px solid #f0f0f0' }}>
      <div
        onClick={onToggle}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
      >
        <div style={{ width: 48, height: 48, borderRadius: 10, border: `2px solid ${scoreColor}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18, color: scoreColor }}>{score}</b>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.site_name || 'Unnamed'}
          </b>
          <a href={project.site_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 3 }}>
            <ExternalLink size={10} /> {project.site_url?.replace(/^https?:\/\//, '').slice(0, 50)}
          </a>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Badge active={!!project.ga_measurement_id} label="GA4" />
          <Badge active={project.search_console_verified} label="SC" />
          <Badge active={project.tags_injected} label="Tags" />
          <Badge active={project.sitemap_submitted} label="Sitemap" />
        </div>
        <StatusBadge status={project.status} />
        <button
          onClick={e => { e.stopPropagation(); onToggleAuto(project); }}
          style={{
            padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
            background: project.autonomous_enabled ? '#237A4B' : '#eee',
            color: project.autonomous_enabled ? '#fff' : '#888',
            border: 'none', cursor: 'pointer',
          }}
        >
          {project.autonomous_enabled ? 'AUTO ON' : 'AUTO OFF'}
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(project.id); }} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, color: '#C63D34' }}>
          <Trash2 size={16} />
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0f0f0' }}>
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
            <ActionButton onClick={() => onAction(project.id, 'crawl')} loading={actionLoading[project.id + 'crawl']} icon={Search} label="Crawl" />
            <ActionButton onClick={() => onAction(project.id, 'tags')} loading={actionLoading[project.id + 'tags']} icon={Tag} label="Generate Tags" />
            <ActionButton onClick={() => onAction(project.id, 'inject')} loading={actionLoading[project.id + 'inject']} icon={FileText} label="Inject Tags" disabled={!project.github_repo_url} />
            <ActionButton onClick={() => onAction(project.id, 'ga')} loading={actionLoading[project.id + 'ga']} icon={BarChart3} label="Setup GA4" />
            <ActionButton onClick={() => onAction(project.id, 'sc')} loading={actionLoading[project.id + 'sc']} icon={CheckCircle2} label="Submit SC" />
            <ActionButton onClick={() => onAction(project.id, 'rank')} loading={actionLoading[project.id + 'rank']} icon={TrendingUp} label="Track Rankings" />
            <ActionButton onClick={() => onAction(project.id, 'full')} loading={actionLoading[project.id + 'full']} icon={Bot} label="Full Pipeline" primary />
          </div>

          {/* Link to LaunchProject */}
          {!project.launch_project_id && launchProjects.length > 0 && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f8f7f4', borderRadius: 8, fontSize: 12 }}>
              <b style={{ color: '#8A641C' }}>Link to a launched clone:</b>
              <select
                onChange={e => e.target.value && onLinkLaunch(project.id, e.target.value)}
                style={{ marginLeft: 10, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }}
                defaultValue=""
              >
                <option value="">Select a project…</option>
                {launchProjects.map(lp => (
                  <option key={lp.id} value={lp.id}>{lp.project_name || lp.business_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Crawl Report */}
            <DetailCard title="Crawl Report" icon={Search}>
              {project.crawl_report ? (
                <div style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                  <DetailRow label="Title" value={project.crawl_report.titleValue || '—'} ok={project.crawl_report.hasTitle} />
                  <DetailRow label="Description" value={project.crawl_report.descriptionValue || '—'} ok={project.crawl_report.hasDescription} />
                  <DetailRow label="Canonical" value={project.crawl_report.canonicalValue || '—'} ok={project.crawl_report.hasCanonical} />
                  <DetailRow label="OG Tags" value={project.crawl_report.hasOgTags ? '✓' : '✗'} ok={project.crawl_report.hasOgTags} />
                  <DetailRow label="Twitter Card" value={project.crawl_report.hasTwitterCard ? '✓' : '✗'} ok={project.crawl_report.hasTwitterCard} />
                  <DetailRow label="JSON-LD Schema" value={project.crawl_report.hasJsonLd ? '✓' : '✗'} ok={project.crawl_report.hasJsonLd} />
                  <DetailRow label="H1 Count" value={project.crawl_report.h1s?.length || 0} ok={project.crawl_report.singleH1} />
                  <DetailRow label="Images w/o Alt" value={project.crawl_report.imagesWithoutAlt || 0} ok={project.crawl_report.imagesHaveAlt} />
                  <DetailRow label="Sitemap" value={project.crawl_report.hasSitemap ? '✓' : '✗'} ok={project.crawl_report.hasSitemap} />
                  <DetailRow label="robots.txt" value={project.crawl_report.hasRobotsTxt ? '✓' : '✗'} ok={project.crawl_report.hasRobotsTxt} />
                  <DetailRow label="HTTPS" value={project.crawl_report.isHttps ? '✓' : '✗'} ok={project.crawl_report.isHttps} />
                </div>
              ) : (
                <p style={{ fontSize: 12, color: '#999' }}>Not crawled yet. Click "Crawl" above.</p>
              )}
            </DetailCard>

            {/* Ranking Data */}
            <DetailCard title="Ranking Data" icon={TrendingUp}>
              {project.ranking_data ? (
                <div style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                  <DetailRow label="Clicks" value={project.ranking_data.totalClicks || 0} />
                  <DetailRow label="Impressions" value={project.ranking_data.totalImpressions || 0} />
                  <DetailRow label="Avg Position" value={project.ranking_data.avgPosition || '—'} />
                  <DetailRow label="CTR" value={(project.ranking_data.ctr || 0) + '%'} />
                  <DetailRow label="Indexed Pages" value={project.ranking_data.indexedPages || 0} />
                  {project.ranking_data.topQueries?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <b style={{ color: '#8A641C', fontSize: 11 }}>Top Queries:</b>
                      <div style={{ display: 'grid', gap: 2, marginTop: 4 }}>
                        {project.ranking_data.topQueries.slice(0, 8).map((q, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666' }}>
                            <span>{q.query}</span>
                            <span>#{q.position} · {q.clicks} clicks</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: '#999' }}>No ranking data yet. Click "Track Rankings" above.</p>
              )}
            </DetailCard>

            {/* Generated Tags */}
            <DetailCard title="Generated Tags" icon={Tag}>
              {project.generated_tags ? (
                <div style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                  <DetailRow label="Title" value={project.generated_tags.meta?.title || '—'} />
                  <DetailRow label="Description" value={(project.generated_tags.meta?.description || '—').slice(0, 80) + '…'} />
                  <DetailRow label="Keywords" value={(project.generated_tags.meta?.keywords || []).join(', ').slice(0, 60)} />
                  <DetailRow label="Sitemap" value={project.sitemap_url || '—'} />
                  <DetailRow label="Tags Injected" value={project.tags_injected ? '✓' : '✗'} ok={project.tags_injected} />
                </div>
              ) : (
                <p style={{ fontSize: 12, color: '#999' }}>No tags generated. Click "Generate Tags" above.</p>
              )}
            </DetailCard>

            {/* GA & SC Status */}
            <DetailCard title="Analytics & Search Console" icon={BarChart3}>
              <div style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                <DetailRow label="GA Property ID" value={project.ga_property_id || '—'} ok={!!project.ga_property_id} />
                <DetailRow label="GA Measurement ID" value={project.ga_measurement_id || '—'} ok={!!project.ga_measurement_id} />
                <DetailRow label="Search Console" value={project.search_console_verified ? 'Verified' : 'Not verified'} ok={project.search_console_verified} />
                <DetailRow label="Sitemap Submitted" value={project.sitemap_submitted ? '✓' : '✗'} ok={project.sitemap_submitted} />
                <DetailRow label="GitHub Repo" value={project.github_repo_url ? '✓' : '—'} ok={!!project.github_repo_url} />
              </div>
            </DetailCard>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '14px 18px', minWidth: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={14} style={{ color }} />
        <small style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</small>
      </div>
      <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 24, display: 'block', color, marginTop: 4 }}>{value}</b>
    </div>
  );
}

function Badge({ active, label }) {
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
      background: active ? '#d4edda' : '#f0f0f0', color: active ? '#237A4B' : '#999',
    }}>
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    not_started: { bg: '#eee', color: '#888', label: 'Not Started' },
    crawling: { bg: '#dbeafe', color: '#2563eb', label: 'Crawling' },
    optimizing: { bg: '#e0e7ff', color: '#4f46e5', label: 'Optimizing' },
    tagging: { bg: '#f8e5ce', color: '#a85c00', label: 'Tagging' },
    submitting: { bg: '#e0e7ff', color: '#4f46e5', label: 'Submitting' },
    monitoring: { bg: '#dbeafe', color: '#2563eb', label: 'Monitoring' },
    ranking: { bg: '#d4edda', color: '#237A4B', label: 'Ranking' },
    failed: { bg: '#f5d8d5', color: '#C63D34', label: 'Failed' },
  };
  const s = map[status] || map.not_started;
  return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>;
}

function ActionButton({ onClick, loading, icon: Icon, label, disabled, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
        background: disabled ? '#f0f0f0' : primary ? 'linear-gradient(135deg, #E7C86E, #C89B3C)' : '#fff',
        color: disabled ? '#ccc' : primary ? '#111' : '#666',
        border: `1px solid ${disabled ? '#eee' : primary ? 'transparent' : '#ddd'}`,
        borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}

function DetailCard({ title, icon: Icon, children }) {
  return (
    <div style={{ background: '#f8f7f4', border: '1px solid #eee', borderRadius: 8, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Icon size={14} style={{ color: '#C89B3C' }} />
        <b style={{ fontSize: 13, color: '#8A641C' }}>{title}</b>
      </div>
      {children}
    </div>
  );
}

function DetailRow({ label, value, ok }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ color: '#888', flexShrink: 0 }}>{label}:</span>
      <span style={{ color: ok === undefined ? '#333' : ok ? '#237A4B' : '#C63D34', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
        {value}
      </span>
    </div>
  );
}