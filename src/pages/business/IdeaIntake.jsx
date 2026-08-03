import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BusinessShell from '@/components/fl/BusinessShell';

// IdeaIntake — conversational AI-guided intake
// The AI asks progressive questions one at a time, building up the project profile

export default function IdeaIntake() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [asking, setAsking] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (projectId) loadProject();
  }, [projectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadProject = async () => {
    try {
      const p = await base44.entities.BusinessProject.get(projectId);
      setProject(p);
      // Pre-fill answers from project fields
      const prefilled = {};
      if (p.industry) prefilled.industry = p.industry;
      if (p.location) prefilled.location = p.location;
      if (p.audience) prefilled.audience = p.audience;
      if (p.business_type) prefilled.business_type = p.business_type;
      setAnswers(prefilled);
      // Start with the idea as the first message
      setMessages([{ role: 'bot', text: `Great idea: "${p.idea}". Let me ask a few quick questions to build your business properly.` }]);
      askNextQuestion(p.idea, prefilled);
    } catch (e) {
      setError('Project not found');
      setLoading(false);
    }
  };

  const askNextQuestion = async (idea, currentAnswers) => {
    setAsking(true);
    try {
      const res = await base44.functions.invoke('businessOrchestrator', {
        action: 'get_intake_questions',
        idea,
        existing_answers: currentAnswers
      });
      const q = res.data?.question;
      if (q?.complete) {
        setCurrentQuestion(null);
        setMessages(prev => [...prev, { role: 'bot', text: "I have everything I need. Let's move to discovery — I'll research your market, competitors, and opportunities.", isComplete: true }]);
      } else if (q?.question) {
        setCurrentQuestion(q);
        setMessages(prev => [...prev, { role: 'bot', text: q.question, options: q.options, field: q.field, rationale: q.rationale }]);
      }
    } catch (e) {
      setError('Failed to generate question');
    } finally {
      setAsking(false);
      setLoading(false);
    }
  };

  const answer = (value) => {
    if (!currentQuestion || !value.trim()) return;
    const field = currentQuestion.field;
    const newAnswers = { ...answers, [field]: value };
    setAnswers(newAnswers);
    setMessages(prev => [...prev, { role: 'user', text: value }]);
    setUserInput('');
    // Ask next question after a brief delay
    setTimeout(() => askNextQuestion(project.idea, newAnswers), 400);
  };

  const skip = () => {
    if (!currentQuestion) return;
    setMessages(prev => [...prev, { role: 'user', text: 'Skip', isSkip: true }]);
    setTimeout(() => askNextQuestion(project.idea, answers), 400);
  };

  const completeIntake = async () => {
    setCompleting(true);
    try {
      // Update project with all answers
      const updateData = {
        current_phase: 'discovery',
        progress: 10,
        intake_complete: true
      };
      if (answers.industry) updateData.industry = answers.industry;
      if (answers.location) updateData.location = answers.location;
      if (answers.audience) updateData.audience = answers.audience;
      if (answers.business_type) updateData.business_type = answers.business_type;
      if (answers.budget) updateData.budget = answers.budget;
      if (answers.experience_level) updateData.experience_level = answers.experience_level;
      if (answers.launch_speed) updateData.launch_speed = answers.launch_speed;
      if (answers.revenue_target) updateData.revenue_target = answers.revenue_target;

      await base44.entities.BusinessProject.update(projectId, updateData);

      // Store intake responses
      const intakeRecords = Object.entries(answers).map(([field, answer]) => ({
        organization_id: project.organization_id,
        project_id: projectId,
        question: `What is your ${field.replace(/_/g, ' ')}?`,
        answer,
        source: 'user',
        confidence: 1,
        phase: 'intake',
        field
      }));
      if (intakeRecords.length > 0) {
        await base44.entities.IntakeResponse.bulkCreate(intakeRecords);
      }

      // Create a discovery job
      await base44.functions.invoke('businessOrchestrator', {
        action: 'create_job',
        project_id: projectId,
        agent_type: 'discovery_strategist',
        job_type: 'market_research',
        phase: 'discovery',
        input: { idea: project.idea, ...answers }
      });

      navigate(`/app/business/${projectId}/discovery`);
    } catch (e) {
      setError(e.message || 'Failed to complete intake');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <BusinessShell><div style={{ textAlign: 'center', padding: 60, color: '#73777F' }}>Loading…</div></BusinessShell>;
  if (error && !project) return <BusinessShell><div style={{ textAlign: 'center', padding: 60, color: '#C63D34' }}>{error}</div></BusinessShell>;

  const rightPanel = (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: '#D4AF37', margin: 0 }}>Intake Progress</p>
      <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, margin: '8px 0 16px' }}>Building your profile</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {['industry', 'location', 'audience', 'business_type', 'budget', 'experience_level', 'launch_speed', 'revenue_target'].map(f => {
          const answered = answers[f];
          return (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ fontSize: 14 }}>{answered ? '✅' : '⬜'}</span>
              <span style={{ textTransform: 'capitalize', color: answered ? '#202124' : '#73777F', fontWeight: answered ? 600 : 400 }}>
                {f.replace(/_/g, ' ')}
              </span>
              {answered && <span style={{ marginLeft: 'auto', color: '#73777F', fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{answered}</span>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 20, padding: 14, background: '#F8F9FB', borderRadius: 8, fontSize: 12, color: '#73777F', lineHeight: 1.5 }}>
        <b style={{ color: '#202124' }}>Why we ask:</b> Each answer sharpens the research, brand, and financial models. You can skip any question — the AI will infer or ask again later.
      </div>
    </div>
  );

  return (
    <BusinessShell project={project} rightPanel={rightPanel}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <p style={{ color: '#D4AF37', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Phase · Intake</p>
        <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 40, margin: '8px 0 0', letterSpacing: '-.03em' }}>Let's build your business</h1>
        <p style={{ color: '#73777F', fontSize: 15, margin: '8px 0 28px' }}>Answer a few quick questions. Skip any you're unsure about — the AI will figure it out.</p>

        {error && <div style={{ background: '#fde8e8', color: '#C63D34', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

        {/* Chat messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}>
                <div style={{
                  background: m.role === 'user' ? '#0F0F10' : '#fff',
                  border: m.role === 'user' ? 'none' : '1px solid #C7CCD4',
                  borderRadius: 12, padding: '14px 18px', fontSize: 14, lineHeight: 1.6,
                  color: m.role === 'user' ? '#fff' : '#202124'
                }}>
                  {m.text}
                  {m.rationale && <p style={{ fontSize: 12, color: '#73777F', margin: '8px 0 0', fontStyle: 'italic' }}>💡 {m.rationale}</p>}
                </div>
                {/* Option buttons for current question */}
                {m.options && i === messages.length - 1 && m.role === 'bot' && !m.isComplete && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    {m.options.map((opt, j) => (
                      <button key={j} onClick={() => answer(opt)} style={{
                        padding: '8px 14px', background: '#fff', border: '1px solid #D4AF37', borderRadius: 20,
                        color: '#202124', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                      }}>{opt}</button>
                    ))}
                    <button onClick={skip} style={{
                      padding: '8px 14px', background: 'none', border: '1px solid #C7CCD4', borderRadius: 20,
                      color: '#73777F', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
                    }}>Skip</button>
                  </div>
                )}
                {/* Complete button */}
                {m.isComplete && i === messages.length - 1 && (
                  <button onClick={completeIntake} disabled={completing} style={{
                    marginTop: 12, background: '#D4AF37', color: '#0F0F10', border: 0, borderRadius: 8,
                    padding: '13px 28px', fontSize: 14, fontWeight: 700, cursor: completing ? 'wait' : 'pointer', fontFamily: 'inherit'
                  }}>
                    {completing ? 'Starting discovery…' : 'Start Discovery →'}
                  </button>
                )}
              </div>
            ))}
            {asking && (
              <div style={{ alignSelf: 'flex-start', background: '#fff', border: '1px solid #C7CCD4', borderRadius: 12, padding: '14px 18px' }}>
                <span className="dot-anim" style={{ fontSize: 16, color: '#D4AF37' }}>●●●</span>
              </div>
            )}
            <div ref={chatEndRef} />
        </div>

        {/* Free-text input (always available) */}
        {currentQuestion && !asking && (
          <div style={{ display: 'flex', gap: 8, position: 'sticky', bottom: 0, background: '#F8F9FB', padding: '12px 0' }}>
            <input
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && userInput.trim() && answer(userInput)}
              placeholder="Type your answer…"
              style={{
                flex: 1, padding: 12, border: '1px solid #C7CCD4', borderRadius: 8, fontSize: 14, fontFamily: 'inherit'
              }}
            />
            <button onClick={() => userInput.trim() && answer(userInput)} style={{
              background: '#0F0F10', color: '#fff', border: 0, borderRadius: 8, padding: '0 20px',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
            }}>Send</button>
          </div>
        )}
      </div>
    </BusinessShell>
  );
}