import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const sites = await prisma.site.findMany({
      include: {
        client: { select: { name: true } },
        _count: {
          select: { assets: true, jobs: { where: { status: { notIn: ['COMPLETED', 'INVOICED', 'CANCELLED'] } } } }
        },
        ppmPlans: {
          include: { tasks: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Calculate PPM Compliance % dynamically
    const enrichedSites = sites.map(site => {
      let totalTasks = 0;
      let completedTasks = 0;
      const year = new Date().getFullYear();

      site.ppmPlans.forEach(plan => {
         // rough calculation if year matches
         if (plan.year === year) {
           plan.tasks.forEach(task => {
             totalTasks++;
             if (task.status === 'COMPLETED') completedTasks++;
           });
         }
      });

      const compliance = totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100);

      return {
        ...site,
        ppmCompliance: compliance,
        // cleanup raw plans to keep response tight
        ppmPlans: undefined
      };
    });

    return NextResponse.json(enrichedSites);
  } catch (error) {
    console.error('Sites GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
