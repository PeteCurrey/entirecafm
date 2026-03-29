import { NextResponse } from 'next/server';
import { Priority } from '@prisma/client';
import prisma from '@/lib/prisma';



// In a real application, you might want a specialized token or domain allowlist 
// to prevent abuse of this public endpoint.
export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Construct rich description taking into account public form fields
    const richDescription = `
**Client Contact Info**
Name: ${data.name || 'N/A'}
Email: ${data.email || 'N/A'}
Phone: ${data.phone || 'N/A'}
Reference/PO: ${data.reference || 'None'}

**Issue Details**
${data.description}
    `.trim();

    // Map urgency to Prisma Enum (MEDIUM default)
    let priorityVal: Priority = 'MEDIUM';
    if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(data.urgency)) {
       priorityVal = data.urgency as Priority;
    }

    // Default system client fallback if "OTHER" is selected
    let targetSiteId = data.siteId;
    let targetClientId = '';

    if (targetSiteId === 'OTHER' || !targetSiteId) {
      // Find a generic fallback site if applicable, or just generic 
      const fallback = await prisma.site.findFirst();
      if (!fallback) return new NextResponse('System configuration error: No sites.', { status: 500 });
      targetSiteId = fallback.id;
      targetClientId = fallback.clientId;
    } else {
      const site = await prisma.site.findUnique({ where: { id: targetSiteId }});
      if (site) {
         targetClientId = site.clientId;
      } else {
         return new NextResponse('Site mapping failed.', { status: 400 });
      }
    }

    const requestRecord = await prisma.request.create({
      data: {
         clientId: targetClientId,
         siteId: targetSiteId,
         title: data.title || 'Untitled Request',
         description: richDescription,
         priority: priorityVal,
         status: 'Pending'
      }
    });

    return NextResponse.json(requestRecord, { status: 201 });
  } catch (error) {
    console.error('Public Request API Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
