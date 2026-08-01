export default function PageHead({ eyebrow, title, text }) {
  return (
    <div className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      <button className="btn dark">Start workflow</button>
    </div>
  );
}