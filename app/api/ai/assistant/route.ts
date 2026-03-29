import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Tool execution ───────────────────────────────────────────────────────────
async function executeTool(name: string, input: Record<string, any>) {
  switch (name) {
    case 'search_jobs': {
      const where: any = {};
      if (input.status) where.status = input.status;
      if (input.clientName) where.client = { name: { contains: input.clientName, mode: 'insensitive' } };
      if (input.query) where.OR = [
        { title: { contains: input.query, mode: 'insensitive' } },
        { description: { contains: input.query, mode: 'insensitive' } },
        { jobNumber: { contains: input.query, mode: 'insensitive' } },
      ];
      const jobs = await prisma.job.findMany({ where, include: { client: true, site: true, engineer: true }, take: input.limit || 10, orderBy: { createdAt: 'desc' } });
      return jobs.map((j: any) => ({ id: j.id, jobNumber: j.jobNumber, title: j.title, status: j.status, priority: j.priority, client: j.client?.name, site: j.site?.name, engineer: j.engineer?.name }));
    }
    case 'get_client_summary': {
      const client = await prisma.client.findFirst({
        where: { name: { contains: input.name, mode: 'insensitive' } },
        include: {
          jobs: { where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'INVOICED'] } }, take: 5, orderBy: { createdAt: 'desc' } },
          invoices: { where: { status: { in: ['SENT', 'OVERDUE'] } }, select: { total: true, status: true, invoiceNumber: true } },
          sites: { select: { name: true } }
        }
      });
      if (!client) return { error: `No client found matching "${input.name}"` };
      return { name: client.name, email: client.email, sites: client.sites.map((s: any) => s.name), openJobs: client.jobs.length, outstandingInvoices: client.invoices.reduce((s: number, i: any) => s + i.total, 0), invoiceCount: client.invoices.length };
    }
    case 'get_compliance_summary': {
      const sites = await prisma.site.findMany({
        where: input.siteName ? { name: { contains: input.siteName, mode: 'insensitive' } } : undefined,
        include: { ppmPlans: { include: { tasks: true } } }
      });
      const now = new Date();
      return sites.map((s: any) => {
        const tasks = s.ppmPlans.flatMap((p: any) => p.tasks);
        const done = tasks.filter((t: any) => t.status === 'COMPLETED').length;
        const overdue = tasks.filter((t: any) => t.nextDue && new Date(t.nextDue) < now && t.status !== 'COMPLETED').length;
        return { site: s.name, total: tasks.length, completed: done, compliance: tasks.length ? Math.round((done / tasks.length) * 100) : 100, overdue };
      });
    }
    case 'get_engineer_workload': {
      const engineer = await (prisma.user as any).findFirst({
        where: { name: { contains: input.name, mode: 'insensitive' }, role: 'ENGINEER' },
        include: { jobs: { include: { site: true, client: true }, orderBy: { scheduledDate: 'asc' }, take: 10 } }
      });
      if (!engineer) return { error: `No engineer found matching "${input.name}"` };
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
      const todaysJobs = engineer.jobs.filter((j: any) => j.scheduledDate && new Date(j.scheduledDate) >= today && new Date(j.scheduledDate) < tomorrow);
      return { name: engineer.name, role: engineer.role, totalOpen: engineer.jobs.length, todaysJobs: todaysJobs.map((j: any) => ({ title: j.title, site: j.site?.name, status: j.status })) };
    }
    case 'get_kpi_summary': {
      const now = new Date();
      const som = new Date(now.getFullYear(), now.getMonth(), 1);
      const [open, overdue, paid, outstanding] = await Promise.all([
        prisma.job.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'INVOICED'] } } }),
        prisma.job.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'INVOICED'] }, slaDeadline: { lt: now } } }),
        prisma.invoice.findMany({ where: { status: 'PAID', paidAt: { gte: som } }, select: { total: true } }),
        prisma.invoice.findMany({ where: { status: { in: ['SENT', 'OVERDUE'] } }, select: { total: true } }),
      ]);
      return { openJobs: open, overdueJobs: overdue, revenueThisMonth: paid.reduce((s: number, i: any) => s + i.total, 0), outstandingBalance: outstanding.reduce((s: number, i: any) => s + i.total, 0) };
    }
    case 'find_overdue_items': {
      const now = new Date();
      const result: any = {};
      if (!input.type || input.type === 'jobs' || input.type === 'both') {
        result.overdueJobs = await prisma.job.findMany({ where: { slaDeadline: { lt: now }, status: { notIn: ['COMPLETED', 'CANCELLED'] } }, include: { client: true, site: true }, take: 10 });
      }
      if (!input.type || input.type === 'ppm' || input.type === 'both') {
        const sites = await prisma.site.findMany({ include: { ppmPlans: { include: { tasks: true } } } });
        result.overduePPM = sites.flatMap((s: any) => s.ppmPlans.flatMap((p: any) => p.tasks.filter((t: any) => t.nextDue && new Date(t.nextDue) < now && t.status !== 'COMPLETED').map((t: any) => ({ task: t.title, site: s.name, daysOverdue: Math.floor((now.getTime() - new Date(t.nextDue!).getTime()) / 86400000) }))));
      }
      return result;
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { messages } = await req.json();

    const tools: Anthropic.Tool[] = [
      { name: 'search_jobs', description: 'Search jobs by keyword, status, or client name', input_schema: { type: 'object' as const, properties: { query: { type: 'string' }, status: { type: 'string' }, clientName: { type: 'string' }, limit: { type: 'number' } } } },
      { name: 'get_client_summary', description: 'Get client profile and open jobs/invoices', input_schema: { type: 'object' as const, required: ['name'], properties: { name: { type: 'string' } } } },
      { name: 'get_compliance_summary', description: 'Get PPM compliance scores for a site or all sites', input_schema: { type: 'object' as const, properties: { siteName: { type: 'string' } } } },
      { name: 'get_engineer_workload', description: "Get engineer's current jobs and today's schedule", input_schema: { type: 'object' as const, required: ['name'], properties: { name: { type: 'string' } } } },
      { name: 'get_kpi_summary', description: 'Get current dashboard KPIs (open jobs, revenue, overdue)', input_schema: { type: 'object' as const, properties: {} } },
      { name: 'find_overdue_items', description: 'Get all overdue jobs or PPM tasks', input_schema: { type: 'object' as const, properties: { type: { type: 'string', enum: ['jobs', 'ppm', 'both'] } } } },
    ];

    let currentMessages = [...messages];
    let finalText = '';
    let iterations = 0;

    while (iterations < 5) {
      iterations++;
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: `You are the EntireCAFM AI assistant. You have access to live operational data through tool calls.
When a user asks about jobs, clients, compliance, engineers, or performance — use the appropriate tool to fetch real data before answering.
Be specific. Reference actual data. Never guess or estimate when you can look it up. Keep answers concise and actionable.`,
        tools,
        messages: currentMessages,
      });

      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
        currentMessages.push({ role: 'assistant', content: response.content });
        const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
          toolUseBlocks.map(async (tb) => ({
            type: 'tool_result' as const,
            tool_use_id: tb.id,
            content: JSON.stringify(await executeTool(tb.name, tb.input as Record<string, any>)),
          }))
        );
        currentMessages.push({ role: 'user', content: toolResults });
      } else {
        const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
        finalText = textBlock?.text || 'I could not generate a response.';
        break;
      }
    }

    return NextResponse.json({ reply: finalText });
  } catch (error) {
    console.error('AI Assistant Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
