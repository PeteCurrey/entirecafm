import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === 'ytd' ? Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000) : 30;
    const from = new Date(Date.now() - days * 86400000);

    const jobs = await prisma.job.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } });

    // Group by date
    const dateMap: Record<string, number> = {};
    jobs.forEach((j: any) => {
      const d = j.createdAt.toISOString().split('T')[0];
      dateMap[d] = (dateMap[d] || 0) + 1;
    });

    const result = Array.from({ length: days }).map((_, i) => {
      const d = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().split('T')[0];
      return { date: d, jobs: dateMap[d] || 0 };
    });

    return NextResponse.json(result);
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 });
  }
}
