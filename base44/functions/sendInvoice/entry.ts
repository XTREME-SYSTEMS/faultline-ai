import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Sends invoice email to client. Generates an HTML email with the invoice details.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;

    const body = await req.json().catch(() => ({}));
    const { invoice_id } = body;
    if (!invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    if (!invoice || invoice.organization_id !== orgId) return Response.json({ error: 'Invoice not found' }, { status: 404 });
    if (!invoice.client_email) return Response.json({ error: 'Invoice has no client email address' }, { status: 400 });

    // Build invoice HTML
    const lineItemsHtml = invoice.line_items.map(item => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.description}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${item.rate.toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">$${item.amount.toFixed(2)}</td>
      </tr>`).join('');

    const invoiceHtml = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
        <div style="display:flex;justify-content:space-between;border-bottom:3px solid #C89B3C;padding-bottom:20px;">
          <div><h1 style="margin:0;font-size:28px;">INVOICE</h1><p style="color:#666;margin:5px 0 0;">${invoice.invoice_number}</p></div>
          <div style="text-align:right;"><p style="margin:0;font-size:14px;">Issue Date: ${invoice.issue_date}</p><p style="margin:5px 0 0;font-size:14px;">Due Date: <strong>${invoice.due_date}</strong></p></div>
        </div>
        <div style="margin:20px 0;"><h3>Bill To:</h3><p style="margin:5px 0;font-size:15px;"><strong>${invoice.client_name}</strong></p>${invoice.client_address ? `<p style="margin:0;color:#666;font-size:13px;white-space:pre-line;">${invoice.client_address}</p>` : ''}</div>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <thead><tr style="background:#f8f7f4;"><th style="padding:8px;text-align:left;border-bottom:2px solid #C89B3C;">Description</th><th style="padding:8px;text-align:center;border-bottom:2px solid #C89B3C;">Qty</th><th style="padding:8px;text-align:right;border-bottom:2px solid #C89B3C;">Rate</th><th style="padding:8px;text-align:right;border-bottom:2px solid #C89B3C;">Amount</th></tr></thead>
          <tbody>${lineItemsHtml}</tbody>
        </table>
        <div style="margin-left:auto;width:250px;">
          <div style="display:flex;justify-content:space-between;padding:5px 0;"><span>Subtotal:</span><span>$${invoice.subtotal.toFixed(2)}</span></div>
          ${invoice.tax_amount > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;"><span>Tax (${invoice.tax_rate}%):</span><span>$${invoice.tax_amount.toFixed(2)}</span></div>` : ''}
          ${invoice.discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;"><span>Discount:</span><span>-$${invoice.discount.toFixed(2)}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid #C89B3C;font-size:18px;font-weight:bold;"><span>Total Due:</span><span>$${invoice.total.toFixed(2)}</span></div>
        </div>
        ${invoice.notes ? `<div style="margin:20px 0;padding:15px;background:#f8f7f4;border-radius:8px;"><strong>Notes:</strong><br>${invoice.notes}</div>` : ''}
        ${invoice.terms ? `<div style="margin:10px 0;font-size:12px;color:#666;"><strong>Terms:</strong> ${invoice.terms}</div>` : ''}
      </div>`;

    await base44.integrations.Core.SendEmail({
      to: invoice.client_email,
      subject: `Invoice ${invoice.invoice_number} from FaultLine AI — $${invoice.total.toFixed(2)}`,
      body: `Hello ${invoice.client_name},\n\nPlease find your invoice below. A detailed breakdown is attached.\n\nInvoice: ${invoice.invoice_number}\nAmount Due: $${invoice.total.toFixed(2)}\nDue Date: ${invoice.due_date}\n\n${invoice.notes || ''}\n\n${invoiceHtml}\n\nThank you for your business.`
    });

    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      status: invoice.status === 'draft' ? 'sent' : invoice.status,
      sent_at: new Date().toISOString()
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'books',
      action: 'send_invoice',
      status: 'success',
      summary: `Sent invoice ${invoice.invoice_number} to ${invoice.client_email} ($${invoice.total.toFixed(2)})`,
      evidence: { invoice_id, invoice_number: invoice.invoice_number, client: invoice.client_email }
    });

    return Response.json({ status: 'success', message: `Invoice sent to ${invoice.client_email}` });
  } catch (error) {
    console.error('sendInvoice error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}