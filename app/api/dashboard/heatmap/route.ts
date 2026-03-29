import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startOfDay, endOfDay, getHours } from 'date-fns';
import prisma from '@/lib/prisma';



export async function GET() {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Fetch all engineers
    const engineers = await prisma.user.findMany({
      where: { role: 'ENGINEER', isActive: true },
      select: { id: true, name: true },
    });

    // Fetch today's jobs
    const jobs = await prisma.job.findMany({
      where: {
        engineerId: { in: engineers.map(e => e.id) },
        scheduledDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: { engineerId: true, scheduledDate: true },
    });

    // Process heatmap data: { engineerId, hourData: { [hour]: count } }
    const heatmapData = engineers.map(engineer => {
      const engineerJobs = jobs.filter(j => j.engineerId === engineer.id);
      const hourData: Record<number, number> = {};

      // Initialize hours 8 to 18
      for (let h = 8; h <= 18; h++) {
        hourData[h] = 0;
      }

      engineerJobs.forEach(job => {
        if (job.scheduledDate) {
          const hour = getHours(job.scheduledDate);
          if (hour >= 8 && hour <= 18) {
            hourData[hour] = (hourData[hour] || 0) + 1;
          }
        }
      });

      return {
        id: engineer.id,
        name: engineer.name,
        hourData,
      };
    });

    return NextResponse.json({ engineers: heatmapData });
  } catch (error) {
    console.error('Heatmap API Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
