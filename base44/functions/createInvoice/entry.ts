import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Creates an invoice with auto-numbering. Calculates subtotal, tax, total, balance.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { company_id, client_name, client_email, client_address, issue_date, due_date, line_items, tax_rate, discount, notes, terms, status } = body;

    if (!client_name) return Response.json({ error: 'client_name required' }, { status: 400 });
    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) return Response.json({ error: 'At least one line item required' }, { status: 400 });

    // Auto-generate invoice number
    const existing = await base44.asServiceRole.entities.Invoice.filter({ organization_id: orgId }, '-created_date', 1);
    const count = existing.length > 0 ? parseInt(existing[0].invoice_number?.replace(/[^0-9]/g, '') || '0') + 1 : 1;
    const invoiceNumber = `INV-${String(count).padStart(4, '0')}`;

    // Calculate amounts
    const items = line_items.map(item => ({
      description: item.description || '',
      quantity: item.quantity || 1,
      rate: item.rate || 0,
      amount: (item.quantity || 1) * (item.rate || 0)
    }));
    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const taxAmt = subtotal * ((tax_rate || 0) / 100);
    const total = subtotal + taxAmt - (discount || 0);

    const invoice = await base44.asServiceRole.entities.Invoice.create({
      organization_id: orgId,
      invoice_number: invoiceNumber,
      company_id: company_id || null,
      client_name,
      client_email: client_email || null,
      client_address: client_address || null,
      issue_date: issue_date || new Date().toISOString().split('T')[0],
      due_date: due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      line_items: items,
      subtotal,
      tax_rate: tax_rate || 0,
      tax_amount: taxAmt,
      discount: discount || 0,
      total,
      amount_paid: 0,
      balance_due: total,
      status: status || 'draft',
      notes: notes || null,
      terms: terms || 'Payment due within 30 days of issue date.',
      sent_at: null,
      paid_at: null,
      payments: []
    });

    return Response.json({
      status: 'success',
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
      total
    });
  } catch (error) {
    console.error('createInvoice error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}