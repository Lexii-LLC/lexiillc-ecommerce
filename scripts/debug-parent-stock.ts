
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('🔍 Debugging Parent Stock & Variants...')

  // 1. Find a recent Parent product
  const { data: parents, error: parentError } = await supabase
    .from('products')
    .select('*')
    .eq('is_parent', true)
    .gt('stock_quantity', 0)
    .limit(5)

  if (parentError) {
    console.error('Error fetching parents:', parentError)
    return
  }

  if (!parents || parents.length === 0) {
    console.log('❌ No in-stock parents found! Checking for ANY parents...')
    const { data: anyParents } = await supabase
        .from('products')
        .select('*')
        .eq('is_parent', true)
        .limit(5)
    
    if (!anyParents || anyParents.length === 0) {
        console.log('❌ No parents found at all. Normalization might be failing.')
    } else {
        console.log('⚠️ Found parents, but they all have 0 stock. Example:', anyParents[0].clean_name, 'ID:', anyParents[0].id)
        await checkVariants(anyParents[0].id)
    }
    return
  }

  console.log(`✅ Found ${parents.length} in-stock parents.`)

  for (const parent of parents) {
    console.log(`\n------------------------------------------------`)
    console.log(`📦 Parent: ${parent.clean_name}`)
    console.log(`   ID: ${parent.id}`)
    console.log(`   Stock: ${parent.stock_quantity}`)
    console.log(`   Is Parent: ${parent.is_parent}`)
    
    await checkVariants(parent.id)
  }
}

async function checkVariants(parentId: string) {
    const { data: variants, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', parentId)

    if (error) {
        console.error('   Error fetching variants:', error)
        return
    }

    console.log(`   Variants found: ${variants?.length || 0}`)
    variants?.forEach(v => {
        console.log(`      - Size: ${v.size} | Stock: ${v.stock_quantity} | CloverID: ${v.clover_item_id} | ID: ${v.id}`)
    })
}

main().catch(console.error)
