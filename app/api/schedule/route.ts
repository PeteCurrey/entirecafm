import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const engineers = await prisma.user.findMany({
      where: { role: 'ENGINEER', isActive: true },
      select: { id: true, name: true, avatar: true }
    });

    const jobs = await prisma.job.findMany({
      where: { 
        status: { in: ['NEW', 'ASSIGNED', 'ON_ROUTE', 'ON_SITE'] }
      },
      include: {
        site: { select: { name: true } },
      }
    });

    return NextResponse.json({ engineers, jobs });
  } catch (error) {
    console.error('Schedule GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
