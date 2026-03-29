import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const contractors = await prisma.contractor.findMany({
      include: {
        _count: {
          select: { jobs: { where: { status: { notIn: ['COMPLETED', 'INVOICED', 'CANCELLED'] } } } }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(contractors);
  } catch (error) {
    console.error('Contractors GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const contractor = await prisma.contractor.create({
       data: {
          name: body.name,
          contact: body.contact,
          email: body.email,
          phone: body.phone,
          trades: body.trades || []
       }
    });

    return NextResponse.json(contractor, { status: 201 });
  } catch (error) {
    console.error('Contractors POST Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
