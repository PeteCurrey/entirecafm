import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        site: {
          include: { client: true }
        },
        ppmTasks: {
          orderBy: { nextDue: 'asc' }
        }
      }
    });

    if (!asset) return new NextResponse('Not Found', { status: 404 });
    return NextResponse.json(asset);
  } catch (error) {
    console.error('Asset Detail GET Error:', error);
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
    const asset = await prisma.asset.update({
      where: { id },
      data: body
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Asset Detail PATCH Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    await prisma.asset.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Asset Detail DELETE Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
