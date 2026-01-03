import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Real product images from StockX/GOAT CDNs and reliable sources
const productImages: Record<string, string> = {
  'MOCK_PARENT_JORDAN_4_RETRO': 'https://images.stockx.com/images/Air-Jordan-4-Retro-Bred-Reimagined-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&auto=format,compress&trim=color&q=90',
  'MOCK_PARENT_NIKE_DUNK_LOW': 'https://images.stockx.com/images/Nike-Dunk-Low-Retro-White-Black-2021-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&auto=format,compress&trim=color&q=90',
  'MOCK_PARENT_NEW_BALANCE_550': 'https://images.stockx.com/images/New-Balance-550-White-Green-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&auto=format,compress&trim=color&q=90',
  'MOCK_PARENT_ADIDAS_YEEZY_SLIDE': 'https://images.stockx.com/images/adidas-Yeezy-Slide-Onyx-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&auto=format,compress&trim=color&q=90',
  'MOCK_PARENT_JORDAN_1_RETRO_HIGH_OG': 'https://images.stockx.com/images/Air-Jordan-1-Retro-High-OG-Chicago-Reimagined-Lost-and-Found-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&auto=format,compress&trim=color&q=90',
  'MOCK_PARENT_NIKE_AIR_FORCE_1_LOW': 'https://images.stockx.com/images/Nike-Air-Force-1-Low-White-07-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&auto=format,compress&trim=color&q=90',
  'MOCK_PARENT_SUPREME_BOX_LOGO_HOODIE': 'https://images.stockx.com/images/Supreme-Box-Logo-Hooded-Sweatshirt-FW21-Black.jpg?fit=fill&bg=FFFFFF&w=700&h=500&auto=format,compress&trim=color&q=90',
  'MOCK_PARENT_BAPE_SHARK_HOODIE': 'https://images.stockx.com/images/BAPE-1st-Camo-Shark-Full-Zip-Double-Hoodie-Blue.jpg?fit=fill&bg=FFFFFF&w=700&h=500&auto=format,compress&trim=color&q=90',
  'MOCK_PARENT_NIKE_SB_DUNK_LOW': 'https://images.stockx.com/images/Nike-SB-Dunk-Low-Strangelove-Skateboards-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&auto=format,compress&trim=color&q=90',
  'MOCK_PARENT_JORDAN_11_RETRO': 'https://images.stockx.com/images/Air-Jordan-11-Retro-Bred-2019-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&auto=format,compress&trim=color&q=90'
}

async function updateImages() {
  console.log('🖼️  Updating product images...\n')

  for (const [cloverId, imageUrl] of Object.entries(productImages)) {
    const { data, error } = await supabase
      .from('products')
      .update({ image_url: imageUrl })
      .eq('clover_id', cloverId)
      .select('clean_name')
      .single()

    if (error) {
      console.error(`❌ Error updating ${cloverId}:`, error.message)
    } else {
      console.log(`✅ Updated: ${data.clean_name}`)
    }
  }

  console.log('\n🎉 Images updated!')
}

updateImages().catch(console.error)
