import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ONE-TIME SETUP ENDPOINT — Creates admin user in Supabase Auth + DB
// DELETE THIS FILE AFTER FIRST USE

export async function POST(req: Request) {
  const safetyKey = req.headers.get('x-setup-key');
  if (safetyKey !== 'CAFM-SETUP-2024') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { email, password, name } = await req.json();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ step: 'auth', error: authError.message }, { status: 400 });
    }

    const supabaseId = authData.user.id;

    // 2. Import prisma lazily to avoid issues
    const prisma = (await import('@/lib/prisma')).default;

    // 3. Create User record in DB
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        supabaseId,
        email,
        name: name || 'Admin',
        role: 'ADMIN',
        skills: [],
        isActive: true,
      },
      update: {
        supabaseId,
        role: 'ADMIN',
      }
    });

    return NextResponse.json({
      success: true,
      message: `Admin user created. Email: ${email}`,
      userId: user.id,
      supabaseId,
    });
  } catch (error: any) {
    return NextResponse.json({ step: 'db', error: error.message }, { status: 500 });
  }
}
