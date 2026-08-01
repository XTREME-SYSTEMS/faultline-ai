import PortalShell from '@/components/fl/PortalShell';
import PageHead from '@/components/fl/PageHead';
import { metrics, findings } from '@/components/fl/data';

export default function Overview() {
  return (
    <PortalShell assistant>
      <PageHead eyebrow="Business operating system" title="Welcome back, Alex." text="Review what changed, what matters, and what needs a decision." />
      <div className="metrics">
        {metrics.map(([l, v, d, t]) => (
          <article key={l}>
            <small>{l}</small>
            <b>{v}</b>
            <span>{d}</span>
            <em>{t}</em>
          </article>
        ))}
      </div>
      <div className="dashboard">
        <article className="wide">
          <h3>AI audit overview</h3>
          <div className="health">
            <div className="ring">
              <b>72</b>
              <small>/100</small>
            </div>
            <ul>
              <li>Data foundation <b>78</b></li>
              <li>Process maturity <b>66</b></li>
              <li>Technology <b>70</b></li>
              <li>People & culture <b>68</b></li>
            </ul>
          </div>
        </article>
        <article>
          <h3>Revenue exposure</h3>
          <b className="big">$1.82M</b>
          <p>Annual modeled risk</p>
          <div className="bars">
            {[45, 68, 52, 78, 63, 91].map((h, i) => (
              <i style={{ height: `${h}%` }} key={i} />
            ))}
          </div>
        </article>
        <article className="wide">
          <h3>System map</h3>
          <div className="map">
            <span>Lead intake</span>
            <span>Order processing</span>
            <span>Inventory</span>
            <span>Fulfillment</span>
            <span>Customer support</span>
            <span>Billing & AR</span>
          </div>
        </article>
        <article>
          <h3>Repair plan</h3>
          <ul className="repair">
            <li>Stabilize failures <b>7</b></li>
            <li>Capture quick wins <b>6</b></li>
            <li>Build for scale <b>9</b></li>
            <li>Monitor outcomes <b>11</b></li>
          </ul>
        </article>
      </div>
      <section className="finding">
        <h2>Highest-impact findings</h2>
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Finding</th>
                <th>Severity</th>
                <th>Evidence</th>
                <th>Impact</th>
                <th>Owner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr key={f.id}>
                  <td><b>{f.title}</b><small>{f.id}</small></td>
                  <td><span className={`pill ${f.severity.toLowerCase()}`}>{f.severity}</span></td>
                  <td>{f.evidence}<small>{f.confidence}% confidence</small></td>
                  <td>{f.impact}</td>
                  <td>{f.owner}</td>
                  <td>{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PortalShell>
  );
}