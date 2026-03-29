import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const clientData = await prisma.client.findUnique({
      where: { id },
      include: {
        sites: true,
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        invoices: true,
        quotes: true
      }
    });

    if (!clientData) return new NextResponse('Client Not Found', { status: 404 });

    // Financial calculations
    const ytdRevenue = clientData.invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((acc, curr) => acc + curr.total, 0);

    const outstandingBalance = clientData.invoices
      .filter(inv => ['SENT', 'OVERDUE'].includes(inv.status))
      .reduce((acc, curr) => acc + curr.total, 0);

    const openJobs = clientData.jobs.filter(j => !['COMPLETED', 'INVOICED', 'CANCELLED'].includes(j.status)).length;

    // Monthly revenue mapping for Recharts (last 12 months)
    const monthlyRevMap: Record<string, number> = {};
    clientData.invoices.filter(inv => inv.status === 'PAID').forEach(inv => {
       const monthStr = new Date(inv.createdAt).toISOString().substring(0, 7); // YYYY-MM
       monthlyRevMap[monthStr] = (monthlyRevMap[monthStr] || 0) + inv.total;
    });

    const revenueData = Object.entries(monthlyRevMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, total]) => ({ month, total }));

    return NextResponse.json({
       ...clientData,
       stats: {
          ytdRevenue,
          outstandingBalance,
          openJobs,
          siteCount: clientData.sites.length
       },
       revenueData
    });
  } catch (error) {
    console.error('Client Detail GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const updated = await prisma.client.update({
      where: { id },
      data: body
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Client Detail PATCH Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
