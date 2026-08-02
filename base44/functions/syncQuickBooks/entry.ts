import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// QuickBooks sync — pulls customers and recent invoices from QuickBooks
// and cross-references them with FaultLine AI companies and findings.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const { accessToken, connectionConfig } = await base44.asServiceRole.connectors.getConnection('quickbooks');
    const realmId = connectionConfig?.realmId;
    if (!realmId) return Response.json({ error: 'QuickBooks not connected — missing realmId' }, { status: 400 });

    const baseUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}`;

    // Fetch customers
    const customerRes = await fetch(`${baseUrl}/query?query=SELECT * FROM Customer MAXRESULTS 100`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });
    const customerData = await customerRes.json();
    const customers = customerData.QueryResponse?.Customer || [];

    // Fetch recent invoices
    const invoiceRes = await fetch(`${baseUrl}/query?query=SELECT * FROM Invoice MAXRESULTS 50`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });
    const invoiceData = await invoiceRes.json();
    const invoices = invoiceData.QueryResponse?.Invoice || [];

    // Cross-reference with FaultLine companies
    const flCompanies = await base44.asServiceRole.entities.Company.filter({ organization_id: orgId }, '-created_date', 200);
    const matched = [];
    for (const qbCustomer of customers) {
      const flMatch = flCompanies.find(c =>
        c.name?.toLowerCase().includes(qbCustomer.DisplayName?.toLowerCase()) ||
        qbCustomer.DisplayName?.toLowerCase().includes(c.name?.toLowerCase())
      );
      matched.push({
        quickbooks_id: qbCustomer.Id,
        name: qbCustomer.DisplayName,
        email: qbCustomer.PrimaryEmailAddr?.Address,
        phone: qbCustomer.PrimaryPhone?.FreeFormNumber,
        balance: qbCustomer.Balance || 0,
        faultline_company_id: flMatch?.id || null,
        faultline_company_name: flMatch?.name || null
      });
    }

    // Calculate financial summary
    const totalOutstanding = invoices.reduce((sum, inv) => sum + parseFloat(inv.Balance || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + parseFloat(inv.TotalAmt || 0) - parseFloat(inv.Balance || 0), 0);

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'quickbooks',
      action: 'sync',
      status: 'success',
      summary: `QuickBooks sync: ${customers.length} customers, ${invoices.length} invoices, $${totalOutstanding.toFixed(2)} outstanding`,
      evidence: { customer_count: customers.length, invoice_count: invoices.length, total_outstanding: totalOutstanding }
    });

    return Response.json({
      status: 'success',
      customers: matched,
      invoices: invoices.map(inv => ({
        id: inv.Id,
        number: inv.DocNumber,
        customer: inv.CustomerRef?.name,
        total: parseFloat(inv.TotalAmt || 0),
        balance: parseFloat(inv.Balance || 0),
        date: inv.TxnDate,
        due_date: inv.DueDate,
        status: parseFloat(inv.Balance || 0) === 0 ? 'paid' : 'open'
      })),
      summary: {
        total_customers: customers.length,
        total_invoices: invoices.length,
        total_outstanding: totalOutstanding,
        total_paid: totalPaid
      }
    });
  } catch (error) {
    console.error('syncQuickBooks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}