import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns financial summary: revenue, expenses, AR aging, P&L, cash flow, top categories.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const [invoices, expenses] = await Promise.all([
      base44.asServiceRole.entities.Invoice.filter({ organization_id: orgId }),
      base44.asServiceRole.entities.Expense.filter({ organization_id: orgId })
    ]);

    // Revenue: sum of paid invoices
    const paidInvoices = invoices.filter(i => i.status === 'paid' || i.status === 'partial');
    const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0);

    // Outstanding AR
    const outstandingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'viewed' || i.status === 'partial' || i.status === 'overdue');
    const totalAR = outstandingInvoices.reduce((sum, i) => sum + (i.balance_due || 0), 0);

    // Overdue
    const today = new Date().toISOString().split('T')[0];
    const overdueInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'void' && i.due_date < today);
    const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.balance_due || 0), 0);

    // Expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Net income
    const netIncome = totalRevenue - totalExpenses;

    // AR aging buckets
    const arAging = { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };
    for (const inv of outstandingInvoices) {
      const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000);
      if (daysOverdue <= 0) arAging.current += inv.balance_due || 0;
      else if (daysOverdue <= 30) arAging['1_30'] += inv.balance_due || 0;
      else if (daysOverdue <= 60) arAging['31_60'] += inv.balance_due || 0;
      else if (daysOverdue <= 90) arAging['61_90'] += inv.balance_due || 0;
      else arAging['90_plus'] += inv.balance_due || 0;
    }

    // Expenses by category
    const expensesByCategory = {};
    for (const exp of expenses) {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + (exp.amount || 0);
    }

    // Monthly trend (last 6 months)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = d.toISOString().substring(0, 7);
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const monthRevenue = paidInvoices
        .filter(inv => inv.payments?.some(p => p.date?.startsWith(monthKey)))
        .reduce((sum, inv) => sum + (inv.payments?.filter(p => p.date?.startsWith(monthKey)).reduce((s, p) => s + p.amount, 0) || 0), 0);
      const monthExpenses = expenses
        .filter(e => e.date?.startsWith(monthKey))
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      months.push({ month: monthName, revenue: monthRevenue, expenses: monthExpenses, net: monthRevenue - monthExpenses });
    }

    // Top clients by revenue
    const clientRevenue = {};
    for (const inv of paidInvoices) {
      clientRevenue[inv.client_name] = (clientRevenue[inv.client_name] || 0) + (inv.amount_paid || 0);
    }
    const topClients = Object.entries(clientRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue }));

    return Response.json({
      status: 'success',
      summary: {
        total_revenue: totalRevenue,
        total_ar: totalAR,
        total_overdue: totalOverdue,
        total_expenses: totalExpenses,
        net_income: netIncome,
        profit_margin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
        invoice_count: invoices.length,
        paid_count: invoices.filter(i => i.status === 'paid').length,
        outstanding_count: outstandingInvoices.length,
        overdue_count: overdueInvoices.length,
        expense_count: expenses.length
      },
      ar_aging: arAging,
      expenses_by_category: expensesByCategory,
      monthly_trend: months,
      top_clients: topClients,
      recent_invoices: invoices.slice(0, 10).map(i => ({
        id: i.id, number: i.invoice_number, client: i.client_name, total: i.total,
        balance: i.balance_due, status: i.status, due_date: i.due_date
      })),
      recent_expenses: expenses.slice(0, 10).map(e => ({
        id: e.id, date: e.date, vendor: e.vendor, amount: e.amount, category: e.category
      }))
    });
  } catch (error) {
    console.error('getFinancialSummary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}