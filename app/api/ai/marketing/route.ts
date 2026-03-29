import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // new clients per month last 12
    const clients = await prisma.client.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      include: {
        sites: { select: { id: true } },
        jobs: { select: { id: true, type: true, status: true, createdAt: true } }
      }
    });

    const monthlyNew = Array(12).fill(0).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const count = clients.filter(c => {
        const cd = new Date(c.createdAt);
        return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
      }).length;
      return { month: d.toLocaleString('default', { month: 'short', year: '2-digit' }), newClients: count };
    });

    const clientSummaries = clients.map(c => ({
      name: c.name,
      sites: c.sites.length,
      totalJobs: c.jobs.length,
      jobTypes: [...new Set(c.jobs.map(j => j.type))],
      completedJobs: c.jobs.filter(j => j.status === 'COMPLETED').length
    }));

    const dataStr = `New clients last 12 months (monthly): ${JSON.stringify(monthlyNew)} | Client profiles: ${clientSummaries.map(c => `${c.name}: ${c.totalJobs} jobs, ${c.sites} sites, services: ${c.jobTypes.join(',')||'none'}`).join(' | ')}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      system: 'You are a marketing AI for a facilities management company. Analyse growth data and return ONLY valid JSON (no markdown): {"growthSummary":"2 sentences","topGrowthClients":[{"client":"","insight":""}],"upsellOpportunities":[{"client":"","service":"","rationale":""}],"retentionRisks":[{"client":"","risk":""}],"contentSuggestions":[{"type":"blog|case study|email","topic":"","rationale":""}]}',
      messages: [{ role: 'user', content: dataStr }]
    });

    const text = message.content.find(b => b.type === 'text');
    if (!text || text.type !== 'text') throw new Error('No text');
    const parsed = JSON.parse(text.text.replace(/```json\n?|```\n?/g, '').trim());

    return NextResponse.json({ analysis: parsed, monthlyNew, clientSummaries });
  } catch (error) {
    console.error('AI Marketing Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
