import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const clients = await prisma.client.findMany({
      include: {
        _count: {
          select: { 
            sites: true, 
            jobs: { where: { status: { notIn: ['COMPLETED', 'INVOICED', 'CANCELLED'] } } } 
          }
        },
        sites: {
          include: { 
            _count: { select: { assets: true } } 
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const enrichedClients = clients.map(client => {
      // Aggregate assets across all sites
      const totalAssets = client.sites.reduce((acc, site) => acc + site._count.assets, 0);
      return {
        ...client,
        totalAssets,
        sites: undefined // prevent heavy payload
      };
    });

    return NextResponse.json(enrichedClients);
  } catch (error) {
    console.error('Clients GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
