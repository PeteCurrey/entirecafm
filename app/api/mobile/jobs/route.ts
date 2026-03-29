import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'today'; // today | week | all

    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + 7);

    let where: any = {
      engineerId: session.user.id,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'INVOICED'] }
    };

    if (filter === 'today') {
      where.OR = [
        { scheduledDate: { gte: today, lte: new Date(now.getTime() + 86400000) } },
        { status: { in: ['ON_SITE', 'ON_ROUTE'] } }
      ];
    } else if (filter === 'week') {
      where.scheduledDate = { gte: today, lte: endOfWeek };
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        client: { select: { name: true } },
        site: { select: { name: true, address: true, postcode: true, lat: true, lng: true } },
      },
      orderBy: [{ priority: 'desc' }, { scheduledDate: 'asc' }]
    });

    // Completed today
    const completedToday = await prisma.job.count({
      where: { engineerId: session.user.id, status: 'COMPLETED', updatedAt: { gte: today } }
    });

    // This week total
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
    const weekCount = await prisma.job.count({
      where: { engineerId: session.user.id, createdAt: { gte: weekStart } }
    });

    return NextResponse.json({ jobs, completedToday, weekCount });
  } catch (error) {
    console.error('Mobile Jobs Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { jobId, status, note } = await req.json();
    const existingJob = await prisma.job.findUnique({ where: { id: jobId }, select: { notes: true } });
    const newNotes = note ? (existingJob?.notes ? `${existingJob.notes}\n${note}` : note) : undefined;

    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status,
        ...(newNotes ? { notes: newNotes } : {}),
      }
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error('Mobile Job PATCH Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
