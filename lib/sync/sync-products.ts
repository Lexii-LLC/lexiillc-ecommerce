/**
 * Product Sync Utility
 * Syncs products from Clover to Supabase with AI normalization
 * Respects rate limits for both Clover and Groq APIs
 */

import { fetchCloverInventoryServer } from '../clover-api'
import { cleanProductNameWithAI } from '../ai-product-cleaner'
import {
  upsertProducts,
  getUnnormalizedProducts,
  updateProductByCloverById,
  type ProductInsert,
} from '../supabase/products'

// Rate limit configuration
const GROQ_RATE_LIMIT = {
  requestsPerMinute: 25, // Leave buffer under 30/min limit
  delayBetweenRequests: 2500, // ~24 requests/min
}

interface SyncResult {
  total: number
  synced: number
  normalized: number
  errors: string[]
  rateLimited: boolean
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Full sync: Fetch all products from Clover and upsert to Supabase
 * This syncs raw data without AI normalization (fast, no rate limits)
 */
export async function syncAllProductsFromClover(): Promise<SyncResult> {
  const result: SyncResult = {
    total: 0,
    synced: 0,
    normalized: 0,
    errors: [],
    rateLimited: false,
  }

  try {
    console.log('[Sync] Fetching all products from Clover...')
    const cloverItems = await fetchCloverInventoryServer()
    result.total = cloverItems.length
    console.log(`[Sync] Found ${cloverItems.length} products in Clover`)

    // Prepare products for upsert (raw data only, no AI)
    const products: ProductInsert[] = cloverItems.map((item) => ({
      clover_id: item.id,
      raw_name: item.name,
      price: item.price,
      stock_quantity: item.stockCount ?? 0,
      is_normalized: false,
    }))

    // Batch upsert to Supabase
    console.log(`[Sync] Upserting ${products.length} products to Supabase...`)
    const upsertedCount = await upsertProducts(products)
    result.synced = upsertedCount

    console.log(`[Sync] Raw sync complete: ${result.synced} products synced`)
    return result
  } catch (error) {
    const errorMsg = `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    result.errors.push(errorMsg)
    console.error(`[Sync] ${errorMsg}`)
    return result
  }
}

/**
 * Normalize unsynced products using AI
 * Respects Groq rate limits - call this from cron job
 * @param batchSize - Number of products to normalize per run (default: 20)
 */
export async function normalizeUnnormalizedProducts(
  batchSize = 20
): Promise<SyncResult> {
  const result: SyncResult = {
    total: 0,
    synced: 0,
    normalized: 0,
    errors: [],
    rateLimited: false,
  }

  try {
    // Get unnormalized products from Supabase
    console.log(`[Normalize] Fetching up to ${batchSize} unnormalized products...`)
    const unnormalized = await getUnnormalizedProducts(batchSize)
    result.total = unnormalized.length

    if (unnormalized.length === 0) {
      console.log('[Normalize] All products are already normalized!')
      return result
    }

    console.log(`[Normalize] Found ${unnormalized.length} products to normalize`)

    for (const product of unnormalized) {
      try {
        // Call Groq AI for normalization
        const aiResult = await cleanProductNameWithAI(product.raw_name)

        if (aiResult && aiResult.confidence !== 'low') {
          await updateProductByCloverById(product.clover_id, {
            clean_name: aiResult.cleanedName,
            clean_brand: aiResult.brand,
            clean_model: aiResult.model,
            clean_size: aiResult.size || undefined,
            clean_colorway: aiResult.colorway || undefined,
            product_type: aiResult.productType,
            is_normalized: true,
          })
          result.normalized++
          console.warn(`[Normalize] ✓ ${product.raw_name} -> ${aiResult.brand} ${aiResult.model} (${aiResult.productType})`)
        } else {
          // Mark as normalized even if AI couldn't parse (so we don't retry)
          await updateProductByCloverById(product.clover_id, {
            clean_name: product.raw_name,
            product_type: 'other',
            is_normalized: true,
          })
          result.synced++
          console.warn(`[Normalize] ~ ${product.raw_name} (could not parse)`)
        }

        // Respect rate limits - wait between requests
        await sleep(GROQ_RATE_LIMIT.delayBetweenRequests)
      } catch (error) {
        const errorMsg = `Failed to normalize ${product.clover_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        
        // Check if it's a rate limit error
        if (error instanceof Error && error.message.includes('429')) {
          result.rateLimited = true
          console.warn('[Normalize] Rate limited! Stopping batch.')
          break
        }

        result.errors.push(errorMsg)
        console.warn(`[Normalize] ${errorMsg}`)
      }
    }

    console.log(`[Normalize] Complete: ${result.normalized} normalized, ${result.errors.length} errors`)
    return result
  } catch (error) {
    const errorMsg = `Normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    result.errors.push(errorMsg)
    console.error(`[Normalize] ${errorMsg}`)
    return result
  }
}

/**
 * Combined sync job for cron
 * 1. Syncs all products from Clover (raw data)
 * 2. Normalizes a batch of unnormalized products
 */
export async function runFullSyncJob(): Promise<{
  syncResult: SyncResult
  normalizeResult: SyncResult
}> {
  console.log('[CronJob] Starting full sync job...')

  // Step 1: Sync raw products from Clover
  const syncResult = await syncAllProductsFromClover()

  // Step 2: Normalize a batch of products (respects rate limits)
  const normalizeResult = await normalizeUnnormalizedProducts(20)

  console.log('[CronJob] Full sync job complete')
  return { syncResult, normalizeResult }
}

/**
 * Update stock for a single product from Clover webhook
 */
export async function updateProductStockFromWebhook(
  cloverId: string,
  stockQuantity: number
): Promise<boolean> {
  try {
    await updateProductByCloverById(cloverId, {
      stock_quantity: stockQuantity,
    })
    console.log(`[Webhook] Updated stock for ${cloverId}: ${stockQuantity}`)
    return true
  } catch (error) {
    console.error(`[Webhook] Failed to update stock for ${cloverId}:`, error)
    return false
  }
}
