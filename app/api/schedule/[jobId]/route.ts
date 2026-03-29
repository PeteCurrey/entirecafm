import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function PATCH(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { engineerId, scheduledDate } = await req.json();

    const job = await prisma.$transaction(async (tx) => {
      const updatedJob = await tx.job.update({
        where: { id: jobId },
        data: {
          engineerId,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          status: 'ASSIGNED'
        }
      });

      // Log dispatch activity
      await tx.jobActivity.create({
        data: {
          jobId: updatedJob.id,
          userId: session.user.id,
          type: 'DISPATCH',
          content: `Job scheduled and dispatched to Engineer. Scheduled Date: ${scheduledDate.split('T')[0]}`
        }
      });

      return updatedJob;
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error('Schedule PATCH Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
