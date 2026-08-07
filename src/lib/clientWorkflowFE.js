// Frontend-safe copy of client workflow questionnaires (base44/shared is Deno-only).
// Kept in sync with base44/shared/clientWorkflow.ts.

export const DISCOVERY_QUESTIONNAIRES = {
  website: [
    { id: 'business_name', question: 'What is your business name?', type: 'text', required: true },
    { id: 'industry', question: 'What industry are you in?', type: 'text', required: true },
    { id: 'goal', question: 'What is the primary goal of this website?', type: 'single', options: ['Generate leads', 'Sell products online', 'Book appointments', 'Showcase portfolio', 'Build brand awareness', 'Provide information'], required: true },
    { id: 'audience', question: 'Who is your target audience?', type: 'text', required: true },
    { id: 'style', question: 'Which visual style do you prefer?', type: 'single', options: ['Modern & minimal', 'Bold & energetic', 'Elegant & premium', 'Friendly & approachable', 'Technical & precise'], required: true },
    { id: 'colors', question: 'Do you have brand colors? (list hex codes or describe)', type: 'text', required: false },
    { id: 'competitors', question: 'List 2-3 competitor or reference websites you like', type: 'text', required: false },
    { id: 'pages', question: 'Which pages do you need?', type: 'multi', options: ['Home', 'About', 'Services', 'Pricing', 'Portfolio', 'Blog', 'Contact', 'FAQ', 'Team'], required: true },
    { id: 'features', question: 'Which features do you want?', type: 'multi', options: ['Contact form', 'Online booking', 'E-commerce', 'Member login', 'Blog/CMS', 'Live chat', 'Newsletter signup', 'Photo gallery', 'Quote calculator'], required: false },
    { id: 'tone', question: 'What tone should the copy have?', type: 'single', options: ['Professional', 'Conversational', 'Authoritative', 'Playful', 'Luxurious'], required: true }
  ],
  app: [
    { id: 'business_name', question: 'What is your product/company name?', type: 'text', required: true },
    { id: 'problem', question: 'What problem does your app solve?', type: 'text', required: true },
    { id: 'audience', question: 'Who are your users?', type: 'text', required: true },
    { id: 'platform', question: 'Which platform(s)?', type: 'multi', options: ['Web (browser)', 'Mobile-responsive web', 'iOS', 'Android', 'Desktop'], required: true },
    { id: 'core_features', question: 'What are the core features?', type: 'text', required: true },
    { id: 'auth', question: 'Do users need to log in?', type: 'single', options: ['Yes — email/password', 'Yes — social login', 'Yes — SSO', 'No'], required: true },
    { id: 'data', question: 'What data will the app manage?', type: 'text', required: false },
    { id: 'integrations', question: 'Which integrations do you need?', type: 'multi', options: ['Payments (Stripe)', 'Email (SendGrid)', 'File storage', 'AI/LLM', 'CRM', 'Analytics', 'Maps', 'None yet'], required: false },
    { id: 'style', question: 'Preferred UI style?', type: 'single', options: ['Clean & minimal', 'Data-dense dashboard', 'Playful & colorful', 'Dark mode', 'Enterprise'], required: true },
    { id: 'monetization', question: 'How will it make money?', type: 'single', options: ['Subscription', 'One-time purchase', 'Usage-based', 'Freemium', 'Not sure yet'], required: false }
  ],
  ai_tool: [
    { id: 'business_name', question: 'What is your AI tool called?', type: 'text', required: true },
    { id: 'use_case', question: 'What is the primary use case?', type: 'text', required: true },
    { id: 'audience', question: 'Who will use it?', type: 'text', required: true },
    { id: 'input', question: 'What does the user provide as input?', type: 'text', required: true },
    { id: 'output', question: 'What should the AI output/produce?', type: 'text', required: true },
    { id: 'model', question: 'Which AI capability is central?', type: 'single', options: ['Text generation', 'Image generation', 'Data analysis', 'Chat/conversation', 'Automation/workflow', 'Classification', 'Search/RAG'], required: true },
    { id: 'data_source', question: 'Does it need custom knowledge/data?', type: 'single', options: ['Yes — our documents', 'Yes — web search', 'Yes — a database', 'No — general knowledge'], required: true },
    { id: 'safety', question: 'How important is output accuracy?', type: 'single', options: ['Critical (medical/legal/financial)', 'High (business decisions)', 'Medium (productivity)', 'Low (creative/drafting)'], required: true },
    { id: 'style', question: 'Preferred interface style?', type: 'single', options: ['Chat interface', 'Form + results', 'Dashboard', 'Embedded widget', 'API-first'], required: true }
  ],
  ai_company: [
    { id: 'business_name', question: 'What is your company name?', type: 'text', required: true },
    { id: 'industry', question: 'What industry/niche?', type: 'text', required: true },
    { id: 'mission', question: 'What is your company mission in one sentence?', type: 'text', required: true },
    { id: 'audience', question: 'Who is your ideal customer?', type: 'text', required: true },
    { id: 'offerings', question: 'What will you offer?', type: 'multi', options: ['AI consulting', 'Custom AI tools', 'Done-for-you services', 'Subscription software', 'Courses/training', 'Done-with-you coaching'], required: true },
    { id: 'revenue', question: 'Primary revenue model?', type: 'single', options: ['Monthly retainer', 'Project-based', 'Subscription/SaaS', 'Hybrid', 'Not sure yet'], required: true },
    { id: 'brand_vibe', question: 'What brand vibe do you want?', type: 'single', options: ['Premium & authoritative', 'Innovative & futuristic', 'Approachable & helpful', 'Bold & disruptive', 'Minimal & refined'], required: true },
    { id: 'competitors', question: 'Name 2-3 competitors or brands you admire', type: 'text', required: false },
    { id: 'operations', question: 'Which operations do you need automated?', type: 'multi', options: ['Lead capture & nurture', 'Client onboarding', 'Project management', 'Invoicing & billing', 'Content marketing', 'Reporting', 'Customer support', 'Scheduling'], required: true },
    { id: 'timeline', question: 'How fast do you want to launch?', type: 'single', options: ['ASAP (2 weeks)', 'Standard (30 days)', 'Thorough (60-90 days)'], required: true }
  ]
};

export const GATE_FIX_QUESTIONS = {
  logo_brand: [
    { id: 'logo_feel', question: 'How does the logo feel?', type: 'single', options: ['Love it', 'Too modern', 'Too traditional', 'Too generic', 'Too complex', 'Too simple'] },
    { id: 'colors', question: 'How are the colors?', type: 'multi', options: ['Perfect', 'Too bold', 'Too muted', 'Wrong palette entirely', 'Need more contrast'] },
    { id: 'typography', question: 'How is the typography?', type: 'single', options: ['Great', 'Wrong font personality', 'Hard to read', 'Too plain', 'Too fancy'] },
    { id: 'versatility', question: 'Versatility concerns?', type: 'multi', options: ["Won't work on dark backgrounds", "Won't work small/favicon", 'Needs a monogram version', 'Needs a horizontal/stacked version'] }
  ],
  messaging: [
    { id: 'headline', question: 'How is the headline?', type: 'single', options: ['Clear & compelling', 'Too vague', 'Too long', 'Not differentiated', 'Boring'] },
    { id: 'tone', question: 'How is the tone of voice?', type: 'single', options: ['On brand', 'Too formal', 'Too casual', 'Too technical', 'Not confident enough'] },
    { id: 'value_prop', question: 'Value proposition clarity?', type: 'single', options: ['Crystal clear', 'A bit muddy', 'Jargon-heavy', 'Missing the benefit', 'Not believable'] }
  ],
  wireframe: [
    { id: 'layout', question: 'How is the layout/structure?', type: 'single', options: ['Logical & clean', 'Too cluttered', 'Missing sections', 'Wrong order of info', 'Too sparse'] },
    { id: 'navigation', question: 'Navigation feedback?', type: 'multi', options: ['Easy to follow', 'Too many items', 'Missing key pages', 'Labels are confusing', 'Hard to find things'] },
    { id: 'flow', question: 'User flow concerns?', type: 'single', options: ['Makes sense', 'Too many steps', 'Dead ends', 'Confusing path to conversion', 'Missing a key flow'] }
  ],
  design: [
    { id: 'visual_style', question: 'How is the visual style?', type: 'single', options: ['Beautiful', 'Not my brand', 'Too plain', 'Too busy', 'Looks dated', 'Looks generic'] },
    { id: 'imagery', question: 'Imagery feedback?', type: 'multi', options: ['Great photos', 'Wrong stock photos', 'Need real team photos', 'Need product shots', 'Too many images', 'Not enough imagery'] },
    { id: 'spacing', question: 'Spacing & rhythm?', type: 'single', options: ['Balanced', 'Too cramped', 'Too much whitespace', 'Inconsistent'] },
    { id: 'mobile', question: 'Mobile design?', type: 'single', options: ['Looks great', 'Not optimized', "Haven't seen it", 'Elements overlap'] }
  ],
  content: [
    { id: 'accuracy', question: 'Is the content accurate?', type: 'single', options: ['Yes', 'Some errors', 'Outdated', 'Missing key details'] },
    { id: 'voice', question: 'Does it sound like you?', type: 'single', options: ['Yes', 'Too corporate', 'Too casual', 'Not authoritative enough', "Doesn't match our brand"] },
    { id: 'completeness', question: "What's missing?", type: 'multi', options: ['Pricing details', 'Team bios', 'Case studies', 'FAQ', 'Testimonials', 'Service descriptions', 'Contact info'] }
  ],
  development: [
    { id: 'functionality', question: 'Does it work as expected?', type: 'single', options: ['Yes', 'Some bugs', 'Major issues', "Haven't tested fully"] },
    { id: 'speed', question: 'Performance/speed?', type: 'single', options: ['Fast', 'A bit slow', 'Very slow', 'Not sure'] },
    { id: 'features', question: 'Which features need work?', type: 'multi', options: ['Contact form', 'Booking/scheduling', 'Payments', 'Login/account', 'Search', 'Mobile menu', 'Animations', 'None — all good'] }
  ],
  qa: [
    { id: 'issues_found', question: 'Did you find any issues?', type: 'multi', options: ['Broken links', 'Spelling errors', 'Images not loading', 'Mobile issues', 'Form errors', 'Slow loading', 'None — all clear'] },
    { id: 'browser', question: 'Which device did you test on?', type: 'single', options: ['Desktop', 'Mobile', 'Tablet', 'Multiple'] },
    { id: 'confidence', question: 'Confidence to launch?', type: 'single', options: ['Ready to launch', 'A few small fixes', 'Need another review round', 'Not ready'] }
  ],
  user_flow: [
    { id: 'flow_clarity', question: 'Is the user flow clear?', type: 'single', options: ['Yes', 'A few confusing spots', 'Missing screens', 'Too complicated'] },
    { id: 'screens', question: 'Screen coverage?', type: 'multi', options: ['All key screens present', 'Missing onboarding', 'Missing settings', 'Missing empty states', 'Missing error states'] }
  ],
  prototype: [
    { id: 'interaction', question: 'How are the interactions?', type: 'single', options: ['Smooth', 'A bit clunky', 'Confusing', 'Missing key interactions'] },
    { id: 'feedback', question: 'Feedback clarity?', type: 'single', options: ['Clear', 'Missing loading states', 'Missing success/error messages', 'No confirmation dialogs'] }
  ],
  use_case: [
    { id: 'scope', question: 'Is the scope right?', type: 'single', options: ['Just right', 'Too narrow', 'Too broad', 'Wrong focus'] },
    { id: 'priority', question: 'Which feature matters most?', type: 'single', options: ['Accuracy', 'Speed', 'Ease of use', 'Cost efficiency', 'Integration'] }
  ],
  data_architecture: [
    { id: 'sources', question: 'Are the data sources right?', type: 'single', options: ['Yes', 'Missing a source', 'Wrong source', 'Need more detail'] },
    { id: 'privacy', question: 'Privacy concerns?', type: 'multi', options: ['All clear', 'Need user consent flow', 'Need data retention policy', 'Need PII redaction', 'Not sure'] }
  ],
  integration: [
    { id: 'connections', question: 'Integration concerns?', type: 'multi', options: ['All connected', 'Missing an API', 'Auth flow unclear', 'Rate limits', 'Error handling weak'] },
    { id: 'reliability', question: 'Reliability?', type: 'single', options: ['Solid', 'Occasional failures', 'Frequent failures', 'Untested'] }
  ],
  strategy: [
    { id: 'positioning', question: 'How is the positioning?', type: 'single', options: ['Sharp & differentiated', 'Too generic', 'Hard to understand', 'Not believable'] },
    { id: 'pricing', question: 'Pricing strategy?', type: 'single', options: ['Makes sense', 'Too low', 'Too high', 'Too complex', 'Need guidance'] },
    { id: 'icp', question: 'Ideal customer profile?', type: 'single', options: ['Spot on', 'Too broad', 'Too narrow', 'Unclear'] }
  ],
  brand_identity: [
    { id: 'cohesion', question: 'Brand cohesion?', type: 'single', options: ['Consistent & strong', 'Inconsistent', 'Too rigid', 'Not memorable'] },
    { id: 'assets', question: 'Which assets need work?', type: 'multi', options: ['Logo', 'Color palette', 'Typography', 'Imagery style', 'Voice/tone', 'All good'] }
  ],
  operations: [
    { id: 'coverage', question: 'Operational coverage?', type: 'single', options: ['Covers everything', 'Missing workflows', 'Too manual', 'Overcomplicated'] },
    { id: 'automations', question: 'Which automations are missing?', type: 'multi', options: ['Lead nurture', 'Onboarding', 'Invoicing', 'Reporting', 'Scheduling', 'All covered'] }
  ],
  launch: [
    { id: 'readiness', question: 'Launch readiness?', type: 'single', options: ['Ready to go live', 'Need final tweaks', 'Need training first', 'Not ready'] },
    { id: 'handoff', question: 'Handoff materials?', type: 'multi', options: ['Docs received', 'Need admin training', 'Need a walkthrough', 'Need login guide', 'All set'] }
  ]
};

const OPEN_FEEDBACK_QUESTION = {
  id: 'open_feedback',
  question: "In your own words — what don't you like, or what do you want improved?",
  type: 'text',
  required: true
};

export function getGateFixQuestions(slug) {
  return [...(GATE_FIX_QUESTIONS[slug] || []), OPEN_FEEDBACK_QUESTION];
}