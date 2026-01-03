
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { updateParentStock } from '../lib/supabase/products'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('🔄 Recalculating all Parent Stock...')

  const { data: parents, error } = await supabase
    .from('products')
    .select('id, clean_name')
    .eq('is_parent', true)

  if (error) {
    console.error('Error fetching parents:', error)
    return
  }

  console.log(`Found ${parents?.length || 0} parents. Updating...`)

  for (const parent of parents || []) {
    // console.log(`Updating ${parent.clean_name}...`)
    await updateParentStock(parent.id)
  }
  
  console.log('✅ Done.')
}

main().catch(console.error)
