/**
 * Bulk Normalize Script
 * Run locally to normalize all unnormalized products in one go
 * Bypasses Netlify timeouts
 * 
 * Usage: npx tsx scripts/bulk-normalize.ts
 */

import { normalizeUnnormalizedProducts } from '../lib/sync/sync-products'

async function main() {
  console.log('🚀 Starting Bulk Normalization...')
  console.log('Press Ctrl+C to stop safely (progress is saved after each item)')

  let totalNormalized = 0
  let totalErrors = 0
  let batchCount = 0

  while (true) {
    batchCount++
    console.log(`\n📦 Processing Batch #${batchCount}`)

    // Process a batch of 50 products
    const result = await normalizeUnnormalizedProducts(50)

    totalNormalized += result.normalized + result.synced // synced counts items marked as normalized even if AI failed
    totalErrors += result.errors.length

    // Stop if no more products to normalize
    if (result.total === 0) {
      console.log('\n✨ All products are normalized! Exiting.')
      break
    }

    // Stop if we hit rate limits consistently (result.rateLimited handles one batch, but loop continues)
    // The inner function already waits, so we can just continue
    
    // Status update
    console.log(`📊 Total Progress: ${totalNormalized} items processed | ${totalErrors} errors`)
  }
}

main().catch(console.error)
