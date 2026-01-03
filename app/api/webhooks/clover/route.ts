import { NextRequest, NextResponse } from 'next/server'
import { updateProductStockFromWebhook } from '@/lib/sync/sync-products'

/**
 * Clover Webhook Handler
 * Receives inventory update events from Clover
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.warn('[Webhook] Received Clover event:', JSON.stringify(body, null, 2))

    // Handle different event types
    const eventType = body.type || body.eventType
    const itemId = body.itemId || body.data?.itemId
    const stockCount = body.stockCount ?? body.data?.stockCount

    switch (eventType) {
      case 'INVENTORY_UPDATE':
      case 'ITEM_UPDATE': {
        if (itemId && stockCount !== undefined) {
          const success = await updateProductStockFromWebhook(itemId, stockCount)
          return NextResponse.json({ success, itemId })
        }
        break
      }

      case 'ITEM_CREATE': {
        console.warn('[Webhook] New item created, will sync on next cron run')
        return NextResponse.json({ success: true, message: 'Queued for sync' })
      }

      case 'ITEM_DELETE': {
        if (itemId) {
          await updateProductStockFromWebhook(itemId, 0)
          return NextResponse.json({ success: true, itemId })
        }
        break
      }

      default:
        console.warn('[Webhook] Unhandled event type:', eventType)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Webhook] Error processing:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Clover may send a verification request
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Lexii Clover Webhook' })
}
