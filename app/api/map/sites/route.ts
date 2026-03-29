import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET() {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const sites = await prisma.site.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      include: {
        client: { select: { name: true } },
        _count: { select: { jobs: true } }
      }
    });

    return NextResponse.json(sites.map(s => ({
      id: s.id,
      name: s.name,
      address: `${s.address || ''} ${s.postcode || ''}`.trim(),
      clientName: s.client?.name,
      lat: s.lat,
      lng: s.lng,
      activeJobs: s._count.jobs
    })));
  } catch (error) {
    console.error('Map Sites Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
