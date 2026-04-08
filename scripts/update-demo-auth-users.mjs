import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.admin.local.example to .env.admin.local and fill in your values.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const demoUsers = [
  { email: 'alice@example.com', password: 'Alice@2026!' },
  { email: 'bob@example.com', password: 'Bob@2026!' },
  { email: 'carol@example.com', password: 'Carol@2026!' },
];

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const matchedUser = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (matchedUser) {
      return matchedUser;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function updateUserCredentials() {
  console.log('Updating demo auth users...\n');

  for (const demoUser of demoUsers) {
    const user = await findUserByEmail(demoUser.email);

    if (!user) {
      console.warn(`- Skipped ${demoUser.email}: user not found`);
      continue;
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: demoUser.password,
      email_confirm: true,
    });

    if (error) {
      throw new Error(`Failed to update ${demoUser.email}: ${error.message}`);
    }

    console.log(`- Updated ${demoUser.email} -> ${demoUser.password}`);
  }

  console.log('\nDone. Demo accounts now use the strong passwords defined in scripts/update-demo-auth-users.mjs');
}

updateUserCredentials().catch((error) => {
  console.error(error);
  process.exit(1);
});
