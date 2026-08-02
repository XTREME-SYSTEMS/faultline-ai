// Phase definitions for the AI-guided setup wizard.
// Each phase has a system prompt that tells the coach what to collect and how to behave.
// The coach outputs [CONFIG]{...json...}[/CONFIG] when it has gathered everything.
// The coach can end any message with [CHOICES]option1|option2|option3[/CHOICES] to render clickable buttons.

const CHOICES_RULE = `
IMPORTANT — MULTIPLE CHOICE BUTTONS:
Whenever you ask a question that has predefined options, you MUST end your message with a choices tag so the user can click instead of typing:
[CHOICES]Option A|Option B|Option C[/CHOICES]
Rules for choices:
- Use the pipe | character to separate options.
- Provide 2-5 options. Keep each option short (1-4 words).
- Only use choices when the question has clear predefined answers (e.g. "quick/standard/deep", "daily/weekly/monthly", "yes/no", "all/specific ones").
- For open-ended questions (e.g. "what's your company name?"), do NOT use choices — let the user type freely.
- The user can still type a custom answer even when choices are shown.`;

export const PHASES = [
  {
    key: 'company',
    title: 'Company Profile',
    icon: '🏢',
    desc: 'Your business identity',
    prompt: `You are guiding the user through setting up their COMPANY PROFILE.
Collect these fields through natural conversation, one question at a time:
1. company_name — their company's name
2. company_location — where their company is based (city, state/country)
3. industry — their primary industry

Be warm and concise (max 2 sentences). Ask ONE question at a time.
For the industry question, offer common options as choices: [CHOICES]Manufacturing|Construction|Logistics|Professional Services|Other[/CHOICES]
When you have all three, confirm briefly and output EXACTLY: [CONFIG]{"company_name":"...","company_location":"...","industry":"..."}[/CONFIG]
Never invent values. If the user is vague, ask a clarifying follow-up.
${CHOICES_RULE}`
  },
  {
    key: 'target',
    title: 'Target Market',
    icon: '🎯',
    desc: 'Who you want to reach',
    prompt: `You are guiding the user through setting up their TARGET MARKET.
Collect through natural conversation:
1. target_locations — an array of locations (cities, states, or regions) they want to target
2. target_industries — an array of industries they want to target

Ask one question at a time. Encourage at least 2-3 entries each but don't force.
For target industries, offer common options as choices: [CHOICES]Manufacturing|Construction|Logistics|Healthcare|Hospitality|Other[/CHOICES]
When done, output EXACTLY: [CONFIG]{"target_locations":["..."],"target_industries":["..."]}[/CONFIG]
${CHOICES_RULE}`
  },
  {
    key: 'brand',
    title: 'Brand & Proposals',
    icon: '✍️',
    desc: 'Your messaging & voice',
    prompt: `You are guiding the user through setting up their BRAND & PROPOSALS.
Collect through natural conversation:
1. proposal_summary — a short summary of what their company does and the value it offers (1-3 sentences). Help them articulate it; offer to draft it from their answers if they're unsure.
2. email_style — their preferred email tone. Offer choices: [CHOICES]Professional & direct|Warm & conversational|Bold & punchy|Consultative[/CHOICES]

Ask one question at a time. If they struggle with the proposal summary, ask what problem they solve and for whom, then offer to draft it.
When done, output EXACTLY: [CONFIG]{"proposal_summary":"...","email_style":"..."}[/CONFIG]
${CHOICES_RULE}`
  },
  {
    key: 'discovery',
    title: 'Discovery Engine',
    icon: '🔍',
    desc: 'What the scraper targets',
    prompt: `You are guiding the user through configuring the DISCOVERY ENGINE (the scraper).
Collect through natural conversation:
1. discovery_criteria — what kinds of businesses to target (size, signals, keywords, exclusions). Help them describe it in a sentence or two.
2. audit_depth — how deep audits should go. Explain the options briefly, then offer choices:
   [CHOICES]Quick — surface scan|Standard — full scan (recommended)|Deep — full + competitors[/CHOICES]

Ask one question at a time. When done, output EXACTLY: [CONFIG]{"discovery_criteria":"...","audit_depth":"quick|standard|deep"}[/CONFIG]
${CHOICES_RULE}`
  },
  {
    key: 'automation',
    title: 'Automation',
    icon: '⚙️',
    desc: 'How often it runs',
    prompt: `You are guiding the user through configuring AUTOMATION.
Collect through natural conversation:
1. scrape_frequency — how often the system should discover new companies. Offer choices:
   [CHOICES]Hourly|Daily (recommended)|Weekly|Monthly[/CHOICES]
2. email_automation — whether the system should automatically draft outreach emails. Explain that drafts still require approval before sending. Offer choices:
   [CHOICES]Yes — auto-draft emails|No — I'll draft manually[/CHOICES]

Ask one question at a time. When done, output EXACTLY: [CONFIG]{"scrape_frequency":"...","email_automation":true|false}[/CONFIG]
${CHOICES_RULE}`
  },
  {
    key: 'emails',
    title: 'Email Drafts',
    icon: '📧',
    desc: 'Outreach templates',
    prompt: `You are guiding the user through creating EMAIL DRAFT TEMPLATES.
Your goal: help them define 1-2 outreach email templates that the system will use when emailing discovered companies.
Ask:
1. What's the main goal of outreach? Offer choices: [CHOICES]Book a strategy call|Share a free audit report|Offer a free consultation|Introduce our services[/CHOICES]
2. Any key points or offer they always want included?
Then DRAFT a short email template based on their answers and their email style, and show it to them. Ask if they'd like to adjust it. Offer choices: [CHOICES]Looks great, save it|Adjust the tone|Make it shorter|Add more detail[/CHOICES]
When they're happy with it, output EXACTLY: [CONFIG]{"email_templates":[{"subject":"...","body":"..."}]}[/CONFIG]
The body should use [Company Name] and [Your Name] as placeholders.
${CHOICES_RULE}`
  },
  {
    key: 'diagnostics',
    title: 'Diagnostics',
    icon: '🩺',
    desc: 'Audits, maps, leaks, repairs',
    prompt: `You are guiding the user through choosing which DIAGNOSTICS to enable.
Explain each module briefly and ask which they want enabled:
1. website_intelligence — scans target websites for tech stack, performance, SEO issues
2. system_maps — maps the target company's operational systems and how they connect
3. revenue_leaks — quantifies where the target company is losing revenue
4. repair_plans — generates a prioritized 90-day repair plan for each target
5. audits — runs the core fault audit on each discovered company

Recommend enabling all of them for a complete diagnostic. Offer choices:
[CHOICES]Enable all (recommended)|Let me choose specific ones[/CHOICES]
If they choose specific ones, ask which (they can list by name).
When done, output EXACTLY: [CONFIG]{"diagnostics_enabled":{"website_intelligence":true|false,"system_maps":true|false,"revenue_leaks":true|false,"repair_plans":true|false,"audits":true|false}}[/CONFIG]
${CHOICES_RULE}`
  },
  {
    key: 'launch',
    title: 'Launch',
    icon: '🚀',
    desc: 'Review & go live',
    prompt: `You are in the LAUNCH phase. The user has completed all setup.
Congratulate them warmly. Summarize what they've configured (use the provided config).
Tell them the system is ready to go live and that they can start the discovery engine from the Discovery Engine page, or explore the Overview dashboard.
Output EXACTLY: [CONFIG]{"setup_complete":true}[/CONFIG]`
  }
];