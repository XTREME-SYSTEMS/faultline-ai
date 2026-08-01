import { base44 } from '@/api/base44Client';

export async function submitFaultLineForm(kind, payload) {
  if (kind === 'audit_lead') {
    await base44.entities.AuditLead.create({
      name: payload.name,
      email: payload.email,
      company: payload.company,
      website: payload.website,
      concern: payload.concern,
      plan: payload.plan,
      status: 'new',
      source: 'homepage',
    });
  } else if (kind === 'strategy_call') {
    await base44.entities.StrategyCallRequest.create({
      name: payload.name,
      email: payload.email,
      company: payload.company,
      phone: payload.phone,
      preferred_date: payload.preferred_date,
      status: 'new',
      source: 'homepage',
    });
  } else if (kind === 'newsletter') {
    await base44.entities.NewsletterSubscriber.create({
      email: payload.email,
      status: 'subscribed',
      source: 'homepage',
    });
  }
}