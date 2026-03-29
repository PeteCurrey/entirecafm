import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET() {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const now = new Date();
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [openJobs, slaAtRisk, ppmDue, overdue] = await Promise.all([
      // Tile 1: Open Jobs (Not COMPLETED, INVOICED, CANCELLED)
      prisma.job.count({
        where: {
          status: {
            notIn: ['COMPLETED', 'INVOICED', 'CANCELLED'],
          },
        },
      }),
      // Tile 2: SLA At Risk (< 4 hours)
      prisma.job.count({
        where: {
          status: {
            notIn: ['COMPLETED', 'INVOICED', 'CANCELLED'],
          },
          slaDeadline: {
            lt: fourHoursFromNow,
            gt: now,
          },
        },
      }),
      // Tile 3: PPM Due This Week
      prisma.pPMTask.count({
        where: {
          nextDue: {
            gte: now,
            lte: oneWeekFromNow,
          },
        },
      }),
      // Tile 4: Overdue
      prisma.job.count({
        where: {
          status: {
            notIn: ['COMPLETED', 'INVOICED', 'CANCELLED'],
          },
          slaDeadline: {
            lt: now,
          },
        },
      }),
    ]);

    return NextResponse.json({
      openJobs,
      slaAtRisk,
      ppmDue,
      overdue,
    });
  } catch (error) {
    console.error('KPIs API Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
