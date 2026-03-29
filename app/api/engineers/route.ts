import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const engineers = await prisma.user.findMany({
      where: { role: 'ENGINEER' },
      include: {
        location: true,
        jobs: {
          where: { status: 'ON_SITE' },
          select: { id: true, title: true, status: true },
          take: 1
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(engineers);
  } catch (error) {
    console.error('Engineers GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
