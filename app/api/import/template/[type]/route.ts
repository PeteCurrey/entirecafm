import { NextResponse } from 'next/server';

const TEMPLATES: Record<string, { headers: string[]; example: string[] }> = {
  clients: {
    headers: ['name*', 'contactName*', 'email*', 'phone', 'address'],
    example: ['Acme Properties Ltd', 'John Smith', 'john@acme.com', '07700900000', '1 Business Park, London']
  },
  sites: {
    headers: ['clientEmail*', 'name*', 'address*', 'postcode*', 'siteType', 'sqFootage', 'floors'],
    example: ['john@acme.com', 'Acme HQ', '1 Business Park', 'EC1A 1BB', 'COMMERCIAL', '5000', '3']
  },
  assets: {
    headers: ['sitePostcode*', 'name*', 'category*', 'make', 'model', 'serialNumber', 'location', 'installDate(DD/MM/YYYY)', 'warrantyExpiry(DD/MM/YYYY)', 'criticality', 'statutory(yes/no)'],
    example: ['EC1A 1BB', 'Boiler Unit A', 'HVAC', 'Ideal Heating', 'Excellence 30', 'SN12345', 'Plant Room', '01/01/2020', '01/01/2025', 'HIGH', 'yes']
  },
  jobs: {
    headers: ['clientEmail*', 'sitePostcode*', 'title*', 'description', 'priority(LOW/MEDIUM/HIGH/CRITICAL)*', 'type*', 'status*', 'engineerEmail', 'slaDeadline(DD/MM/YYYY HH:MM)', 'scheduledDate(DD/MM/YYYY HH:MM)', 'notes'],
    example: ['john@acme.com', 'EC1A 1BB', 'Annual Fire Inspection', 'Statutory annual check', 'HIGH', 'PPM', 'OPEN', 'engineer@company.com', '30/04/2025 17:00', '01/04/2025 09:00', 'Access via reception']
  },
  engineers: {
    headers: ['name*', 'email*', 'phone', 'skills(comma-separated)', 'role'],
    example: ['Jane Doe', 'jane@company.com', '07700900001', 'Electrical,HVAC,Plumbing', 'ENGINEER']
  },
  ppmtasks: {
    headers: ['sitePostcode*', 'assetName', 'title*', 'frequency*', 'standard', 'statutory(yes/no)*', 'startMonth(1-12)'],
    example: ['EC1A 1BB', 'Boiler Unit A', 'Annual Boiler Service', 'ANNUAL', 'SFG20 4-1', 'yes', '1']
  }
};

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type: rawType } = await params;
  const type = rawType.toLowerCase();
  const template = TEMPLATES[type];
  if (!template) return new NextResponse('Unknown import type', { status: 400 });

  const csv = [template.headers.join(','), template.example.join(',')].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${type}_import_template.csv"`,
    }
  });
}
