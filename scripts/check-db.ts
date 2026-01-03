
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCounts() {
  console.log('Checking product counts...')
  
  const { count: total } = await supabase.from('products').select('*', { count: 'exact', head: true })
  
  const { count: normalized } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_normalized', true)

  const { count: inStock } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .gt('stock_quantity', 0)

  const { count: normalizedAndInStock } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_normalized', true)
    .gt('stock_quantity', 0)

  console.log(`Total Products: ${total}`)
  console.log(`Normalized: ${normalized}`)
  console.log(`In Stock: ${inStock}`)
  console.log(`Normalized + In Stock (Visible on site): ${normalizedAndInStock}`)

  if (normalized && normalized > 0) {
      const { data: sample } = await supabase
        .from('products')
        .select('clean_name, product_type, is_normalized')
        .eq('is_normalized', true)
        .limit(3)
      console.log('Sample normalized:', sample)
  }
}

checkCounts().catch(console.error)
