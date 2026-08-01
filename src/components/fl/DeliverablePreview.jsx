/**
 * Visual preview card for a sample deliverable report.
 * Pure presentational — no data fetching.
 */
export default function DeliverablePreview({ label, metric, variant = 'dark', lines = 3 }) {
  const isLight = variant === 'light';
  return (
    <div className={`report-preview ${isLight ? 'report-preview--light' : ''}`}>
      <small>FAULTLINE AI</small>
      <strong>{label}</strong>
      {metric && <span className="metric">{metric}</span>}
      <div className="preview-lines">
        {Array.from({ length: lines }).map((_, i) => (
          <i key={i} style={{ width: `${[100, 78, 55][i] ?? 60}%` }} />
        ))}
      </div>
    </div>
  );
}