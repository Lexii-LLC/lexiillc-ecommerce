/**
 * AI-powered product name and size cleaning using Groq API
 * Handles sneakers, apparel, and accessories
 */

import { getCachedHFImprovement, setCachedHFImprovement } from './inventory-cache'

/**
 * Product type classification
 */
export type ProductType = 'sneaker' | 'apparel' | 'accessory' | 'other'

/**
 * Structured output interface for cleaned product data
 */
export interface CleanedProductData {
  cleanedName: string
  brand: string
  model: string
  productType: ProductType
  size?: string
  colorway?: string
  condition?: 'new' | 'used' | 'ds'
  variantNumber?: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Clean and normalize a single product name using Groq API
 */
export async function cleanProductNameWithAI(
  originalName: string
): Promise<CleanedProductData | null> {
  // Check cache first
  const cached = getCachedHFImprovement(originalName)
  if (cached) {
    try {
      return JSON.parse(cached) as CleanedProductData
    } catch {
      // Cache value is corrupted, continue to fetch
    }
  }

  // Check for API key
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return null
  }

  try {
    const prompt = `You are a product data parser for a shoe and streetwear store. Parse this product name and extract structured data.

Product: "${originalName}"

RULES:
1. Identify product type: sneaker, apparel (tees, hoodies, jackets, pants), accessory (socks, masks, bags, hats), or other
2. Extract brand name ONCE (don't duplicate, e.g., "Jordan Jordan" is wrong, just "Jordan")
3. Extract model name (Air Force 1, Dunk, 550, Tee, Hoodie, etc.)
4. Extract size if present (sneaker sizes like "7y", "8.5w", "12" OR apparel sizes "S", "M", "L", "XL", "2XL")
5. Extract colorway/color if present (Triple White, Bred, Onyx, Black, etc.)
6. Extract condition if mentioned: "Used", "DS" (deadstock), or assume "new"
7. Extract variant number if present in parentheses like "(2)" or "(02)"

BRANDS TO RECOGNIZE:
Sneakers: Nike, Jordan, Adidas, Yeezy, New Balance, Puma, Reebok, Asics, Vans, Converse
Streetwear: Supreme, Bape/A Bathing Ape, Stussy, Palace, Off-White, Vlone, Hellstar, ASSC, Essentials, Fear of God

RESPOND WITH ONLY VALID JSON:
{
  "cleanedName": "Display name without size/condition",
  "brand": "Single brand name",
  "model": "Model or product type",
  "productType": "sneaker" | "apparel" | "accessory" | "other",
  "size": "Size string or null",
  "colorway": "Color or null",
  "condition": "new" | "used" | "ds" | null,
  "variantNumber": "Variant like (2) or null",
  "confidence": "high" | "medium" | "low"
}`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 256,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      console.error('Groq API error:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content?.trim()

    if (text) {
      // Try to extract JSON from the response
      let jsonStr = text
      
      // Remove markdown code blocks if present
      if (text.includes('```json')) {
        jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      } else if (text.includes('```')) {
        jsonStr = text.replace(/```\s*/g, '')
      }
      
      try {
        const parsed = JSON.parse(jsonStr.trim()) as CleanedProductData
        
        // Validate and fix common issues
        if (parsed.cleanedName && parsed.brand !== undefined) {
          // Fix duplicate brand in model (e.g., "Jordan Jordan 4" -> "Jordan 4")
          if (parsed.model && parsed.brand && parsed.model.toLowerCase().startsWith(parsed.brand.toLowerCase())) {
            parsed.model = parsed.model.substring(parsed.brand.length).trim()
          }
          
          // Ensure productType is valid
          if (!['sneaker', 'apparel', 'accessory', 'other'].includes(parsed.productType)) {
            parsed.productType = 'other'
          }
          
          // Normalize condition
          if (parsed.condition && !['new', 'used', 'ds'].includes(parsed.condition)) {
            parsed.condition = undefined
          }
          
          // Cache the result
          setCachedHFImprovement(originalName, JSON.stringify(parsed))
          
          return parsed
        }
      } catch (parseError) {
        console.warn('Failed to parse AI response:', parseError)
      }
    }

    return null
  } catch (error) {
    console.error('Error cleaning product name with AI:', error)
    return null
  }
}

/**
 * Batch clean multiple product names efficiently
 */
export async function batchCleanProductNames(
  productNames: string[],
  batchSize: number = 10,
  delayMs: number = 100
): Promise<(CleanedProductData | null)[]> {
  const results: (CleanedProductData | null)[] = []

  for (let i = 0; i < productNames.length; i += batchSize) {
    const batch = productNames.slice(i, i + batchSize)

    const batchPromises = batch.map((name) => cleanProductNameWithAI(name))
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // Add delay between batches to avoid rate limiting
    if (i + batchSize < productNames.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}

/**
 * Clean product name with fallback to original parsing
 */
export async function cleanProductNameSafe(
  originalName: string
): Promise<{
  cleanedName: string
  brand: string
  model: string
  productType: ProductType
  size?: string
  colorway?: string
  condition?: 'new' | 'used' | 'ds'
}> {
  try {
    const aiResult = await cleanProductNameWithAI(originalName)
    if (aiResult && aiResult.confidence !== 'low') {
      return {
        cleanedName: aiResult.cleanedName,
        brand: aiResult.brand,
        model: aiResult.model,
        productType: aiResult.productType,
        size: aiResult.size,
        colorway: aiResult.colorway,
        condition: aiResult.condition,
      }
    }
  } catch {
    // AI cleaning failed, fall through to fallback
  }

  // Fallback: return original name with defaults
  return {
    cleanedName: originalName,
    brand: '',
    model: originalName,
    productType: 'other',
    size: undefined,
    colorway: undefined,
    condition: undefined,
  }
}
