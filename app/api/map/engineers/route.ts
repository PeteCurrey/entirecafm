import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET() {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const engineers = await prisma.user.findMany({
      where: { role: 'ENGINEER', isActive: true },
      select: {
        id: true, name: true, email: true, phone: true,
        location: { select: { lat: true, lng: true, updatedAt: true } },
        jobs: {
          where: { status: { in: ['ON_ROUTE', 'ON_SITE', 'ASSIGNED'] } },
          take: 1,
          include: { site: { select: { name: true, address: true } } }
        }
      }
    });

    const now = new Date();
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);

    return NextResponse.json(engineers.map(e => ({
      id: e.id,
      name: e.name,
      phone: e.phone,
      lat: e.location?.lat ?? null,
      lng: e.location?.lng ?? null,
      lastUpdate: e.location?.updatedAt ?? null,
      isOffline: !e.location?.updatedAt || new Date(e.location.updatedAt) < tenMinAgo,
      currentJob: e.jobs[0] ? {
        title: e.jobs[0].title,
        site: e.jobs[0].site?.name,
        status: e.jobs[0].status,
      } : null,
      status: e.jobs[0]?.status === 'ON_SITE' ? 'ON_SITE'
        : e.jobs[0]?.status === 'ON_ROUTE' ? 'ON_ROUTE'
        : !e.location?.updatedAt || new Date(e.location.updatedAt) < tenMinAgo ? 'OFFLINE'
        : 'AVAILABLE'
    })));
  } catch (error) {
    console.error('Map Engineers Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
