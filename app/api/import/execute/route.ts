import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { type, rows } = await req.json();
    let imported = 0;
    const errors: string[] = [];

    for (const { values: r } of rows) {
      try {
        if (type === 'clients') {
          await prisma.client.upsert({
            where: { email: r.email },
            create: { name: r.name, email: r.email, contactName: r.contactName, phone: r.phone, address: r.address },
            update: { name: r.name, contactName: r.contactName, phone: r.phone, address: r.address }
          });
        } else if (type === 'sites') {
          const client = await prisma.client.findFirst({ where: { email: r.clientEmail } });
          if (!client) { errors.push(`Client not found: ${r.clientEmail}`); continue; }
          await prisma.site.create({
            data: { name: r.name, address: r.address, postcode: r.postcode, siteType: r.siteType, sqFootage: r.sqFootage ? parseFloat(r.sqFootage) : null, floors: r.floors ? parseInt(r.floors) : null, clientId: client.id }
          });
        } else if (type === 'engineers') {
          await prisma.user.upsert({
            where: { email: r.email },
            create: { 
              name: r.name, 
              email: r.email, 
              supabaseId: `IMPORTED-${r.email}`,
              phone: r.phone, 
              role: (r.role || 'ENGINEER') as any, 
              skills: r['skills(comma-separated)']?.split(',').map((s: string) => s.trim()).filter(Boolean) || [] 
            },
            update: { name: r.name, phone: r.phone }
          });
        } else if (type === 'assets') {
          const site = await prisma.site.findFirst({ where: { postcode: r.sitePostcode } });
          if (!site) { errors.push(`Site not found: ${r.sitePostcode}`); continue; }
          await prisma.asset.create({
            data: { name: r.name, category: r.category, make: r.make, model: r.model, serialNumber: r.serialNumber, location: r.location, siteId: site.id, isStatutory: r['statutory(yes/no)']?.toLowerCase() === 'yes' }
          });
        } else if (type === 'jobs') {
          const client = await prisma.client.findFirst({ where: { email: r.clientEmail } });
          const site = await prisma.site.findFirst({ where: { postcode: r.sitePostcode } });
          if (!client || !site) { errors.push(`Client or site not found for row`); continue; }
          const year = new Date().getFullYear();
          const count = await prisma.job.count({ where: { jobNumber: { startsWith: `EFM-${year}-` } } });
          const jobNumber = `EFM-${year}-${String(count + 1).padStart(5, '0')}`;
          const priority = r['priority(LOW/MEDIUM/HIGH/CRITICAL)'] || r.priority || 'MEDIUM';
          const status = r.status || 'NEW';
          await prisma.job.create({
            data: { jobNumber, title: r.title, description: r.description, priority: priority as any, type: r.type || 'REACTIVE', status: status as any, clientId: client.id, siteId: site.id }
          });
        } else if (type === 'ppmtasks') {
          const site = await prisma.site.findFirst({ where: { postcode: r.sitePostcode } });
          if (!site) { errors.push(`Site not found: ${r.sitePostcode}`); continue; }
          const plans = await prisma.pPMPlan.findMany({ where: { siteId: site.id }, take: 1 });
          const planId = plans[0]?.id;
          if (!planId) { errors.push(`No PPM plan for site: ${r.sitePostcode}`); continue; }
          await prisma.pPMTask.create({
            data: { 
              title: r.title, 
              frequency: r.frequency, 
              standard: r.standard, 
              isStatutory: r['statutory(yes/no)']?.toLowerCase() === 'yes', 
              status: 'Scheduled', 
              planId,
              monthsDue: [] // Default to empty array for imported tasks
            }
          });
        }
        imported++;
      } catch (e: any) {
        errors.push(`Row error: ${e.message || 'unknown'}`);
      }
    }

    return NextResponse.json({ imported, skipped: errors.length, errors });
  } catch (error) {
    console.error('Import Execute Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
