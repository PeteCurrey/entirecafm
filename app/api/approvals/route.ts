import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const approvals = await prisma.approval.findMany({
      include: {
        activities: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(approvals);
  } catch (error) {
    console.error('Approvals GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();

    const approval = await prisma.approval.create({
      data: {
        type: body.type,
        description: body.description,
        value: body.value,
        requestedBy: session.user.id
      }
    });

    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    console.error('Approvals POST Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
