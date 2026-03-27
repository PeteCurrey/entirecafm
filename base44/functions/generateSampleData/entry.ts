import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { requirePermission } from './rbacCheck.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    requirePermission(user, 'generateSampleData');
    
    const org_id = user.org_id || 'default-org';
    
    console.log(`🎲 Generating sample data for org: ${org_id}`);
    
    // Check if data already exists
    const existingJobs = await base44.asServiceRole.entities.Job.filter({ org_id });
    if (existingJobs.length > 0) {
      return Response.json({ 
        error: 'Data already exists. Clear existing data first.',
        existing_jobs: existingJobs.length
      }, { status: 400 });
    }
    
    const now = new Date();
    
    // Create sample clients
    const clients = await Promise.all([
      base44.asServiceRole.entities.Client.create({
        org_id,
        name: 'Acme Corporation',
        contact_name: 'John Smith',
        contact_email: 'john@acme.com',
        contact_phone: '020 1234 5678',
        billing_address: '123 Business Park, London'
      }),
      base44.asServiceRole.entities.Client.create({
        org_id,
        name: 'TechStart Ltd',
        contact_name: 'Sarah Johnson',
        contact_email: 'sarah@techstart.com',
        contact_phone: '020 8765 4321',
        billing_address: '456 Innovation Way, Manchester'
      })
    ]);
    
    // Create sample sites
    const sites = await Promise.all([
      base44.asServiceRole.entities.Site.create({
        org_id,
        client_id: clients[0].id,
        name: 'Acme HQ',
        address: '123 Business Park',
        city: 'London',
        postcode: 'SW1A 1AA',
        contact_name: 'John Smith',
        contact_phone: '020 1234 5678'
      }),
      base44.asServiceRole.entities.Site.create({
        org_id,
        client_id: clients[1].id,
        name: 'TechStart Office',
        address: '456 Innovation Way',
        city: 'Manchester',
        postcode: 'M1 1AA',
        contact_name: 'Sarah Johnson',
        contact_phone: '020 8765 4321'
      })
    ]);
    
    // Create sample assets
    const assets = await Promise.all([
      base44.asServiceRole.entities.Asset.create({
        org_id,
        site_id: sites[0].id,
        name: 'HVAC-01',
        asset_type: 'hvac',
        manufacturer: 'Carrier',
        model: 'X5000',
        installation_date: '2020-01-15'
      }),
      base44.asServiceRole.entities.Asset.create({
        org_id,
        site_id: sites[1].id,
        name: 'LIFT-01',
        asset_type: 'lift',
        manufacturer: 'Otis',
        model: 'Gen2',
        installation_date: '2019-06-20'
      })
    ]);
    
    // Create sample jobs with varying statuses and SLA dates
    const jobs = [];
    
    // Critical SLA breach job
    jobs.push(await base44.asServiceRole.entities.Job.create({
      org_id,
      title: 'URGENT: HVAC System Failure',
      description: 'Complete air conditioning failure in main office area',
      job_type: 'reactive',
      priority: 'critical',
      status: 'assigned',
      client_id: clients[0].id,
      site_id: sites[0].id,
      asset_id: assets[0].id,
      sla_due_date: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      scheduled_date: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString()
    }));
    
    // High priority at-risk job
    jobs.push(await base44.asServiceRole.entities.Job.create({
      org_id,
      title: 'Lift Not Operating',
      description: 'Lift stopped between floors, urgent attention required',
      job_type: 'reactive',
      priority: 'high',
      status: 'en_route',
      client_id: clients[1].id,
      site_id: sites[1].id,
      asset_id: assets[1].id,
      sla_due_date: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      scheduled_date: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString()
    }));
    
    // Medium priority scheduled job
    jobs.push(await base44.asServiceRole.entities.Job.create({
      org_id,
      title: 'Quarterly HVAC Maintenance',
      description: 'Routine PPM service',
      job_type: 'ppm',
      priority: 'medium',
      status: 'assigned',
      client_id: clients[0].id,
      site_id: sites[0].id,
      asset_id: assets[0].id,
      scheduled_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      sla_due_date: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
    }));
    
    // Completed jobs
    for (let i = 0; i < 5; i++) {
      jobs.push(await base44.asServiceRole.entities.Job.create({
        org_id,
        title: `Completed Service ${i + 1}`,
        description: 'Routine maintenance completed successfully',
        job_type: 'ppm',
        priority: 'medium',
        status: 'completed',
        client_id: clients[i % 2].id,
        site_id: sites[i % 2].id,
        scheduled_date: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
        completed_date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString()
      }));
    }
    
    // Create sample quotes
    const quotes = await Promise.all([
      base44.asServiceRole.entities.Quote.create({
        org_id,
        client_id: clients[0].id,
        site_id: sites[0].id,
        title: 'Annual HVAC Contract',
        status: 'client_approved',
        total: 12500,
        sent_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }),
      base44.asServiceRole.entities.Quote.create({
        org_id,
        client_id: clients[1].id,
        site_id: sites[1].id,
        title: 'Emergency Repair Work',
        status: 'sent',
        total: 3500,
        sent_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
      })
    ]);
    
    // Create sample invoices
    const invoices = await Promise.all([
      base44.asServiceRole.entities.Invoice.create({
        org_id,
        client_id: clients[0].id,
        invoice_number: 'INV-001',
        total: 2500,
        status: 'sent',
        due_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // Overdue
        issue_date: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString()
      }),
      base44.asServiceRole.entities.Invoice.create({
        org_id,
        client_id: clients[1].id,
        invoice_number: 'INV-002',
        total: 1800,
        status: 'sent',
        due_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        issue_date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString()
      })
    ]);
    
    console.log(`✅ Sample data generated successfully`);
    
    return Response.json({
      success: true,
      created: {
        clients: clients.length,
        sites: sites.length,
        assets: assets.length,
        jobs: jobs.length,
        quotes: quotes.length,
        invoices: invoices.length
      }
    });
    
  } catch (error) {
    console.error('Sample data generation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});