import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'

const root = process.cwd()
const ignoredDirs = new Set(['node_modules','dist','.git','coverage','playwright-report','test-results','audit'])
const binaries = new Set(['.png','.jpg','.jpeg','.webp','.gif','.ico','.pdf','.zip'])
const files = []
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.isDirectory()&&ignoredDirs.has(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isFile()&&/^audit-pass\d+\.txt$/.test(entry.name))continue;entry.isDirectory()?walk(full):files.push(full)}}
walk(root)

const findings=[]
const add=(severity,code,file,detail)=>findings.push({severity,code,file:path.relative(root,file),detail})
const required=[
 'README.md','PROJECT_MANIFEST.md','BRAND_CONTRACT.md','PRD.md','ARCHITECTURE.md','SECURITY.md','ENVIRONMENT_CHECKLIST.md','RELEASE_CHECKLIST.md','ROLLBACK.md',
 'BASE44_MASTER_PROMPT.md','BASE44_HANDOFF.md','BASE44_APP_MANIFEST.json','BASE44_ENTITY_SCHEMA.json','BASE44_PAGE_MAP.md','BASE44_COMPONENT_MAP.md','BASE44_WORKFLOW_MAP.md','BASE44_AGENT_MAP.md','BASE44_CONNECTOR_MATRIX.md','BASE44_RLS_MATRIX.md','BASE44_ENVIRONMENT_MAP.md','BASE44_ACCEPTANCE_TESTS.md','BASE44_ROLLBACK.md','BASE44_KNOWN_LIMITATIONS.md',
 'src/App.tsx','src/styles.css','src/main.tsx','public/logo.svg','api/cron/orchestrator.js','vercel.json',
 'supabase/migrations/001_core.sql','supabase/migrations/002_rls.sql','supabase/migrations/003_storage.sql'
]
for(const rel of required){const full=path.join(root,rel);if(!fs.existsSync(full))add('critical','MISSING_REQUIRED_FILE',full,'Required package file is missing.')}

const secretPatterns=[
 /sk-[a-zA-Z0-9_-]{20,}/g,
 /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
 /(?:SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|OPENAI_API_KEY|AI_GATEWAY_API_KEY)\s*[=:]\s*["'][^"'\n]{10,}["']/gi
]
const unsafeClaims=[/guaranteed revenue/gi,/100% accurate/gi,/publicly expose/gi,/scrape every single website/gi]
for(const file of files){
 const ext=path.extname(file).toLowerCase();const stat=fs.statSync(file)
 if(stat.size===0)add('high','EMPTY_FILE',file,'File is empty.')
 if(binaries.has(ext))continue
 let text='';try{text=fs.readFileSync(file,'utf8')}catch{continue}
 for(const pattern of secretPatterns){pattern.lastIndex=0;if(pattern.test(text))add('critical','POTENTIAL_SECRET',file,`Matched ${pattern}`)}
 if(!file.includes('docs/source-truth')&&!file.endsWith('scripts/recursive-audit.mjs'))for(const pattern of unsafeClaims){pattern.lastIndex=0;if(pattern.test(text))add('high','UNSAFE_CLAIM',file,`Matched ${pattern}`)}
 if(!file.endsWith('scripts/recursive-audit.mjs')&&text.includes('href="#"'))add('medium','DEAD_LINK',file,'Contains a placeholder href.')
 if(!file.endsWith('scripts/recursive-audit.mjs')&&text.includes('dangerouslySetInnerHTML'))add('high','UNSAFE_HTML',file,'Uses dangerouslySetInnerHTML.')
 if(/\b(TODO|FIXME|HACK)\b/.test(text)&&!file.endsWith('recursive-audit.mjs')&&!file.includes('docs/source-truth'))add('low','OPEN_MARKER',file,'Contains TODO, FIXME, or HACK.')
 if(['.ts','.tsx'].includes(ext)){
   const result=ts.transpileModule(text,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true,fileName:file})
   for(const d of result.diagnostics||[]){if(d.category===ts.DiagnosticCategory.Error)add('critical','TYPESCRIPT_PARSE',file,ts.flattenDiagnosticMessageText(d.messageText,' '))}
 }
}

const appPath=path.join(root,'src/App.tsx')
if(fs.existsSync(appPath)){
 const app=fs.readFileSync(appPath,'utf8')
 for(const token of ['/sign-in','/sign-up','/checkout','/app','/admin'])if(!app.includes(token))add('high','MISSING_ROUTE',appPath,`Missing route token ${token}`)
 const heroStart=app.indexOf('function Hero')
 const heroEnd=app.indexOf('const problems',heroStart)
 const hero=heroStart>=0&&heroEnd>heroStart?app.slice(heroStart,heroEnd):''
 if(!hero)add('high','HERO_NOT_FOUND',appPath,'Could not isolate the homepage hero.')
 for(const banned of ['computer','laptop','phone','browser window','dashboard screenshot'])if(hero.toLowerCase().includes(banned))add('high','BANNED_HERO_OBJECT',appPath,`Hero contains banned term: ${banned}`)
 if(!hero.includes('fracture'))add('medium','HERO_CONCEPT',appPath,'Hero does not include the approved fracture concept.')
}

const rlsPath=path.join(root,'supabase/migrations/002_rls.sql')
if(fs.existsSync(rlsPath)){
 const rls=fs.readFileSync(rlsPath,'utf8')
 for(const token of ['enable row level security','is_org_member','has_org_role','outreach_drafts','audit_logs'])if(!rls.includes(token))add('critical','RLS_COVERAGE',rlsPath,`Missing expected RLS token: ${token}`)
}

const env=fs.existsSync(path.join(root,'.env.example'))?fs.readFileSync(path.join(root,'.env.example'),'utf8'):''
for(const key of ['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY','AI_GATEWAY_API_KEY','CRON_SECRET','STRIPE_SECRET_KEY'])if(!env.includes(key))add('high','ENV_MISSING',path.join(root,'.env.example'),`Missing environment key ${key}`)

const counts=findings.reduce((a,f)=>({...a,[f.severity]:(a[f.severity]||0)+1}),{})
const status=findings.some(f=>['critical','high'].includes(f.severity))?'FAIL':findings.some(f=>f.severity==='medium')?'PASS WITH WARNINGS':'PASS'
const hash=crypto.createHash('sha256').update(files.sort().map(f=>`${path.relative(root,f)}:${fs.statSync(f).size}`).join('\n')).digest('hex')
const report={generated_at:new Date().toISOString(),status,files_scanned:files.length,tree_hash:hash,counts,findings}
fs.mkdirSync(path.join(root,'audit'),{recursive:true})
fs.writeFileSync(path.join(root,'audit','recursive-audit.json'),JSON.stringify(report,null,2))
fs.writeFileSync(path.join(root,'audit','recursive-audit.md'),`# Recursive Audit\n\nStatus: **${status}**\n\nFiles scanned: ${files.length}\n\nTree hash: \`${hash}\`\n\n## Findings\n\n${findings.length?findings.map(f=>`- **${f.severity.toUpperCase()} · ${f.code}** \`${f.file}\`: ${f.detail}`).join('\n'):'- No findings.'}\n`)
console.log(JSON.stringify(report,null,2))
if(status==='FAIL')process.exitCode=1
