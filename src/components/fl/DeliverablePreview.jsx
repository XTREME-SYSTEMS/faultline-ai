import Icon from './Icon';

const bars = [38, 52, 44, 68, 59, 73, 64, 88, 79, 93];

export default function DeliverablePreview({ type }) {
  if (type === 'summary') {
    return (
      <div className="report-preview report-preview--dark" aria-label="Executive audit summary preview">
        <div className="mini-top"><span>Business Health</span><b>62</b></div>
        <div className="mini-chart">{bars.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
        <div className="mini-row"><span>Revenue at risk</span><strong>$2.47M</strong></div>
      </div>
    );
  }
  if (type === 'map') {
    return (
      <div className="report-preview report-preview--dark map-preview" aria-label="Failure map preview">
        <span className="map-node map-node--one">Lead Intake</span><span className="map-node map-node--two">Estimates</span><span className="map-node map-node--three">Fulfillment</span><span className="map-node map-node--four">Billing</span>
        <svg viewBox="0 0 240 150" aria-hidden="true"><path d="M44 44 C90 44 74 76 118 76S144 111 194 111M118 76C145 76 149 45 194 45" /><circle cx="118" cy="76" r="5" /></svg>
      </div>
    );
  }
  if (type === 'leaks') {
    return (
      <div className="report-preview report-preview--light" aria-label="Revenue leak report preview">
        <p className="mini-label">Annual opportunity</p><div className="mini-value">$2.47M</div>
        {[['Missed follow-up', '$714K'], ['Pricing gaps', '$531K'], ['Unbilled work', '$488K']].map(([label, value]) => <div className="leak-row" key={label}><span>{label}</span><b>{value}</b></div>)}
      </div>
    );
  }
  if (type === 'risk') {
    return (
      <div className="report-preview report-preview--light" aria-label="Risk register preview">
        {[['Manual handoffs', 'High'], ['Access gaps', 'High'], ['Vendor dependency', 'Medium'], ['Data quality', 'Low']].map(([label, status]) => <div className="risk-row" key={label}><span>{label}</span><b data-status={status}>{status}</b></div>)}
      </div>
    );
  }
  if (type === 'readiness') {
    return (
      <div className="report-preview report-preview--light score-preview" aria-label="AI readiness score preview">
        <div className="score-ring"><span>62</span><small>/100</small></div><strong>Moderate</strong><p>Clear priorities for data, process, and technology.</p>
      </div>
    );
  }
  return (
    <div className="report-preview report-preview--light" aria-label="90-day repair plan preview">
      {[['0–30 Days', 'Stabilize failures'], ['30–60 Days', 'Capture quick wins'], ['60–90 Days', 'Build for scale']].map(([period, task], index) => <div className="plan-row" key={period}><span><Icon name="check" />{period}</span><b>{task}</b><i className={index === 0 ? 'active' : ''} /></div>)}
    </div>
  );
}