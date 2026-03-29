import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Prisma, AssetStatus } from '@prisma/client';
import prisma from '@/lib/prisma';



export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const siteId = searchParams.get('siteId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const statutory = searchParams.get('statutory') === 'true';

    const where: Prisma.AssetWhereInput = {
      AND: [
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { serialNumber: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
          ]
        } : {},
        siteId ? { siteId } : {},
        category ? { category } : {},
        status ? { status: status as AssetStatus } : {},
        statutory ? { isStatutory: true } : {},
      ]
    };

    const assets = await prisma.asset.findMany({
      where,
      include: {
        site: {
          include: { client: { select: { name: true } } }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Assets API Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const asset = await prisma.asset.create({
      data: {
        ...body,
      }
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Assets API POST Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
