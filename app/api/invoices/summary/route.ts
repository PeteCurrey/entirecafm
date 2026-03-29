import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const invoices = await prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1) // YTD
        }
      },
      select: {
        total: true,
        status: true,
        createdAt: true,
        paidAt: true
      }
    });

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((sum, inv) => sum + inv.total, 0);
    const outstanding = invoices.filter(i => ['SENT', 'OVERDUE'].includes(i.status)).reduce((sum, inv) => sum + inv.total, 0);

    // monthly breakdown
    const months = Array(12).fill(0).map((_, i) => ({
      name: new Date(2000, i, 1).toLocaleString('default', { month: 'short' }),
      invoiced: 0,
      paid: 0
    }));

    invoices.forEach(inv => {
      const monthIndex = new Date(inv.createdAt).getMonth();
      months[monthIndex].invoiced += inv.total;
      if (inv.status === 'PAID') {
        const paidMonth = inv.paidAt ? new Date(inv.paidAt).getMonth() : monthIndex;
        months[paidMonth].paid += inv.total;
      }
    });

    return NextResponse.json({
      metrics: { totalInvoiced, totalPaid, outstanding },
      chart: months
    });
  } catch (error) {
    console.error('Invoice Summary GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
