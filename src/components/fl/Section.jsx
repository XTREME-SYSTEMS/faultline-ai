export default function Section({ eyebrow, title, intro, children, dark = false, soft = false }) {
  return (
    <section className={`section ${dark ? 'dark-section' : ''} ${soft ? 'soft-section' : ''}`}>
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {intro && <p>{intro}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}