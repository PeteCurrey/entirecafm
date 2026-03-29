import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const quotes = await prisma.quote.findMany({
      include: {
        client: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(quotes);
  } catch (error) {
    console.error('Quotes API GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    
    const year = new Date().getFullYear();
    const count = await prisma.quote.count({
      where: { quoteNumber: { startsWith: `QTE-${year}-` } }
    });
    const quoteNumber = `QTE-${year}-${String(count + 1).padStart(5, '0')}`;

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        clientId: body.clientId,
        siteId: body.siteId || 'gen-site', // simplified fallback
        title: body.title,
        lineItems: body.lineItems,
        subtotal: body.subtotal,
        tax: body.tax,
        total: body.total,
        validUntil: body.validUntil,
        status: 'Draft',
      }
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Quotes API POST Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
