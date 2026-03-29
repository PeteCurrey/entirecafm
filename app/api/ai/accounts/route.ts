import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const invoices = await prisma.invoice.findMany({
      where: { createdAt: { gte: ninetyDaysAgo } },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: 'asc' }
    });

    // Group by client
    const clientMap: Record<string, { name: string; invoiced: number; paid: number; outstanding: number; daysToPaySum: number; daysToPayCount: number }> = {};
    for (const inv of invoices) {
      const n = inv.client?.name || 'Unknown';
      if (!clientMap[n]) clientMap[n] = { name: n, invoiced: 0, paid: 0, outstanding: 0, daysToPaySum: 0, daysToPayCount: 0 };
      clientMap[n].invoiced += inv.total;
      if (inv.status === 'PAID') {
        clientMap[n].paid += inv.total;
        if (inv.paidAt) {
          const days = Math.floor((new Date(inv.paidAt).getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          clientMap[n].daysToPaySum += days;
          clientMap[n].daysToPayCount++;
        }
      } else if (['SENT', 'OVERDUE'].includes(inv.status)) {
        clientMap[n].outstanding += inv.total;
      }
    }

    const clientSummaries = Object.values(clientMap).sort((a, b) => b.outstanding - a.outstanding);
    const totalPaidThisMonth = invoices.filter(i => i.status === 'PAID' && i.paidAt && new Date(i.paidAt) >= startOfMonth).reduce((s, i) => s + i.total, 0);
    const totalOutstanding = invoices.filter(i => ['SENT', 'OVERDUE'].includes(i.status)).reduce((s, i) => s + i.total, 0);

    const dataString = `Cash received this month: £${totalPaidThisMonth.toLocaleString()} | Total outstanding: £${totalOutstanding.toLocaleString()} | Client breakdown: ${clientSummaries.map(c => `${c.name}: invoiced £${c.invoiced.toLocaleString()}, outstanding £${c.outstanding.toLocaleString()}, avg days to pay: ${c.daysToPayCount ? Math.round(c.daysToPaySum / c.daysToPayCount) : 'N/A'}`).join('; ')}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      system: 'You are a financial AI for EntireCAFM. Analyse the accounts data and return ONLY valid JSON (no markdown): {"cashflowSummary":"2 sentences","overdueRiskClients":[{"client":"","amount":0,"daysOverdue":0,"recommendation":""}],"paymentPatternInsight":"","collectionPriorities":[{"client":"","action":"","urgency":"high|medium|low"}],"revenueOutlook":""}',
      messages: [{ role: 'user', content: dataString }]
    });

    const text = message.content.find(b => b.type === 'text');
    if (!text || text.type !== 'text') throw new Error('No text');
    const parsed = JSON.parse(text.text.replace(/```json\n?|```\n?/g, '').trim());

    // Monthly trend (last 12 months)
    const months = Array(12).fill(0).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { month: d.toLocaleString('default', { month: 'short', year: '2-digit' }), invoiced: 0, paid: 0 };
    });
    for (const inv of await prisma.invoice.findMany({ where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } } })) {
      const d = new Date(inv.createdAt);
      const idx = months.findIndex(m => m.month === d.toLocaleString('default', { month: 'short', year: '2-digit' }));
      if (idx >= 0) { months[idx].invoiced += inv.total; if (inv.status === 'PAID') months[idx].paid += inv.total; }
    }

    return NextResponse.json({ analysis: parsed, clients: clientSummaries, trend: months, metrics: { totalPaidThisMonth, totalOutstanding } });
  } catch (error) {
    console.error('AI Accounts Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
