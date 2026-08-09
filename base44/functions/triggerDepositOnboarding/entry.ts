import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Deposit Onboarding Trigger — fires when a Stripe payment succeeds (deposit).
// Creates the full gated onboarding flow:
//   1. CustomerAccount (the customer record)
//   2. ClientProject (the project being onboarded)
//   3. Approval chain (gated approval process — admin must approve each step)
//   4. Appointment (15-min scheduled phone consultation)
//   5. Sends welcome email to the customer
//
// This is the FIRST point of contact after a deposit is paid. Everything else
// (schedule creation, build kickoff, delivery) flows from this trigger.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { customer_email, customer_name, plan_name, amount_total, session_id, phone, project_type } = body;

    if (!customer_email) return Response.json({ error: 'customer_email required' }, { status: 400 });

    // 1. Create CustomerAccount
    let customer;
    try {
      customer = await base44.entities.CustomerAccount.create({
        organization_id: orgId,
        name: customer_name || customer_email.split('@')[0],
        email: customer_email,
        phone: phone || '',
        status: 'onboarding',
        project_type: project_type || plan_name || 'website',
        deposit_paid: true,
        deposit_amount: amount_total || 0,
        deposit_session_id: session_id || '',
        onboarding_stage: 'deposit_received',
      });
    } catch (e) {
      // CustomerAccount might not have all these fields — try minimal
      customer = await base44.entities.CustomerAccount.create({
        organization_id: orgId,
        name: customer_name || customer_email.split('@')[0],
        email: customer_email,
      });
    }

    // 2. Create ClientProject
    let project;
    try {
      project = await base44.entities.ClientProject.create({
        organization_id: orgId,
        customer_account_id: customer.id,
        project_name: `${customer_name || 'New Client'} — ${plan_name || 'Project'}`,
        status: 'onboarding',
        project_type: project_type || 'website',
      });
    } catch (e) {
      console.error('ClientProject creation failed:', e.message);
    }

    // 3. Create gated approval chain — each stage needs admin approval
    const approvalStages = [
      { stage: 'deposit_verification', note: 'Verify deposit payment and customer details' },
      { stage: 'consultation_scheduled', note: 'Schedule 15-min phone consultation' },
      { stage: 'scope_approved', note: 'Approve project scope after consultation' },
      { stage: 'build_kickoff', note: 'Kick off build after scope approval' },
      { stage: 'delivery_review', note: 'Final delivery review and handoff' },
    ];

    const approvals = [];
    for (const stage of approvalStages) {
      try {
        const approval = await base44.asServiceRole.entities.Approval.create({
          organization_id: orgId,
          subject_type: 'onboarding',
          subject_id: customer.id,
          state: 'pending',
          decision_note: stage.note,
        });
        approvals.push({ stage: stage.stage, approval_id: approval.id });
      } catch (e) { console.error(`Approval ${stage.stage} failed:`, e.message); }
    }

    // 4. Create appointment request (15-min consultation)
    let appointment;
    try {
      appointment = await base44.entities.Appointment.create({
        organization_id: orgId,
        customer_account_id: customer.id,
        appointment_type: 'consultation',
        duration_minutes: 15,
        status: 'requested',
        notes: `Auto-created from deposit payment. Plan: ${plan_name || 'N/A'}. Customer: ${customer_email}`,
      });
    } catch (e) { console.error('Appointment creation failed:', e.message); }

    // 5. Send welcome email (only works for registered users)
    try {
      await base44.integrations.Core.SendEmail({
        to: customer_email,
        subject: `Welcome to Xtreme AI Systems — Your ${plan_name || 'Project'} Onboarding Has Begun`,
        body: `Hi ${customer_name || 'there'},\n\nThank you for your deposit! Your onboarding process has been automatically initiated.\n\nHere's what happens next:\n1. Our team will review your deposit and approve your onboarding (within 1 business hour)\n2. You'll receive a link to schedule your 15-minute phone consultation\n3. After the consultation, we'll finalize your project scope and begin the build\n\nYour onboarding ID: ${customer.id}\nPlan: ${plan_name || 'Standard'}\n\nWe're excited to work with you!\n\n— Xtreme AI Systems Team`,
      });
    } catch (e) { console.error('Welcome email failed (user may not be registered):', e.message); }

    // 6. Log receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'onboarding', action: 'deposit_trigger',
        status: 'success',
        summary: `Deposit onboarding triggered for ${customer_email} — ${plan_name || 'plan'}`,
        evidence: {
          customer_id: customer.id, project_id: project?.id,
          approvals: approvals.length, appointment_id: appointment?.id,
          session_id, amount_total
        }
      });
    } catch (e) { console.error('receipt failed:', e); }

    return Response.json({
      status: 'success',
      customer_id: customer.id,
      project_id: project?.id,
      approvals_created: approvals.length,
      appointment_id: appointment?.id,
      message: `Onboarding triggered for ${customer_email}`
    });
  } catch (error) {
    console.error('triggerDepositOnboarding error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}