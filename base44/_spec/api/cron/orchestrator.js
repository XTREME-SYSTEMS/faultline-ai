const MAX_JOBS_PER_TICK = 10

export default async function handler(request, response) {
  const expected = process.env.CRON_SECRET
  const authorization = request.headers.authorization
  if (!expected || authorization !== `Bearer ${expected}`) {
    return response.status(401).json({ ok: false, error: 'unauthorized' })
  }
  const receipt = {
    run_id: crypto.randomUUID(),
    started_at: new Date().toISOString(),
    max_jobs: MAX_JOBS_PER_TICK,
    mode: 'preview-contract',
    actions: [],
    note: 'Connect this endpoint to the approved Vercel Workflow adapter and Supabase queues.'
  }
  return response.status(200).json({ ok: true, receipt })
}
