export default function PageHead({ eyebrow, title, text, onAction, actionLabel = 'Start workflow' }) {
  return (
    <div className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      <button className="btn dark" onClick={onAction}>{actionLabel}</button>
    </div>
  );
}