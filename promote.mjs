import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load .env.local manually
dotenv.config({ path: '.env.local' })

async function promote() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Find user by email
  const { data: users, error: userError } = await supabase.auth.admin.listUsers()
  
  if (userError) {
    console.error('Error fetching users:', userError)
    process.exit(1)
  }

  const user = users.users.find(u => u.email === 'maxcofie@gmail.com')
  
  if (!user) {
    console.error('User maxcofie@gmail.com not found in auth.users')
    process.exit(1)
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id)

  if (updateError) {
    console.error('Failed to update profile role:', updateError)
  } else {
    console.log(`Successfully promoted maxcofie@gmail.com (ID: ${user.id}) to admin!`)
  }
}

promote().catch(console.error)
