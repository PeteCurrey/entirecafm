import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const clientId = formData.get('clientId') as string || 'default-client';
    const siteId = formData.get('siteId') as string || 'default-site';
    const folder = formData.get('folder') as string || 'Other';
    const expiryDate = formData.get('expiryDate') as string;

    if (!file) return new NextResponse('No file provided', { status: 400 });

    // File buffer array processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Path structure: clientId/siteId/filename
    const filePath = `${clientId}/${siteId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

    // Upload to Supabase Storage 'cafm-documents'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('cafm-documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage Upload failed:', uploadError);
      return new NextResponse('Storage Upload failed', { status: 500 });
    }

    // Determine public or internal URL (In many CAFM cases this is signed, but we store internal path)
    const { data: { publicUrl } } = supabase.storage.from('cafm-documents').getPublicUrl(filePath);

    // Create Prisma Record
    const document = await prisma.document.create({
      data: {
        name: file.name,
        url: filePath, // Storing raw path so we can generate signed URLs later if needed
        type: file.type,
        size: file.size,
        folder: folder,
        clientId: clientId !== 'default-client' ? clientId : undefined,
        siteId: siteId !== 'default-site' ? siteId : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        uploadedBy: session.user.id
      }
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Document Upload Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
