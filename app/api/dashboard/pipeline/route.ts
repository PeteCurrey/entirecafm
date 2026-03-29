import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { JobStatus } from '@prisma/client';
import prisma from '@/lib/prisma';



export async function GET() {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch counts for each JobStatus
    const statusCounts = await prisma.job.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    });

    // Map into a flat object with default 0s
    const pipeline: Record<string, number> = {
      NEW: 0,
      ASSIGNED: 0,
      ON_ROUTE: 0,
      ON_SITE: 0,
      COMPLETED: 0,
      INVOICED: 0,
      CANCELLED: 0,
    };

    statusCounts.forEach((record) => {
      pipeline[record.status] = record._count._all;
    });

    return NextResponse.json(pipeline);
  } catch (error) {
    console.error('Pipeline API Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
