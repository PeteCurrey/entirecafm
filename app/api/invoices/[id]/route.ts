import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true
      }
    });

    if (!invoice) return new NextResponse('Invoice Not Found', { status: 404 });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Invoice Detail GET Error:', error);
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
    
    const updateData: any = {
       status: body.status || undefined,
    };

    if (body.status === 'PAID') {
       updateData.paidAt = new Date();
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Invoice Detail PATCH Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
