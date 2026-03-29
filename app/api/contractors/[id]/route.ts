import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const contractor = await prisma.contractor.findUnique({
      where: { id },
      include: {
        jobs: {
          include: { site: true, client: true },
          orderBy: { createdAt: 'desc' }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    if (!contractor) return new NextResponse('Contractor Not Found', { status: 404 });

    return NextResponse.json(contractor);
  } catch (error) {
    console.error('Contractor Detail GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
