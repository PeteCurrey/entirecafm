import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET() {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch engineers with their latest location
    const locations = await prisma.engineerLocation.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    // Map to a cleaner structure for the Map component
    const engineers = locations.map((loc) => ({
      id: loc.userId,
      name: loc.user.name,
      lat: loc.lat,
      lng: loc.lng,
      status: 'active', // Can be expanded later based on their current active job status
      updatedAt: loc.updatedAt,
    }));

    return NextResponse.json({ engineers });
  } catch (error) {
    console.error('Engineer Locations API Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
