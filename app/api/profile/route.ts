import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function GET() {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: session.user.id },
      include: {
        _count: {
          select: { jobs: true }
        }
      }
    });

    if (!user) return new NextResponse('User not found', { status: 404 });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Profile API Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
