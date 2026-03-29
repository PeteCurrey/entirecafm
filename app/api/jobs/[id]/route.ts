import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        client: true,
        site: true,
        engineer: true,
        contractor: true,
        documents: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!job) return new NextResponse('Job not found', { status: 404 });

    return NextResponse.json(job);
  } catch (error) {
    console.error('Job API Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
