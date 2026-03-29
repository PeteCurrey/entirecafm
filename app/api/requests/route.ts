import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const requests = await prisma.request.findMany({
      include: {
        client: { select: { name: true } },
        site: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Requests GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
