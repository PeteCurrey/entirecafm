import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sfg20Mapping } from '@/lib/sfg20Mapping';
import { addMonths, startOfYear } from 'date-fns';
import prisma from '@/lib/prisma';



export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { siteId, year } = await req.json();
    if (!siteId || !year) return new NextResponse('Missing required fields', { status: 400 });

    const assets = await prisma.asset.findMany({ where: { siteId } });
    if (assets.length === 0) return new NextResponse('No assets found for this site', { status: 404 });

    // Ensure a plan exists for the year
    let plan = await prisma.pPMPlan.findFirst({
      where: { siteId, year: parseInt(year) }
    });

    if (!plan) {
      plan = await prisma.pPMPlan.create({
        data: {
          siteId,
          year: parseInt(year),
          name: `PPM Schedule ${year}`,
          isActive: true
        }
      });
    }

    const tasksToCreate = [];

    // Helper to calculate exact due dates based on frequency
    const getDueDates = (freq: string, startMonthOffset: number = 0) => {
      const dates = [];
      const baseDate = new Date(parseInt(year), startMonthOffset, 1);
      
      switch (freq) {
        case 'Monthly':
          for (let i = 0; i < 12; i++) dates.push(addMonths(baseDate, i));
          break;
        case 'Quarterly':
          for (let i = 0; i < 4; i++) dates.push(addMonths(baseDate, i * 3));
          break;
        case '6-Monthly':
          for (let i = 0; i < 2; i++) dates.push(addMonths(baseDate, i * 6));
          break;
        case 'Annual':
          dates.push(baseDate);
          break;
        case '2-Yearly':
          dates.push(baseDate);
          break;
      }
      return dates.filter(d => d.getFullYear() === parseInt(year));
    };

    for (const asset of assets) {
      if (!sfg20Mapping[asset.category]) continue;

      for (const rule of sfg20Mapping[asset.category]) {
        const dueDates = getDueDates(rule.freq, 0);

        for (const dueDate of dueDates) {
          tasksToCreate.push({
            planId: plan.id,
            assetId: asset.id,
            title: rule.title,
            frequency: rule.freq,
            standard: rule.standard,
            isStatutory: rule.statutory,
            nextDue: dueDate,
            monthsDue: [dueDate.getMonth() + 1],
            status: 'Scheduled'
          });
        }
      }
    }

    // Bulk create
    if (tasksToCreate.length > 0) {
      await prisma.pPMTask.createMany({
        data: tasksToCreate
      });
    }

    return NextResponse.json({ message: 'Success', created: tasksToCreate.length });
  } catch (error) {
    console.error('PPM Generate API Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
