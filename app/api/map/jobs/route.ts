import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET() {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const jobs = await prisma.job.findMany({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'INVOICED'] } },
      include: {
        client: { select: { name: true } },
        site: { select: { name: true, address: true, postcode: true, lat: true, lng: true } },
        engineer: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return NextResponse.json(
      jobs
        .filter(j => j.site?.lat && j.site?.lng)
        .map(j => ({
          id: j.id,
          jobNumber: j.jobNumber,
          title: j.title,
          priority: j.priority,
          status: j.status,
          slaDeadline: j.slaDeadline,
          clientName: j.client?.name,
          siteName: j.site?.name,
          siteAddress: `${j.site?.address || ''} ${j.site?.postcode || ''}`.trim(),
          engineer: j.engineer?.name,
          lat: j.site!.lat,
          lng: j.site!.lng,
        }))
    );
  } catch (error) {
    console.error('Map Jobs Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
