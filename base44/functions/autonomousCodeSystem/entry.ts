import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// The Autonomous Coding System — RAG-powered, self-validating code generation.
//
// MISSION: Generate production-quality code autonomously, validate it, fix it,
// and ingest it back into the RAG for future retrieval. Every piece of code
// generated makes the next generation better.
//
// PIPELINE:
//   1. RAG QUERY — retrieve relevant code/templates/docs from the knowledge base
//   2. CODE GENERATION — LLM generates code using the task + RAG context
//   3. VALIDATION — LLM validates the code (syntax, logic, tests, edge cases)
//   4. AUTO-FIX — if validation fails, LLM fixes the code based on validation errors
//   5. RE-VALIDATE — loop until validation passes or max iterations reached
//   6. STORE — save the validated code as a Deliverable
//   7. INGEST — add the code to the RAG for future retrieval (compounding flywheel)
//   8. RETURN — code + validation report + iteration count

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const {
      task, language, context: userContext, max_iterations, organization_id,
      file_name, project_id
    } = body;
    const targetOrg = organization_id || orgId;

    if (!task || task.length < 10) {
      return Response.json({ error: 'task required (min 10 chars)' }, { status: 400 });
    }

    const lang = language || 'javascript';
    const maxIter = max_iterations || 3;
    const fileName = file_name || `generated-${Date.now().toString(36)}.${lang === 'typescript' ? 'tsx' : lang === 'python' ? 'py' : 'js'}`;

    const log = [];
    const addLog = (m) => log.push(`${new Date().toISOString()} — ${m}`);

    addLog(`Autonomous coding system started: "${task.slice(0, 80)}..."`);

    // ── STEP 1: RAG QUERY — retrieve relevant context ──────────────────
    addLog('Step 1: Querying RAG for relevant code/templates...');
    let ragContext = '';
    let ragResults = [];
    try {
      const ragRes = await base44.functions.invoke('ragQuery', {
        query: task,
        source_type: 'code',
        top_k: 5,
        organization_id: targetOrg
      });
      const rag = ragRes?.data || ragRes;
      ragContext = rag.context || '';
      ragResults = rag.results || [];
      addLog(`RAG returned ${ragResults.length} relevant chunks`);
    } catch (e) {
      addLog(`RAG query failed (non-blocking): ${e.message}`);
    }

    // ── STEP 2: CODE GENERATION ─────────────────────────────────────────
    addLog('Step 2: Generating code with LLM...');
    const genRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert ${lang} developer. Generate production-quality code for the following task.

TASK: ${task}

LANGUAGE: ${lang}

${userContext ? `ADDITIONAL CONTEXT:\n${userContext}\n\n` : ''}${ragContext ? `RELEVANT CODE FROM KNOWLEDGE BASE (use as reference, adapt as needed):\n${ragContext.slice(0, 4000)}\n\n` : ''}REQUIREMENTS:
- Write clean, production-quality ${lang} code
- Include proper error handling
- Add comments for complex logic
- Follow best practices for ${lang}
- Make the code complete and runnable (no placeholders, no TODOs)
- If it's a React component, make it a complete, self-contained component
- If it's a function/module, include all necessary imports

Return JSON with:
- code (string — the complete code)
- file_name (string — suggested file name with correct extension)
- description (string — what the code does)
- dependencies (array of strings — npm packages or imports needed)`,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          file_name: { type: 'string' },
          description: { type: 'string' },
          dependencies: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    let code = genRes.code || '';
    let description = genRes.description || '';
    let dependencies = genRes.dependencies || [];
    let currentFileName = genRes.file_name || fileName;
    addLog(`Code generated: ${code.length} chars, file: ${currentFileName}`);

    // ── STEPS 3-5: VALIDATION + AUTO-FIX LOOP ───────────────────────────
    let validationReport = null;
    let passed = false;
    let iteration = 0;

    while (iteration < maxIter && !passed) {
      iteration++;
      addLog(`Step 3.${iteration}: Validating code (iteration ${iteration}/${maxIter})...`);

      // VALIDATION — LLM checks syntax, logic, generates tests, simulates execution
      const valRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a strict code validator. Analyze this ${lang} code and determine if it's production-ready.

TASK THE CODE SOLVES: ${task}

CODE TO VALIDATE:
\`\`\`${lang}
${code.slice(0, 6000)}
\`\`\`

${code.length > 6000 ? '... (code truncated for validation)' : ''}

VALIDATION CHECKS:
1. SYNTAX: Is the code syntactically valid ${lang}? (no syntax errors)
2. COMPLETENESS: Is the code complete? (no placeholders, TODOs, or missing implementations)
3. LOGIC: Does the code logic correctly solve the task?
4. ERROR HANDLING: Does the code handle errors appropriately?
5. TESTS: Generate 3 key test cases and mentally simulate whether the code would pass each.
6. EDGE CASES: Are edge cases handled? (empty inputs, null values, boundary conditions)
7. SECURITY: Are there any obvious security issues? (injection, XSS, etc.)

For each check, mark PASS or FAIL with details.

Return JSON with:
- passed (boolean — true only if ALL critical checks pass)
- score (0-100 — how production-ready the code is)
- syntax_valid (boolean)
- is_complete (boolean)
- logic_correct (boolean)
- error_handling (boolean)
- test_results (array of {test_name, passed, expected, actual})
- edge_cases_handled (boolean)
- security_issues (array of strings)
- failures (array of strings — specific issues that need fixing, each with enough detail for an auto-fixer to act on)
- fix_instructions (string — if not passed, specific instructions on what to fix and how)`,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            passed: { type: 'boolean' },
            score: { type: 'number' },
            syntax_valid: { type: 'boolean' },
            is_complete: { type: 'boolean' },
            logic_correct: { type: 'boolean' },
            error_handling: { type: 'boolean' },
            test_results: { type: 'array', items: { type: 'object', properties: {
              test_name: { type: 'string' }, passed: { type: 'boolean' },
              expected: { type: 'string' }, actual: { type: 'string' }
            } } },
            edge_cases_handled: { type: 'boolean' },
            security_issues: { type: 'array', items: { type: 'string' } },
            failures: { type: 'array', items: { type: 'string' } },
            fix_instructions: { type: 'string' }
          }
        }
      });

      validationReport = valRes;
      passed = valRes.passed === true;
      addLog(`Validation ${iteration}: passed=${passed}, score=${valRes.score || 0}, failures=${(valRes.failures || []).length}`);

      if (passed) {
        addLog('Validation PASSED — code is production-ready');
        break;
      }

      // AUTO-FIX — if not passed and iterations remain, fix the code
      if (iteration < maxIter) {
        addLog(`Step 4.${iteration}: Auto-fixing code based on validation failures...`);
        const fixRes = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert ${lang} developer. Fix the issues in this code based on the validation report.

ORIGINAL TASK: ${task}

CURRENT CODE:
\`\`\`${lang}
${code.slice(0, 6000)}
\`\`\`

VALIDATION FAILURES:
${(valRes.failures || []).map((f, i) => `${i + 1}. ${f}`).join('\n')}

FIX INSTRUCTIONS: ${valRes.fix_instructions || 'Fix all validation failures.'}

Generate the FIXED code. Return the complete, corrected code — not a diff, the full file.

Return JSON with:
- code (string — the complete fixed code)
- changes_made (array of strings — what was changed and why)`,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              changes_made: { type: 'array', items: { type: 'string' } }
            }
          }
        });

        code = fixRes.code || code;
        addLog(`Auto-fix applied: ${(fixRes.changes_made || []).length} changes made`);
      }
    }

    // ── STEP 6: STORE as Deliverable ───────────────────────────────────
    addLog('Step 6: Storing validated code as Deliverable...');
    let fileUrl = null;
    let deliverableId = null;
    try {
      const fileObj = new File([code], currentFileName, { type: 'text/plain' });
      const upload = await base44.integrations.Core.UploadFile({ file: fileObj });
      fileUrl = upload?.file_url || null;
    } catch (e) { addLog(`Upload failed: ${e.message}`); }

    try {
      const deliverable = await base44.entities.Deliverable.create({
        organization_id: targetOrg,
        deliverable_type: 'code',
        title: `${currentFileName} — ${task.slice(0, 60)}`,
        content: fileUrl ? '' : code.slice(0, 5000),
        file_url: fileUrl,
        metadata: {
          task, language: lang, file_name: currentFileName,
          description, dependencies,
          validation: validationReport,
          iterations: iteration, passed,
          rag_chunks_used: ragResults.length,
          generated_at: new Date().toISOString()
        },
        status: passed ? 'generated' : 'needs_review'
      });
      deliverableId = deliverable.id;
    } catch (e) { addLog(`Deliverable save failed: ${e.message}`); }

    // ── STEP 7: INGEST into RAG (compounding flywheel) ──────────────────
    addLog('Step 7: Ingesting code into RAG for future retrieval...');
    try {
      await base44.functions.invoke('ragIngest', {
        content: code,
        title: `${currentFileName} — ${description}`,
        source_type: 'code',
        source_id: deliverableId,
        tags: [lang, 'generated_code', task.slice(0, 50), ...(dependencies || []).slice(0, 5)],
        metadata: { task, language: lang, passed, validation_score: validationReport?.score },
        organization_id: targetOrg,
        generate_summary: true
      });
      addLog('Code ingested into RAG — future generation will benefit from this');
    } catch (e) { addLog(`RAG ingest failed (non-blocking): ${e.message}`); }

    // ── STEP 8: RECEIPT + RETURN ───────────────────────────────────────
    addLog(`Complete: ${passed ? 'PASSED' : 'NEEDS_REVIEW'} after ${iteration} iterations, score ${validationReport?.score || 0}/100`);

    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: targetOrg,
        system: 'autonomous_code',
        action: 'generate',
        status: passed ? 'success' : 'partial',
        summary: `Generated ${currentFileName}: ${passed ? 'PASSED' : 'NEEDS_REVIEW'} (${validationReport?.score || 0}/100) after ${iteration} iterations`,
        evidence: {
          task: task.slice(0, 200), language: lang, file_name: currentFileName,
          passed, score: validationReport?.score, iterations: iteration,
          failures: validationReport?.failures, rag_chunks_used: ragResults.length,
          deliverable_id: deliverableId, file_url: fileUrl
        }
      });
    } catch (e) { console.error('Receipt failed:', e); }

    return Response.json({
      status: passed ? 'success' : 'partial',
      task,
      language: lang,
      file_name: currentFileName,
      code,
      description,
      dependencies,
      file_url: fileUrl,
      deliverable_id: deliverableId,
      validation: validationReport,
      iterations: iteration,
      passed,
      rag_context_used: ragResults.length,
      log,
      message: `Code ${passed ? 'validated and production-ready' : 'generated but needs review'} (${validationReport?.score || 0}/100, ${iteration} iterations)`
    });
  } catch (error) {
    console.error('autonomousCodeSystem error:', error);
    return Response.json({ error: error.message, code: '', passed: false }, { status: 500 });
  }
}