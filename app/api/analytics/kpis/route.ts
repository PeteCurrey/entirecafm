import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


function getPeriodStart(period: string) {
  const now = new Date();
  switch (period) {
    case '7d': return new Date(now.getTime() - 7 * 86400000);
    case '90d': return new Date(now.getTime() - 90 * 86400000);
    case 'ytd': return new Date(now.getFullYear(), 0, 1);
    default: return new Date(now.getTime() - 30 * 86400000); // 30d
  }
}

export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';
    const from = getPeriodStart(period);
    const now = new Date();

    const [total, completed, withSla, completedOnTime, allJobs] = await Promise.all([
      prisma.job.count({ where: { createdAt: { gte: from } } }),
      prisma.job.count({ where: { status: 'COMPLETED', updatedAt: { gte: from } } }),
      prisma.job.count({ where: { createdAt: { gte: from }, slaDeadline: { not: null } } }),
      prisma.job.count({ where: { status: 'COMPLETED', updatedAt: { gte: from }, slaDeadline: { gt: now } } }),
      prisma.job.findMany({
        where: { createdAt: { gte: from } },
        select: { id: true, status: true, priority: true, type: true, createdAt: true, slaDeadline: true, engineer: { select: { name: true } } }
      }),
    ]);

    const slaCompliance = withSla === 0 ? 100 : Math.round((completedOnTime / withSla) * 100);

    // Status distribution
    const statusDist: Record<string, number> = {};
    allJobs.forEach(j => { statusDist[j.status] = (statusDist[j.status] || 0) + 1; });

    // Priority distribution
    const priorityDist: Record<string, number> = {};
    allJobs.forEach(j => { priorityDist[j.priority] = (priorityDist[j.priority] || 0) + 1; });

    // Engineer workload
    const engWork: Record<string, number> = {};
    allJobs.forEach(j => {
      if (j.engineer?.name) engWork[j.engineer.name] = (engWork[j.engineer.name] || 0) + 1;
    });

    // Top clients
    const clientJobs = await prisma.job.findMany({
      where: { createdAt: { gte: from } },
      include: { client: { select: { name: true } } }
    });
    const clientMap: Record<string, { total: number; completed: number }> = {};
    clientJobs.forEach(j => {
      const n = j.client?.name || 'Unknown';
      if (!clientMap[n]) clientMap[n] = { total: 0, completed: 0 };
      clientMap[n].total++;
      if (j.status === 'COMPLETED') clientMap[n].completed++;
    });

    return NextResponse.json({
      kpis: { total, completed, slaCompliance, engineerCount: Object.keys(engWork).length },
      statusDist: Object.entries(statusDist).map(([status, count]) => ({ status, count })),
      priorityDist: Object.entries(priorityDist).map(([priority, count]) => ({ priority, count })),
      engineerWorkload: Object.entries(engWork).map(([name, jobs]) => ({ name, jobs })).sort((a, b) => b.jobs - a.jobs),
      topClients: Object.entries(clientMap).map(([name, d]) => ({ name, total: d.total, completed: d.completed, rate: Math.round((d.completed / d.total) * 100) })).sort((a, b) => b.total - a.total).slice(0, 10),
    });
  } catch (error) {
    console.error('Analytics KPIs Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
