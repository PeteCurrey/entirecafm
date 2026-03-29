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
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      jobsThisMonth, jobsLastMonth,
      invoicesThisMonth, invoicesLastMonth,
      completedThis, completedLast,
      allSites, engineers
    ] = await Promise.all([
      prisma.job.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.job.count({ where: { createdAt: { gte: lastMonth, lte: lastMonthEnd } } }),
      prisma.invoice.findMany({ where: { createdAt: { gte: thisMonth } }, select: { total: true, status: true } }),
      prisma.invoice.findMany({ where: { createdAt: { gte: lastMonth, lte: lastMonthEnd } }, select: { total: true, status: true } }),
      prisma.job.count({ where: { status: 'COMPLETED', updatedAt: { gte: thisMonth } } }),
      prisma.job.count({ where: { status: 'COMPLETED', updatedAt: { gte: lastMonth, lte: lastMonthEnd } } }),
      prisma.site.findMany({ include: { ppmPlans: { include: { tasks: true } } } }),
      prisma.user.count({ where: { role: 'ENGINEER', isActive: true } })
    ]);

    const revThis = invoicesThisMonth.reduce((s: number, i: any) => s + i.total, 0);
    const revLast = invoicesLastMonth.reduce((s: number, i: any) => s + i.total, 0);
    const paidThis = invoicesThisMonth.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + i.total, 0);
    const paidLast = invoicesLastMonth.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + i.total, 0);

    let ppmTotal = 0, ppmDone = 0, ppmOverdue = 0;
    for (const s of allSites) for (const p of s.ppmPlans) for (const t of p.tasks) {
      ppmTotal++; if (t.status === 'COMPLETED') ppmDone++;
      if (t.nextDue && new Date(t.nextDue) < now && t.status !== 'COMPLETED') ppmOverdue++;
    }
    const ppmCompliance = ppmTotal === 0 ? 100 : Math.round((ppmDone / ppmTotal) * 100);
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    const dataStr = `Month: ${monthName}
Revenue this month: £${revThis.toLocaleString()} (vs £${revLast.toLocaleString()} last month)
Paid invoices this month: £${paidThis.toLocaleString()} (vs £${paidLast.toLocaleString()} last month)
Jobs created this month: ${jobsThisMonth} (vs ${jobsLastMonth} last month)
Jobs completed this month: ${completedThis} (vs ${completedLast} last month)
Active engineers: ${engineers}
PPM compliance: ${ppmCompliance}% (${ppmOverdue} overdue tasks)
Total managed sites: ${allSites.length}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: `Write a professional board-level executive briefing for an FM company. Be specific with numbers. Include month-on-month comparison. Professional, analytical tone. Return ONLY valid JSON (no markdown):
{"month":"","sections":[{"title":"Revenue & Financial Performance","content":""},{"title":"Operational Performance","content":""},{"title":"Compliance Overview","content":""},{"title":"Engineer Utilisation","content":""},{"title":"Key Risks","content":""},{"title":"Strategic Recommendations","content":""}],"executiveSummary":""}`,
      messages: [{ role: 'user', content: dataStr }]
    });

    const text = message.content.find(b => b.type === 'text');
    if (!text || text.type !== 'text') throw new Error('No text');
    const parsed = JSON.parse(text.text.replace(/```json\n?|```\n?/g, '').trim());

    return NextResponse.json({
      briefing: parsed,
      rawData: { revThis, revLast, paidThis, paidLast, jobsThisMonth, jobsLastMonth, completedThis, completedLast, ppmCompliance, ppmOverdue, engineers, sites: allSites.length, month: monthName }
    });
  } catch (error) {
    console.error('AI Briefing Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
