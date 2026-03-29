import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const site = await prisma.site.findUnique({
      where: { id },
      include: {
        client: true,
        assets: true,
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        ppmPlans: {
          include: { tasks: true }
        }
      }
    });

    if (!site) return new NextResponse('Site Not Found', { status: 404 });

    // Calculate PPM Compliance % dynamically for this specific site
    let totalTasks = 0;
    let completedTasks = 0;
    const year = new Date().getFullYear();

    site.ppmPlans.forEach(plan => {
       if (plan.year === year) {
         plan.tasks.forEach(task => {
           totalTasks++;
           if (task.status === 'COMPLETED') completedTasks++;
         });
       }
    });

    const compliance = totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100);

    return NextResponse.json({
       ...site,
       ppmCompliance: compliance,
       totalJobsCount: site.jobs.length,
       totalAssetsCount: site.assets.length
    });
  } catch (error) {
    console.error('Site Detail GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
