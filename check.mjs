import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function check() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.from('profiles').select('*').eq('id', '338c1c0f-175f-4210-986c-7bdcac08069e')
  console.log('Profile:', data, 'Error:', error)
}
check()
