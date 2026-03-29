import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import QRCode from 'qrcode';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.entirecafm.com';
    const assetUrl = `${baseUrl}/assets/${id}`;

    const svg = await QRCode.toString(assetUrl, {
      type: 'svg',
      color: {
        dark: '#1E293B',   // Dark blue from CAFM brand
        light: '#FFFFFF'   // White background
      },
      margin: 1,
    });

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('QR Code API Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
