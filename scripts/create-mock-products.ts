import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mock product data with realistic sneaker info
const mockProducts = [
  {
    brand: 'Jordan',
    model: '4 Retro',
    colors: ['Bred', 'Military Black', 'Red Thunder'],
    sizes: ['8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
    basePrice: 21000, // $210.00
    imageUrl: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800'
  },
  {
    brand: 'Nike',
    model: 'Dunk Low',
    colors: ['Panda', 'Grey Fog', 'University Blue'],
    sizes: ['7', '8', '9', '10', '11', '12', '13'],
    basePrice: 11000, // $110.00
    imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800'
  },
  {
    brand: 'New Balance',
    model: '550',
    colors: ['White Green', 'Sea Salt', 'White Navy'],
    sizes: ['8', '9', '10', '11', '12'],
    basePrice: 13000,
    imageUrl: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800'
  },
  {
    brand: 'Adidas',
    model: 'Yeezy Slide',
    colors: ['Onyx', 'Bone', 'Pure'],
    sizes: ['6', '7', '8', '9', '10', '11', '12', '13'],
    basePrice: 7000,
    imageUrl: 'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=800'
  },
  {
    brand: 'Jordan',
    model: '1 Retro High OG',
    colors: ['Chicago', 'Royal', 'Shadow 2.0'],
    sizes: ['8', '9', '10', '11', '12'],
    basePrice: 18000,
    imageUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800'
  },
  {
    brand: 'Nike',
    model: 'Air Force 1 Low',
    colors: ['Triple White', 'Black', 'Wheat'],
    sizes: ['7', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12', '13'],
    basePrice: 11000,
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800'
  },
  {
    brand: 'Supreme',
    model: 'Box Logo Hoodie',
    colors: ['Black', 'Heather Grey', 'Navy'],
    sizes: ['S', 'M', 'L', 'XL'],
    basePrice: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800'
  },
  {
    brand: 'Bape',
    model: 'Shark Hoodie',
    colors: ['Blue Camo', 'Green Camo', 'Purple Camo'],
    sizes: ['M', 'L', 'XL', '2XL'],
    basePrice: 55000,
    imageUrl: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800'
  },
  {
    brand: 'Nike',
    model: 'SB Dunk Low',
    colors: ['Strangelove', 'Travis Scott', 'Grateful Dead Green'],
    sizes: ['8', '9', '10', '11'],
    basePrice: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=800'
  },
  {
    brand: 'Jordan',
    model: '11 Retro',
    colors: ['Bred', 'Concord', 'Cool Grey'],
    sizes: ['8', '9', '10', '11', '12', '13'],
    basePrice: 22000,
    imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800'
  }
]

async function createMockProducts() {
  console.log('🎯 Creating mock products with variants...\n')

  for (const product of mockProducts) {
    const parentCloverId = `MOCK_PARENT_${product.brand}_${product.model}`.replace(/\s+/g, '_').toUpperCase()
    const cleanName = `${product.brand} ${product.model}`
    
    // Calculate total stock (random per variant)
    let totalStock = 0

    // 1. Create parent product
    const { data: parent, error: parentError } = await supabase
      .from('products')
      .upsert({
        clover_id: parentCloverId,
        raw_name: cleanName,
        clean_name: cleanName,
        clean_brand: product.brand,
        clean_model: product.model,
        clean_colorway: null,
        product_type: product.brand === 'Supreme' || product.brand === 'Bape' ? 'apparel' : 'sneaker',
        is_normalized: true,
        is_parent: true,
        price: product.basePrice,
        stock_quantity: 0, // Will be updated after variants
        image_url: product.imageUrl
      }, { onConflict: 'clover_id' })
      .select()
      .single()

    if (parentError) {
      console.error(`❌ Error creating parent ${cleanName}:`, parentError.message)
      continue
    }

    console.log(`✅ Created parent: ${cleanName}`)

    // 2. Create variants for each color/size combination
    let variantCount = 0
    for (const color of product.colors) {
      for (const size of product.sizes) {
        // Random stock (0-3), with some out of stock
        const stock = Math.random() > 0.2 ? Math.floor(Math.random() * 3) + 1 : 0
        totalStock += stock

        // Price variation by size (larger sizes slightly more expensive)
        const sizeNum = parseFloat(size) || 0
        const priceAdjustment = sizeNum > 11 ? 1000 : 0

        const variantCloverId = `MOCK_${parentCloverId}_${color}_${size}`.replace(/\s+/g, '_').toUpperCase()

        const { error: variantError } = await supabase
          .from('product_variants')
          .upsert({
            product_id: parent.id,
            clover_item_id: variantCloverId,
            size: size,
            color: color,
            condition: 'new',
            price: product.basePrice + priceAdjustment,
            stock_quantity: stock
          }, { onConflict: 'clover_item_id' })

        if (variantError) {
          console.error(`  ❌ Error creating variant ${color} ${size}:`, variantError.message)
        } else {
          variantCount++
        }
      }
    }

    // 3. Update parent stock
    await supabase
      .from('products')
      .update({ stock_quantity: totalStock })
      .eq('id', parent.id)

    console.log(`   └─ Created ${variantCount} variants (${product.colors.length} colors × ${product.sizes.length} sizes)`)
    console.log(`   └─ Total stock: ${totalStock}\n`)
  }

  console.log('🎉 Mock products created successfully!')
  console.log('   Visit http://localhost:3000/shop to see them')
}

createMockProducts().catch(console.error)
