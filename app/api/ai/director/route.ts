import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      openJobs, slaAtRisk, overdueJobs,
      paidInvoicesThisMonth, outstandingInvoices,
      newClients, completedJobsThisMonth,
      criticalJobs, allSites, engineerJobCounts
    ] = await Promise.all([
      prisma.job.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'INVOICED'] } } }),
      prisma.job.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'INVOICED'] }, slaDeadline: { gte: now, lte: new Date(now.getTime() + 4 * 60 * 60 * 1000) } } }),
      prisma.job.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'INVOICED'] }, slaDeadline: { lt: now } } }),
      prisma.invoice.findMany({ where: { status: 'PAID', paidAt: { gte: startOfMonth } }, select: { total: true } }),
      prisma.invoice.findMany({ where: { status: { in: ['SENT', 'OVERDUE'] } }, select: { total: true } }),
      prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.job.count({ where: { status: 'COMPLETED', updatedAt: { gte: startOfMonth } } }),
      prisma.job.findMany({ where: { priority: 'CRITICAL', status: { notIn: ['COMPLETED', 'CANCELLED', 'INVOICED'] } }, include: { client: true, site: true }, take: 5 }),
      prisma.site.findMany({ include: { ppmPlans: { include: { tasks: true } } } }),
      prisma.user.findMany({ where: { role: 'ENGINEER', isActive: true }, include: { _count: { select: { jobs: true } } } })
    ]);

    const revenueThisMonth = paidInvoicesThisMonth.reduce((s: number, i: any) => s + i.total, 0);
    const outstandingBalance = outstandingInvoices.reduce((s: number, i: any) => s + i.total, 0);

    // PPM compliance
    let ppmTotal = 0, ppmCompleted = 0, overduePPMCount = 0;
    for (const site of allSites) {
      for (const plan of site.ppmPlans) {
        for (const task of plan.tasks) {
          ppmTotal++;
          if (task.status === 'COMPLETED') ppmCompleted++;
          if (task.nextDue && new Date(task.nextDue) < now && task.status !== 'COMPLETED') overduePPMCount++;
        }
      }
    }
    const ppmComplianceAvg = ppmTotal === 0 ? 100 : Math.round((ppmCompleted / ppmTotal) * 100);
    const engineerUtilisation = engineerJobCounts.length > 0
      ? (engineerJobCounts.reduce((s, e: any) => s + e._count.jobs, 0) / engineerJobCounts.length).toFixed(1)
      : '0';

    const criticalJobsList = criticalJobs.map((j: any) => ({ title: j.title, client: j.client?.name || 'Unknown', id: j.id }));

    const userPrompt = `Current operational data:
- Open jobs: ${openJobs}
- Jobs with SLA at risk (< 4h): ${slaAtRisk}
- Overdue jobs: ${overdueJobs}
- Revenue this month (paid invoices): £${revenueThisMonth.toLocaleString()}
- Outstanding balance: £${outstandingBalance.toLocaleString()}
- New clients this month: ${newClients}
- Completed jobs this month: ${completedJobsThisMonth}
- Average PPM compliance across sites: ${ppmComplianceAvg}%
- Overdue PPM tasks: ${overduePPMCount}
- Critical jobs open: ${criticalJobsList.length}
  ${criticalJobsList.map((j: any) => `${j.title} — ${j.client}`).join(', ') || 'None'}
- Engineer utilisation: ${engineerUtilisation} avg jobs per active engineer`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: `You are the AI director of EntireCAFM, a facilities management platform. You are briefing Peter Currey, the company founder and MD.
Be concise, direct, and action-oriented. Reference specific numbers from the data. Never give generic advice — every observation must be grounded in the actual metrics provided.
Identify risks, opportunities, and the single most important action to take today.
Respond ONLY in this exact JSON format, with no markdown wrapper:
{"headline":"One punchy sentence summarising the overall position","summary":"2-3 sentences of overall business assessment","alerts":[{"title":"Alert title","detail":"Specific detail with numbers","urgency":"high"}],"opportunities":[{"title":"Opportunity title","detail":"Specific detail"}],"topPriority":"The single most important action today — specific and actionable","kpiCommentary":"2 sentences specifically on the financial position","engineerInsight":"1 sentence on engineer utilisation or workload"}`,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const textContent = message.content.find(b => b.type === 'text');
    if (!textContent || textContent.type !== 'text') return new NextResponse('AI response empty', { status: 500 });

    const jsonStr = textContent.text.replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({
      briefing: parsed,
      kpis: { openJobs, slaAtRisk, overdueJobs, revenueThisMonth, outstandingBalance, newClients, completedJobsThisMonth, ppmComplianceAvg, overduePPMCount, engineerUtilisation }
    });
  } catch (error) {
    console.error('AI Director Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
