/**
 * AI-powered product name and size cleaning using Groq API
 * Cost-effective implementation with batching and caching
 */

import { getCachedHFImprovement, setCachedHFImprovement } from './inventory-cache'

/**
 * Structured output interface for cleaned product data
 */
export interface CleanedProductData {
  cleanedName: string
  brand: string
  model: string
  size?: 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'
  variant?: string
  colorway?: string
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
    const prompt = `You are a product data cleaner for a shoe store. Parse the following product name and extract structured data.

Product name: "${originalName}"

Extract the following information and respond ONLY with valid JSON (no markdown, no explanation):
{
  "cleanedName": "Cleaned display name without size info",
  "brand": "Brand name (Nike, Adidas, Jordan, New Balance, Puma, Vans, Converse, Reebok, Bape, etc.)",
  "model": "Model name (e.g., Air Force 1, Dunk Low, Jordan 1)",
  "size": "Standard size if apparel (S, M, L, XL, XXL, or XXXL) or null for shoes",
  "variant": "Flavor/variant for non-shoes (e.g., Macaron, Strawberry) or null",
  "colorway": "Color scheme (e.g., Triple White, Bred, University Blue) or null",
  "confidence": "high, medium, or low based on parsing confidence"
}

Common abbreviations:
- AF1 = Nike Air Force 1
- AJ = Air Jordan
- SB = Nike SB
- NB = New Balance
- Jordon = Jordan (fix misspelling)
- YZY = Yeezy

Respond with ONLY the JSON object.`

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
        
        // Validate required fields
        if (parsed.cleanedName && parsed.brand !== undefined) {
          // Normalize size field
          if (parsed.size && !['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(parsed.size)) {
            parsed.size = undefined
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
 * Returns the best available cleaned data
 */
export async function cleanProductNameSafe(
  originalName: string
): Promise<{
  cleanedName: string
  brand: string
  model: string
  size?: 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'
  variant?: string
}> {
  // Try AI cleaning first (if available and cached or API works)
  try {
    const aiResult = await cleanProductNameWithAI(originalName)
    if (aiResult && aiResult.confidence !== 'low') {
      return {
        cleanedName: aiResult.cleanedName,
        brand: aiResult.brand,
        model: aiResult.model,
        size: aiResult.size,
        variant: aiResult.variant,
      }
    }
  } catch {
    // AI cleaning failed, fall through to fallback
  }

  // Fallback: return original name with empty fields
  return {
    cleanedName: originalName,
    brand: '',
    model: originalName,
    size: undefined,
    variant: undefined,
  }
}
