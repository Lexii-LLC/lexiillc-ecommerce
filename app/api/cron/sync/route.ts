import { NextRequest, NextResponse } from 'next/server'
import { runFullSyncJob } from '@/lib/sync/sync-products'

/**
 * Cron endpoint for syncing products from Clover
 * Called by Netlify Scheduled Functions
 * 
 * This job:
 * 1. Fetches all products from Clover and upserts to Supabase (raw data)
 * 2. Normalizes a batch of unnormalized products using AI (rate limited)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    // In production, you'd check for a secret header
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting scheduled sync job...')

    const { syncResult, normalizeResult } = await runFullSyncJob()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      sync: {
        total: syncResult.total,
        synced: syncResult.synced,
        errors: syncResult.errors.length,
      },
      normalization: {
        total: normalizeResult.total,
        normalized: normalizeResult.normalized,
        rateLimited: normalizeResult.rateLimited,
        errors: normalizeResult.errors.length,
      },
    })
  } catch (error) {
    console.error('[Cron] Sync job failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
