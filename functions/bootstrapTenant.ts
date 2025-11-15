import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can bootstrap new tenants
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, logo, primary_color, accent_color, admin_email } = body;

    if (!name || !slug) {
      return Response.json({ error: 'name and slug are required' }, { status: 400 });
    }

    // Create organization
    const org = await base44.asServiceRole.entities.Organisation.create({
      name,
      slug,
      status: 'active',
      settings: {
        primary_color: primary_color || '#0B0B0D',
        accent_color: accent_color || '#E41E65',
        logo_url: logo || null
      }
    });

    console.log(`✅ Created organization: ${org.name} (${org.id})`);

    // Create client portal theme for the org's primary client (if needed)
    if (logo || primary_color || accent_color) {
      // Create a default client for this org
      const defaultClient = await base44.asServiceRole.entities.Client.create({
        org_id: org.id,
        name: `${name} - Main`,
        status: 'active',
        primary_contact_email: admin_email || user.email
      });

      await base44.asServiceRole.entities.ClientPortalTheme.create({
        org_id: org.id,
        client_id: defaultClient.id,
        logo_url: logo || null,
        primary_color: primary_color || '#0B0B0D',
        accent_color: accent_color || '#E41E65',
        welcome_text: `Welcome to ${name}`
      });

      console.log(`✅ Created portal theme for ${defaultClient.name}`);
    }

    // Create admin user for this tenant (if email provided)
    if (admin_email && admin_email !== user.email) {
      // Note: User creation typically happens via invitation
      // This is just metadata for tracking
      await base44.asServiceRole.entities.AuditLog.create({
        org_id: org.id,
        user_id: user.id,
        action: 'CREATE',
        entity_type: 'Organisation',
        entity_id: org.id,
        new_values: {
          admin_email,
          bootstrap_by: user.email
        }
      });
    }

    // Return tenant info
    return Response.json({
      success: true,
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        domain: `https://${slug}.entirecafm.app`,
        status: org.status
      },
      message: `Tenant ${name} bootstrapped successfully`
    });

  } catch (error) {
    console.error('bootstrapTenant error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});