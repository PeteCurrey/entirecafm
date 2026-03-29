import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const data = await prisma.eSGData.findMany({
       orderBy: { monthYear: 'asc' }
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('ESG GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();

    const record = await prisma.eSGData.create({
      data: {
         monthYear: body.monthYear,
         carbonFootprint: parseFloat(body.carbonFootprint) || 0,
         electricityKwh: parseFloat(body.electricityKwh) || 0,
         gasKwh: parseFloat(body.gasKwh) || 0,
         waterM3: parseFloat(body.waterM3) || 0,
         wasteGenerated: parseFloat(body.wasteGenerated) || 0,
         wasteRecycled: parseFloat(body.wasteRecycled) || 0,
         vehicleMiles: parseFloat(body.vehicleMiles) || 0,
         recordedBy: session.user.id
      }
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('ESG POST Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
