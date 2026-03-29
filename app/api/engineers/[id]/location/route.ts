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
    const { lat, lng } = body;

    if (lat === undefined || lng === undefined) {
       return new NextResponse('Missing lat/lng', { status: 400 });
    }

    // Upsert EngineerLocation
    const location = await prisma.engineerLocation.upsert({
       where: { userId: id },
       update: {
         lat,
         lng,
         updatedAt: new Date()
       },
       create: {
         userId: id,
         lat,
         lng
       }
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error('Engineer Location PATCH Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
