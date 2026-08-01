export default function AiPanel() {
  return (
    <aside className="ai-panel">
      <h3>✦ FaultLine Assistant</h3>
      <div className="chat user">Analyze our website and find the top issues hurting conversion.</div>
      <div className="chat bot">
        <b>Three high-priority opportunities:</b>
        <ol>
          <li>Clarify the value proposition.</li>
          <li>Add proof near decision points.</li>
          <li>Reduce inquiry friction.</li>
        </ol>
        <small>Draft analysis · requires evidence review</small>
      </div>
      <div className="chat bot">Create a repair plan after approval?</div>
      <form onSubmit={(e) => e.preventDefault()}>
        <input placeholder="Ask about this workspace…" />
        <button>→</button>
      </form>
    </aside>
  );
}