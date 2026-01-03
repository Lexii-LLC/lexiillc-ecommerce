import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// More reliable image URLs using Unsplash (free, no CORS issues)
const productImages: Record<string, string> = {
  'MOCK_PARENT_JORDAN_4_RETRO': 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=600&h=600&fit=crop',
  'MOCK_PARENT_NIKE_DUNK_LOW': 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop',
  'MOCK_PARENT_NEW_BALANCE_550': 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&h=600&fit=crop',
  'MOCK_PARENT_ADIDAS_YEEZY_SLIDE': 'https://images.unsplash.com/photo-1575537302964-96cd47c06b1b?w=600&h=600&fit=crop',
  'MOCK_PARENT_JORDAN_1_RETRO_HIGH_OG': 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&h=600&fit=crop',
  'MOCK_PARENT_NIKE_AIR_FORCE_1_LOW': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=600&fit=crop',
  'MOCK_PARENT_SUPREME_BOX_LOGO_HOODIE': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop',
  'MOCK_PARENT_BAPE_SHARK_HOODIE': 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=600&fit=crop',
  'MOCK_PARENT_NIKE_SB_DUNK_LOW': 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=600&h=600&fit=crop',
  'MOCK_PARENT_JORDAN_11_RETRO': 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=600&fit=crop'
}

async function updateImages() {
  console.log('🖼️  Updating product images with reliable URLs...\n')

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
