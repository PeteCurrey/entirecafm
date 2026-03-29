import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const request = await prisma.request.findUnique({
      where: { id }
    });

    if (!request) return new NextResponse('Not Found', { status: 404 });
    if (request.status === 'Converted to Job' || request.convertedToJobId) {
      return new NextResponse('Already converted', { status: 400 });
    }

    // Generate EFM-YYYY-NNNNN job number
    const year = new Date().getFullYear();
    const count = await prisma.job.count({
      where: { jobNumber: { startsWith: `EFM-${year}-` } }
    });
    const jobNumber = `EFM-${year}-${String(count + 1).padStart(5, '0')}`;

    const newJob = await prisma.$transaction(async (tx) => {
      // 1. Create the new Job from Request data
      const job = await tx.job.create({
        data: {
          jobNumber,
          clientId: request.clientId,
          siteId: request.siteId,
          title: request.title,
          description: request.description,
          priority: request.priority,
          status: 'NEW'
        }
      });

      // 2. Update the Request to Converted
      await tx.request.update({
        where: { id },
        data: { 
          status: 'Converted to Job',
          convertedToJobId: job.id
        }
      });

      // 3. Insert genesis activity log
      await tx.jobActivity.create({
        data: {
          jobId: job.id,
          userId: session.user.id,
          type: 'CREATED',
          content: `Job generated from Portal Request #${id.slice(0, 8)}`,
        }
      });

      return job;
    });

    return NextResponse.json(newJob);
  } catch (error) {
    console.error('Request Convert API Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
