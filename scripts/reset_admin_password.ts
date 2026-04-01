import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Service Role Key is missing.');
  process.exit(1);
}

// Bypass RLS using the service role key
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = 'pete@entirefm.com';
  const password = 'EntireCAFM@2024!';

  console.log(`Searching for Supabase Auth user: ${email}`);

  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to retrieve users:', listError.message);
    process.exit(1);
  }

  const existingAuthUser = usersData.users.find(u => u.email === email);

  if (existingAuthUser) {
    console.log(`User found (ID: ${existingAuthUser.id}). Forcing password reset...`);
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
      password: password,
      email_confirm: true,
      app_metadata: { role: 'ADMIN' }
    });

    if (updateError) {
      console.error('Failed to reset password:', updateError.message);
      process.exit(1);
    }
    console.log('Successfully resynced password for existing user.');
  } else {
    console.log('User not found in Supabase Auth. Creating new user...');
    
    // Create the Auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      app_metadata: { role: 'ADMIN' },
      user_metadata: { name: 'Peter Currey', role: 'ADMIN' }
    });

    if (createError) {
      console.error('Failed to create user:', createError.message);
      process.exit(1);
    }
    console.log(`Successfully created new user (ID: ${newUser.user.id}).`);
  }
  
  console.log(`========================================`);
  console.log(`✅ Login credentials successfully bound.`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`========================================`);
}

main();
