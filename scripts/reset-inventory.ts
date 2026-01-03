
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('🗑️  Clearing all inventory data...')

  // Delete all variants
  // Note: We use .neq('id', '0') as a hack to match "all rows" because Supabase requires a filter for delete
  const { error: variantsError, count: variantsCount } = await supabase
    .from('product_variants')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (variantsError) {
    console.error('Error deleting variants:', variantsError)
  } else {
    console.log(`✅ Cleared ${variantsCount} variants`)
  }

  // Delete all products
  const { error: productsError, count: productsCount } = await supabase
    .from('products')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (productsError) {
    console.error('Error deleting products:', productsError)
  } else {
    console.log(`✅ Cleared ${productsCount} products`)
  }
}

main().catch(console.error)
