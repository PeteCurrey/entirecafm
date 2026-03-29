import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';



export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');
    const clientId = searchParams.get('clientId');
    const engineerId = searchParams.get('engineerId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const offset = (page - 1) * limit;

    // Build Prisma query
    const where: Prisma.JobWhereInput = {
      AND: [
        search ? {
          OR: [
            { jobNumber: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { client: { name: { contains: search, mode: 'insensitive' } } },
          ],
        } : {},
        status ? { status: status as any } : {},
        priority ? { priority: priority as any } : {},
        type ? { type: type as any } : {},
        clientId ? { clientId } : {},
        engineerId ? { engineerId } : {},
        from || to ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        } : {},
      ],
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          client: { select: { name: true } },
          site: { select: { name: true, lat: true, lng: true } },
          engineer: { select: { name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Jobs API GET Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { 
      clientId, 
      siteId, 
      title, 
      description, 
      type, 
      priority, 
      engineerId, 
      slaDeadline, 
      scheduledDate,
      notes 
    } = body;

    // Generate Job Number (EFM-YYYY-NNNNN)
    const year = new Date().getFullYear();
    const jobCount = await prisma.job.count({
      where: {
        jobNumber: { startsWith: `EFM-${year}` },
      },
    });
    const jobNumber = `EFM-${year}-${(jobCount + 1).toString().padStart(5, '0')}`;

    // Create Job and Activity in a transaction
    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          jobNumber,
          clientId,
          siteId,
          title,
          description,
          type: type || 'REACTIVE',
          priority: priority || 'MEDIUM',
          engineerId,
          slaDeadline: slaDeadline ? new Date(slaDeadline) : null,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          notes,
        },
      });

      // Log activity
      await tx.jobActivity.create({
        data: {
          jobId: newJob.id,
          userId: session.user.id,
          type: 'CREATED',
          content: `Job ${jobNumber} created by ${session.user.email}`,
        },
      });

      if (engineerId) {
        await tx.jobActivity.create({
          data: {
            jobId: newJob.id,
            userId: session.user.id,
            type: 'ASSIGNMENT',
            content: `Job assigned to engineer`,
          },
        });
      }

      return newJob;
    });

    // TODO: Send Resend Email Notifications

    return NextResponse.json(job);
  } catch (error) {
    console.error('Jobs API POST Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
