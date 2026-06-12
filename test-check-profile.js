const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: users, error: authError } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.phone === '233276251608');
  console.log('User ID from auth.users:', user ? user.id : 'Not found');
  
  if (user) {
    const { data: profile, error } = await supabase.schema('graydocket').from('profiles').select('*').eq('id', user.id).maybeSingle();
    console.log('Profile:', profile, error ? error.message : '');
  }
}
test();
