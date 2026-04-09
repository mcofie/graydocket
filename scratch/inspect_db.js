const { createClient } = require('@supabase/supabase-js')

async function inspectSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase
    .from('business_types')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching business_type:', error)
    return
  }

  console.log('Keys in business_types:', Object.keys(data))
  console.log('Sample data:', data)
}

inspectSchema()
