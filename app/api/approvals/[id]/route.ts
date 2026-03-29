import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const { status, notes } = body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
       return new NextResponse('Invalid Status Transition', { status: 400 });
    }

    const approval = await prisma.$transaction(async (tx) => {
       const updated = await tx.approval.update({
          where: { id },
          data: { status }
       });

       await tx.approvalActivity.create({
          data: {
             approvalId: id,
             userId: session.user.id,
             action: status,
             notes
          }
       });

       return updated;
    });

    return NextResponse.json(approval);
  } catch (error) {
    console.error('Approvals PATCH Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
