import { createClientFromRequest } from "npm:@base44/sdk";

export default async function handler(request: Request) {
  const base44 = createClientFromRequest(request);
  const user = await base44.auth.me();
  const orgId = user.data?.organization_id;
  const body = await request.json();

  if (!orgId) {
    return Response.json({ ok: false, error: "No organization found" }, { status: 400 });
  }

  const { artifact_id, project_id, content, artifact_type } = body;

  if (!artifact_id && !content) {
    return Response.json({ ok: false, error: "Artifact ID or content is required" }, { status: 400 });
  }

  try {
    let artifactContent = content;
    let artifactName = "Artifact";
    let artifactType = artifact_type || "document";

    if (artifact_id) {
      const artifact = await base44.asServiceRole.entities.Artifact.get(artifact_id);
      artifactContent = artifact.content || content;
      artifactName = artifact.name;
      artifactType = artifact.artifact_type;
    }

    // Run validation checks via LLM
    const validationResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a QA validator for generated business artifacts. Analyze the following ${artifactType} artifact and return a validation report with scores for each area (0-100) and an overall score.

Artifact Name: ${artifactName}
Artifact Type: ${artifactType}
Content (first 3000 chars): ${(artifactContent || "").substring(0, 3000)}

Check these areas:
1. completeness - Are all required sections present?
2. consistency - Is the content internally consistent?
3. usability - Can a user act on this output?
4. source - Are claims backed by evidence?
5. quality - Is the output professional and polished?

Return a JSON object with scores for each area, an overall_score, a list of issues (if any), and a pass/fail status.`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_score: { type: "number" },
          completeness: { type: "number" },
          consistency: { type: "number" },
          usability: { type: "number" },
          source: { type: "number" },
          quality: { type: "number" },
          status: { type: "string", enum: ["pass", "warn", "fail"] },
          issues: { type: "array", items: { type: "object", properties: { area: { type: "string" }, severity: { type: "string" }, message: { type: "string" } } } }
        }
      }
    });

    // Create validation result records
    const checks = [
      { area: "completeness", score: validationResponse.completeness },
      { area: "consistency", score: validationResponse.consistency },
      { area: "usability", score: validationResponse.usability },
      { area: "source", score: validationResponse.source },
      { area: "quality", score: validationResponse.quality }
    ];

    const createdResults = [];
    for (const check of checks) {
      const result = await base44.asServiceRole.entities.ValidationResult.create({
        organization_id: orgId,
        project_id: project_id || null,
        artifact_id: artifact_id || null,
        area: check.area,
        check_name: `${check.area} validation`,
        status: check.score >= 80 ? "pass" : check.score >= 60 ? "warn" : "fail",
        score: check.score,
        details: `Automated validation score: ${check.score}/100`
      });
      createdResults.push(result.id);
    }

    // Update artifact with validation score if we have an artifact ID
    if (artifact_id) {
      await base44.asServiceRole.entities.Artifact.update(artifact_id, {
        validation_score: validationResponse.overall_score,
        status: validationResponse.status === "pass" ? "validated" : validationResponse.status === "warn" ? "generated" : "failed"
      });
    }

    // Create repair tasks for any failing checks
    if (validationResponse.issues) {
      for (const issue of validationResponse.issues) {
        if (issue.severity === "fail" || issue.severity === "critical") {
          await base44.asServiceRole.entities.RepairTask.create({
            organization_id: orgId,
            project_id: project_id || null,
            artifact_id: artifact_id || null,
            area: issue.area,
            check_name: `${issue.area} validation`,
            description: issue.message,
            fix_strategy: `Address ${issue.area} issue: ${issue.message}`,
            status: "identified",
            priority: issue.severity === "critical" ? "critical" : "high"
          });
        }
      }
    }

    return Response.json({
      ok: true,
      validation: validationResponse,
      validation_result_ids: createdResults
    });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}