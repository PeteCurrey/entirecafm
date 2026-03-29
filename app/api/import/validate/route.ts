import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';


function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/\*/g, ''));
  const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim()));
  return { headers, rows };
}

function validateRow(type: string, headers: string[], values: string[]): { valid: boolean; errors: string[] } {
  const row: Record<string, string> = {};
  headers.forEach((h, i) => { row[h] = values[i] || ''; });
  const errors: string[] = [];

  if (type === 'clients') {
    if (!row.name) errors.push('name is required');
    if (!row.email) errors.push('email is required');
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('email format invalid');
  } else if (type === 'sites') {
    if (!row.clientEmail) errors.push('clientEmail is required');
    if (!row.name) errors.push('name is required');
    if (!row.address) errors.push('address is required');
    if (!row.postcode) errors.push('postcode is required');
  } else if (type === 'assets') {
    if (!row.sitePostcode) errors.push('sitePostcode is required');
    if (!row.name) errors.push('name is required');
    if (!row.category) errors.push('category is required');
  } else if (type === 'jobs') {
    if (!row.clientEmail) errors.push('clientEmail is required');
    if (!row.sitePostcode) errors.push('sitePostcode is required');
    if (!row.title) errors.push('title is required');
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(row['priority(LOW/MEDIUM/HIGH/CRITICAL)'] || row.priority || '')) errors.push('priority must be LOW/MEDIUM/HIGH/CRITICAL');
  } else if (type === 'engineers') {
    if (!row.name) errors.push('name is required');
    if (!row.email) errors.push('email is required');
  } else if (type === 'ppmtasks') {
    if (!row.sitePostcode) errors.push('sitePostcode is required');
    if (!row.title) errors.push('title is required');
    if (!row['statutory(yes/no)']) errors.push('statutory is required');
  }

  return { valid: errors.length === 0, errors };
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { type, csvContent } = await req.json();
    const { headers, rows } = parseCSV(csvContent);

    const valid: any[] = [];
    const errors: any[] = [];
    const warnings: any[] = [];

    rows.forEach((values, idx) => {
      const rowNum = idx + 2;
      if (values.every(v => !v)) { warnings.push({ row: rowNum, values, warning: 'Empty row — will be skipped' }); return; }
      const validation = validateRow(type, headers, values);
      const rowObj: Record<string, string> = {};
      headers.forEach((h, i) => { rowObj[h] = values[i] || ''; });
      if (validation.valid) {
        valid.push({ row: rowNum, values: rowObj });
      } else {
        errors.push({ row: rowNum, values: rowObj, errors: validation.errors });
      }
    });

    return NextResponse.json({ valid, errors, warnings, totalRows: rows.length, canProceed: errors.length / rows.length < 0.5 });
  } catch (error) {
    console.error('Import Validate Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
