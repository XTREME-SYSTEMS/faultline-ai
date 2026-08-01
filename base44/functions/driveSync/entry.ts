import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const FOLDER_NAME = 'FaultLine AI Backups';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const direction = body.direction || 'status';

    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Find or create the backup folder
    async function ensureFolder() {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`)}&fields=files(id,name)`,
        { headers: authHeader }
      );
      const searchJson = await searchRes.json();
      if (searchJson.files && searchJson.files.length > 0) return searchJson.files[0].id;
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
      });
      const createJson = await createRes.json();
      return createJson.id;
    }

    async function upsertSyncState(data) {
      const existing = await base44.asServiceRole.entities.SyncState.filter({ organization_id: orgId });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.SyncState.update(existing[0].id, data);
      } else {
        await base44.asServiceRole.entities.SyncState.create({ organization_id: orgId, ...data });
      }
    }

    if (direction === 'export') {
      const [audits, findings, repairPlans] = await Promise.all([
        base44.asServiceRole.entities.Audit.filter({ organization_id: orgId }),
        base44.asServiceRole.entities.Finding.filter({ organization_id: orgId }),
        base44.asServiceRole.entities.RepairPlan.filter({ organization_id: orgId })
      ]);

      const folderId = await ensureFolder();
      const backup = {
        exported_at: new Date().toISOString(),
        organization_id: orgId,
        audits,
        findings,
        repair_plans: repairPlans
      };
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `faultline-backup-${timestamp}.json`;

      const boundary = 'faultline-' + Date.now();
      const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
      const content = JSON.stringify(backup, null, 2);
      const multipartBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${metadata}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${content}\r\n` +
        `--${boundary}--`;

      const uploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
        {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': `multipart/related; boundary=${boundary}` },
          body: multipartBody
        }
      );
      const uploadJson = await uploadRes.json();

      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'google_drive',
        action: 'export_backup',
        status: 'success',
        summary: `Exported ${audits.length} audits, ${findings.length} findings, ${repairPlans.length} repair plans to ${fileName}`,
        evidence: { file_id: uploadJson.id, file_name: fileName, folder_id: folderId }
      });

      await upsertSyncState({
        drive_folder_id: folderId,
        last_sync_at: new Date().toISOString(),
        last_direction: 'export',
        last_count: audits.length + findings.length + repairPlans.length
      });

      return Response.json({
        status: 'success',
        direction: 'export',
        file_id: uploadJson.id,
        file_name: fileName,
        counts: { audits: audits.length, findings: findings.length, repair_plans: repairPlans.length }
      });
    }

    if (direction === 'import') {
      const folderId = await ensureFolder();
      const listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${folderId}' in parents and trashed=false`)}&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime desc`,
        { headers: authHeader }
      );
      const listJson = await listRes.json();
      const files = listJson.files || [];

      let imported = 0;
      for (const file of files) {
        const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: authHeader });
        const dlText = await dlRes.text();
        let backup;
        try { backup = JSON.parse(dlText); } catch { continue; }

        if (Array.isArray(backup.audits)) {
          for (const audit of backup.audits) {
            await base44.asServiceRole.entities.Evidence.create({
              organization_id: orgId,
              audit_id: audit.id,
              source_type: 'drive_backup',
              source_uri: `https://drive.google.com/file/d/${file.id}`,
              captured_at: backup.exported_at || new Date().toISOString(),
              content_summary: `Restored audit: ${audit.title || audit.id}`,
              content_hash: file.id
            });
            imported++;
          }
        }
      }

      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'google_drive',
        action: 'import_backup',
        status: 'success',
        summary: `Imported ${imported} evidence records from ${files.length} Drive files`,
        evidence: { folder_id: folderId, file_count: files.length }
      });

      await upsertSyncState({
        drive_folder_id: folderId,
        last_sync_at: new Date().toISOString(),
        last_direction: 'import',
        last_count: imported
      });

      return Response.json({
        status: 'success',
        direction: 'import',
        files_found: files.length,
        evidence_created: imported
      });
    }

    // status
    const states = await base44.asServiceRole.entities.SyncState.filter({ organization_id: orgId });
    const receipts = await base44.asServiceRole.entities.Receipt.filter({ organization_id: orgId, system: 'google_drive' });
    return Response.json({
      status: 'success',
      direction: 'status',
      sync_state: states[0] || null,
      history: receipts.slice(-10).reverse()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}