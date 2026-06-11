import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
  console.error('Error: Please update NEXT_PUBLIC_SUPABASE_URL in .env.local with your actual Supabase URL.')
  process.exit(1)
}

if (!supabaseServiceKey || supabaseServiceKey.includes('replace-with')) {
  console.error('Error: Please update SUPABASE_SERVICE_ROLE_KEY in .env.local with your actual service role key.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const adminEmail = process.argv[2] || 'admin@graydocket.com'
const adminPassword = process.argv[3] || 'admin123456'

async function createAdminUser() {
  console.log(`Creating user ${adminEmail}...`)
  
  // 1. Create the user in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: 'System Admin'
    }
  })

  if (authError) {
    if (authError.message.includes('already exists')) {
      console.log(`User ${adminEmail} already exists. We will just update their role.`)
      // Fetch the user to get their ID
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) {
        console.error('Failed to list users:', listError)
        return
      }
      const existingUser = usersData.users.find(u => u.email === adminEmail)
      if (existingUser) {
        await updateProfileRole(existingUser.id)
      }
      return
    }
    console.error('Failed to create user:', authError)
    return
  }

  console.log('User created successfully in auth.users.')
  
  // 2. The profile is created automatically by a trigger, so we just need to update it
  await updateProfileRole(authData.user.id)
}

async function updateProfileRole(userId) {
  console.log(`Updating profile role to 'admin' for user ID: ${userId}...`)
  
  // Wait a second to ensure the database trigger has finished creating the profile
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId)

  if (profileError) {
    console.error('Failed to update user profile role:', profileError)
  } else {
    console.log('\n✅ Admin user setup is complete!')
    console.log(`Email: ${adminEmail}`)
    console.log(`Password: ${adminPassword}`)
    console.log('\nYou can now log in at http://localhost:3000/auth/admin')
  }
}

createAdminUser()
