import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Records a payment against an invoice. Updates amount_paid, balance_due, and status.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;

    const body = await req.json().catch(() => ({}));
    const { invoice_id, amount, date, method, reference } = body;
    if (!invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });
    if (!amount || amount <= 0) return Response.json({ error: 'Valid payment amount required' }, { status: 400 });

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    if (!invoice || invoice.organization_id !== orgId) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    const payments = [...(invoice.payments || []), {
      amount,
      date: date || new Date().toISOString().split('T')[0],
      method: method || 'bank_transfer',
      reference: reference || null
    }];

    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = invoice.total - amountPaid;
    let status = invoice.status;
    if (balanceDue <= 0) {
      status = 'paid';
    } else if (amountPaid > 0) {
      status = 'partial';
    }

    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      payments,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      status,
      paid_at: status === 'paid' ? new Date().toISOString() : invoice.paid_at
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'books',
      action: 'record_payment',
      status: 'success',
      summary: `Payment of $${amount.toFixed(2)} recorded for ${invoice.invoice_number} — balance: $${balanceDue.toFixed(2)}`,
      evidence: { invoice_id, invoice_number: invoice.invoice_number, amount, method, balance_due: balanceDue }
    });

    return Response.json({
      status: 'success',
      invoice_status: status,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      message: status === 'paid' ? 'Invoice fully paid' : `Payment recorded. Remaining balance: $${balanceDue.toFixed(2)}`
    });
  } catch (error) {
    console.error('recordInvoicePayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}