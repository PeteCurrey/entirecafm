import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) return new NextResponse('Missing siteId', { status: 400 });

    const assets = await prisma.asset.findMany({
      where: { siteId },
      include: {
        ppmTasks: {
          orderBy: { nextDue: 'asc' }
        }
      }
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error('PPM Plans GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
