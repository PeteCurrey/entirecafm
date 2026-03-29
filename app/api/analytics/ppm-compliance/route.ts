import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET() {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const now = new Date();
    const sites = await prisma.site.findMany({
      include: {
        client: { select: { name: true } },
        ppmPlans: { include: { tasks: { include: { asset: { select: { category: true } } } } } },
        _count: { select: { jobs: true } }
      }
    });

    const results = sites.map(s => {
      const tasks = s.ppmPlans.flatMap(p => p.tasks);
      const completed = tasks.filter(t => t.status === 'COMPLETED').length;
      const overdue = tasks.filter(t => t.nextDue && new Date(t.nextDue) < now && t.status !== 'COMPLETED').length;
      const compliance = tasks.length === 0 ? 100 : Math.round((completed / tasks.length) * 100);
      return { id: s.id, name: s.name, clientName: s.client?.name, compliance, totalTasks: tasks.length, completed, overdue, activeJobs: s._count.jobs };
    });

    const overdueTasks = sites.flatMap(s =>
      s.ppmPlans.flatMap(p =>
        p.tasks
          .filter(t => t.nextDue && new Date(t.nextDue) < now && t.status !== 'COMPLETED')
          .map(t => ({ id: t.id, title: t.title, category: (t as any).asset?.category || 'General', siteName: s.name, clientName: s.client?.name, nextDue: t.nextDue, daysOverdue: Math.floor((now.getTime() - new Date(t.nextDue!).getTime()) / 86400000) }))
      )
    ).sort((a, b) => b.daysOverdue - a.daysOverdue);

    const upcoming = sites.flatMap(s =>
      s.ppmPlans.flatMap(p =>
        p.tasks
          .filter(t => t.nextDue && new Date(t.nextDue) > now && new Date(t.nextDue) < new Date(now.getTime() + 30 * 86400000))
          .map(t => ({ id: t.id, title: t.title, siteName: s.name, nextDue: t.nextDue, statutory: t.isStatutory }))
      )
    ).sort((a, b) => new Date(a.nextDue!).getTime() - new Date(b.nextDue!).getTime());

    return NextResponse.json({ sites: results, overdueTasks, upcoming });
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 });
  }
}
