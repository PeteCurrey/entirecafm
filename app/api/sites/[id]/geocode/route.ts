import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const site = await prisma.site.findUnique({ where: { id } });
    if (!site || !site.postcode) {
      return new NextResponse('Site or postcode missing', { status: 400 });
    }

    // Call postcodes.io
    const postcodeClean = site.postcode.replace(/\s+/g, '').toUpperCase();
    const geoRes = await fetch(`https://api.postcodes.io/postcodes/${postcodeClean}`);
    
    if (!geoRes.ok) {
      return new NextResponse('Failed to geocode postcode via external API', { status: 400 });
    }

    const { result } = await geoRes.json();
    
    const updated = await prisma.site.update({
      where: { id },
      data: {
        lat: result.latitude,
        lng: result.longitude
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Sites Geocode Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
