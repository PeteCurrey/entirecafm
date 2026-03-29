import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) return new NextResponse('Document Not Found', { status: 404 });

    // Remove from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('cafm-documents')
      .remove([document.url]);

    if (storageError) {
      console.error('Storage Deletion failed:', storageError);
      // We might want to still delete the DB record if the file was already missing
    }

    // Delete DB Record
    await prisma.document.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Document DELETE Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
