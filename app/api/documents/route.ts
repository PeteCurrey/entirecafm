import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder');

    let whereClause: any = {};
    if (folder && folder !== 'All Documents' && folder !== 'Recent Uploads' && folder !== 'Expiring Soon') {
       whereClause.folder = folder;
    } else if (folder === 'Expiring Soon') {
       const thirtyDaysFromNow = new Date();
       thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
       whereClause.expiryDate = {
          lte: thirtyDaysFromNow
       };
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        client: { select: { name: true } },
        site: { select: { name: true } }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Documents GET Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
