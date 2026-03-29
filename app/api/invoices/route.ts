import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const invoices = await prisma.invoice.findMany({
      include: {
        client: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Invoices GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    
    // Auto-generate invoice number (EFM-INV-YYYY-NNNNN)
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
      where: { invoiceNumber: { startsWith: `EFM-INV-${year}-` } }
    });
    const invoiceNumber = `EFM-INV-${year}-${String(count + 1).padStart(5, '0')}`;

    const invoice = await prisma.$transaction(async (tx) => {
       const inv = await tx.invoice.create({
         data: {
            invoiceNumber,
            clientId: body.clientId,
            lineItems: body.lineItems,
            subtotal: body.subtotal,
            tax: body.tax,
            total: body.total,
            dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
            notes: body.notes,
            status: 'DRAFT',
         }
       });

       // Mark linked jobs as INVOICED if passed
       if (body.linkedJobs && body.linkedJobs.length > 0) {
          await tx.job.updateMany({
             where: { id: { in: body.linkedJobs } },
             data: { 
               status: 'INVOICED',
               invoiceId: inv.id
             }
          });
       }
       return inv;
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Invoices POST Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
