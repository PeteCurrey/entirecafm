import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET() {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const invoices = await prisma.invoice.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { total: true, status: true, createdAt: true, paidAt: true }
    });

    const months = Array(12).fill(0).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { month: d.toLocaleString('default', { month: 'short', year: '2-digit' }), invoiced: 0, paid: 0 };
    });

    invoices.forEach(inv => {
      const d = new Date(inv.createdAt);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const idx = months.findIndex(m => m.month === label);
      if (idx >= 0) {
        months[idx].invoiced += inv.total;
        if (inv.status === 'PAID') months[idx].paid += inv.total;
      }
    });

    return NextResponse.json(months);
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 });
  }
}
