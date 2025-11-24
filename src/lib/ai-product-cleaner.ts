/**
 * AI-powered product name and size cleaning using LangChain and OpenAI
 * Cost-effective implementation with batching and caching
 */

import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { getCachedHFImprovement, setCachedHFImprovement } from './inventory-cache'

/**
 * Get environment variable (works in both server and client contexts)
 */
function getEnv(key: string): string | undefined {
  // Server-side: use process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  // Client-side: use import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key]
  }
  return undefined
}

const OPENAI_API_KEY = getEnv('VITE_OPENAI_API_KEY') || getEnv('OPENAI_API_KEY')

// Use gpt-4o-mini for cost-effectiveness (much cheaper than gpt-4)
// ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
const model = OPENAI_API_KEY
  ? new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1, // Very low temperature for consistent, accurate parsing
      maxTokens: 200, // Increased slightly for better structured output
      openAIApiKey: OPENAI_API_KEY,
    })
  : null

/**
 * Structured output interface for cleaned product data
 */
export interface CleanedProductData {
  cleanedName: string
  brand: string
  model: string
  size?: 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'
  variant?: string // For products that have variants instead of sizes (e.g., "Macaron", "Strawberry")
  colorway?: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Clean and normalize a single product name using AI
 * Returns structured data with brand, model, size, etc.
 */
export async function cleanProductNameWithAI(
  originalName: string
): Promise<CleanedProductData | null> {
  if (!model || !OPENAI_API_KEY) {
    console.warn('OpenAI API key not found. Set VITE_OPENAI_API_KEY or OPENAI_API_KEY')
    return null
  }

  // Check cache first
  const cached = getCachedHFImprovement(originalName)
  if (cached && cached !== originalName) {
    // If we have a cached improvement, use it but still parse with AI for structure
    // This saves on API calls while still getting structured data
  }

  try {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are an expert at parsing and cleaning sneaker product names from inventory systems.

CRITICAL RULES:
1. Remove ALL size information from cleanedName (e.g., "Size 10", "10M", "5y/6.5w", "(7)")
2. Remove condition words: "VNDS", "Used", "USED", "NO BOX", "Store Credit"
3. Remove extra whitespace and normalize capitalization
4. Extract brand, model, and colorway accurately
5. Handle common abbreviations: AF1/AF = Air Force 1, AJ = Air Jordan, SB = Skateboarding, NB = New Balance

BRAND NORMALIZATION:
- "Jordan", "AJ", "Air Jordan" → "Jordan"
- "AF1", "AF", "Air Force" → Brand: "Nike", Model: "Air Force 1"
- "SB Dunk" → Brand: "Nike", Model: "SB Dunk"
- "Yeezy" → Brand: "Adidas", Model includes "Yeezy"
- "NB" → "New Balance"
- "Dunk" (without brand) → Brand: "Nike", Model: "Dunk"

SIZE vs VARIANT HANDLING:
- For CLOTHING/APPAREL (shoes, shirts, pants, etc.): Extract size and convert to S, M, L, XL, XXL, XXXL
  * If numeric size found, convert: US 4-6 → S, US 7-8 → M, US 9-10 → L, US 11-12 → XL, US 13-14 → XXL, US 15+ → XXXL
  * If already in letter format, use as-is
- For ACCESSORIES/OTHER ITEMS (keychains, collectibles, food items, etc.): Extract variant instead of size
  * Variants are descriptive names like "Macaron", "Strawberry", "Blue", "Red", "Gold", etc.
  * If product name contains variant info (e.g., "Macaron Labubus", "Strawberry Keychain"), extract as variant
  * Do NOT assign a size to non-apparel items
- Use "size" field ONLY for apparel/clothing items
- Use "variant" field ONLY for non-apparel items that have variants
- If neither size nor variant applies, omit both fields

EXAMPLES:

Input: "Af1 Ambush 5y/6.5w (7)"
Output: {{
  "cleanedName": "Nike Air Force 1 Ambush",
  "brand": "Nike",
  "model": "Air Force 1",
  "size": "M",
  "colorway": "Ambush",
  "confidence": "high"
}}

Input: "Jordan 1 High OG Chicago Size 10M"
Output: {{
  "cleanedName": "Jordan 1 High OG Chicago",
  "brand": "Jordan",
  "model": "1 High OG",
  "size": "L",
  "colorway": "Chicago",
  "confidence": "high"
}}

Input: "Nike SB Dunk Low Panda VNDS Size 10.5"
Output: {{
  "cleanedName": "Nike SB Dunk Low Panda",
  "brand": "Nike",
  "model": "SB Dunk Low",
  "size": "L",
  "colorway": "Panda",
  "confidence": "high"
}}

Input: "Yeezy 350 V2 Zebra 10"
Output: {{
  "cleanedName": "Adidas Yeezy 350 V2 Zebra",
  "brand": "Adidas",
  "model": "Yeezy 350 V2",
  "size": "L",
  "colorway": "Zebra",
  "confidence": "high"
}}

Input: "Dunk Low University Blue (8)"
Output: {{
  "cleanedName": "Nike Dunk Low University Blue",
  "brand": "Nike",
  "model": "Dunk Low",
  "size": "M",
  "colorway": "University Blue",
  "confidence": "high"
}}

Input: "Nike T-Shirt XL"
Output: {{
  "cleanedName": "Nike T-Shirt",
  "brand": "Nike",
  "model": "T-Shirt",
  "size": "XL",
  "confidence": "high"
}}

Input: "Macaron Labubus"
Output: {{
  "cleanedName": "Labubus",
  "brand": "",
  "model": "Labubus",
  "variant": "Macaron",
  "confidence": "high"
}}

Input: "Strawberry Keychain"
Output: {{
  "cleanedName": "Keychain",
  "brand": "",
  "model": "Keychain",
  "variant": "Strawberry",
  "confidence": "high"
}}

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{{
  "cleanedName": "Brand Model Colorway",
  "brand": "Brand Name",
  "model": "Model Name",
  "size": "S|M|L|XL|XXL|XXXL",
  "variant": "Variant name if applicable",
  "colorway": "Colorway name if found",
  "confidence": "high|medium|low"
}}

IMPORTANT RULES:
- "size" field: Use ONLY for apparel/clothing (shoes, shirts, etc.). Must be EXACTLY one of: S, M, L, XL, XXL, or XXXL
- "variant" field: Use ONLY for non-apparel items with variants (e.g., "Macaron", "Strawberry", "Blue", "Gold")
- NEVER use both "size" and "variant" in the same response
- If product is apparel but size cannot be determined, omit "size" field
- If product is non-apparel but has no variant, omit "variant" field`,
      ],
      ['human', 'Product name: {name}'],
    ])

    const chain = prompt.pipe(model)

    const response = await chain.invoke({
      name: originalName,
    })

    const content = response.content as string

    // Parse JSON response
    let cleaned: CleanedProductData
    try {
      // Extract JSON from response (handle markdown code blocks, extra whitespace)
      let jsonStr = content.trim()
      
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      
      // Find JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleaned = JSON.parse(jsonMatch[0])
        
        // Post-process: Clean up the cleanedName (remove size info if AI missed it)
        if (cleaned.cleanedName) {
          cleaned.cleanedName = cleaned.cleanedName
            .replace(/\s+Size\s+\d+[^\s]*/gi, '')
            .replace(/\s+\d+[yYwWmM]\s*/g, ' ')
            .replace(/\s+\(\d+[^)]*\)/g, '')
            .replace(/\s+VNDS\s*/gi, '')
            .replace(/\s+Used\s*/gi, '')
            .replace(/\s+USED\s*/gi, '')
            .replace(/\s+NO BOX\s*/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
        }
        
        // Normalize brand capitalization
        if (cleaned.brand) {
          const brandLower = cleaned.brand.toLowerCase()
          if (brandLower === 'nike') cleaned.brand = 'Nike'
          else if (brandLower === 'adidas') cleaned.brand = 'Adidas'
          else if (brandLower === 'jordan' || brandLower === 'air jordan') cleaned.brand = 'Jordan'
          else if (brandLower === 'new balance' || brandLower === 'nb') cleaned.brand = 'New Balance'
          else if (brandLower === 'puma') cleaned.brand = 'Puma'
          else if (brandLower === 'reebok') cleaned.brand = 'Reebok'
          else if (brandLower === 'vans') cleaned.brand = 'Vans'
          else if (brandLower === 'converse') cleaned.brand = 'Converse'
        }
        
        // Normalize size to standard format (S, M, L, XL, XXL, XXXL)
        if (cleaned.size) {
          const sizeUpper = cleaned.size.toUpperCase().trim()
          // If it's already a valid size, use it
          if (['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(sizeUpper)) {
            cleaned.size = sizeUpper as 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'
          } else {
            // Try to convert numeric size to letter size
            const numericMatch = sizeUpper.match(/(\d+\.?\d*)/)
            if (numericMatch) {
              const numericSize = parseFloat(numericMatch[1])
              // Convert shoe size to clothing size
              if (numericSize <= 6) cleaned.size = 'S'
              else if (numericSize <= 8) cleaned.size = 'M'
              else if (numericSize <= 10) cleaned.size = 'L'
              else if (numericSize <= 12) cleaned.size = 'XL'
              else if (numericSize <= 14) cleaned.size = 'XXL'
              else cleaned.size = 'XXXL'
            } else {
              // If we can't determine, remove the size field
              delete cleaned.size
            }
          }
        }
        
        // Ensure size and variant are mutually exclusive
        // If both are present, prioritize size for apparel, variant for non-apparel
        if (cleaned.size && cleaned.variant) {
          // If we have a size, it's likely apparel - remove variant
          // If we have a variant, it's likely non-apparel - remove size
          // Keep the one that makes more sense based on the product type
          const modelLower = (cleaned.model || '').toLowerCase()
          const isApparel = modelLower.includes('shoe') || 
                          modelLower.includes('sneaker') || 
                          modelLower.includes('shirt') || 
                          modelLower.includes('pants') ||
                          modelLower.includes('jacket') ||
                          modelLower.includes('hoodie')
          
          if (isApparel) {
            delete cleaned.variant
          } else {
            delete cleaned.size
          }
        }
        
        // Clean up variant field
        if (cleaned.variant) {
          cleaned.variant = cleaned.variant.trim()
          // Remove variant from cleanedName if it's there
          if (cleaned.cleanedName && cleaned.variant) {
            const variantRegex = new RegExp(`\\b${cleaned.variant}\\b`, 'gi')
            cleaned.cleanedName = cleaned.cleanedName.replace(variantRegex, '').replace(/\s+/g, ' ').trim()
          }
        }
        
        // Validate required fields
        if (!cleaned.cleanedName || !cleaned.brand || !cleaned.model) {
          console.warn('AI response missing required fields:', cleaned)
          return null
        }
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON:', content, parseError)
      return null
    }

    // Additional validation: Ensure cleanedName doesn't contain size info
    if (cleaned.cleanedName) {
      // Double-check for size patterns that might have been missed
      const sizePatterns = [
        /\s+Size\s+\d+/i,
        /\s+\d+[yYwWmM]\s*/,
        /\s+\(\d+[^)]*\)/,
        /\s+\d+\.?\d*\s*$/,
      ]
      
      for (const pattern of sizePatterns) {
        if (pattern.test(cleaned.cleanedName)) {
          cleaned.cleanedName = cleaned.cleanedName.replace(pattern, '').trim()
        }
      }
      
      // Ensure cleanedName is properly formatted
      cleaned.cleanedName = cleaned.cleanedName
        .replace(/\s+/g, ' ')
        .trim()
    }
    
    // Validate confidence based on extracted data quality
    if (cleaned.confidence === 'high' && (!cleaned.brand || !cleaned.model)) {
      cleaned.confidence = 'medium'
    }
    
    // If we got good results, cache the cleaned name
    if (cleaned.cleanedName && cleaned.cleanedName !== originalName && cleaned.confidence !== 'low') {
      setCachedHFImprovement(originalName, cleaned.cleanedName)
    }

    return cleaned
  } catch (error) {
    console.warn('AI cleaning failed:', error)
    return null
  }
}

/**
 * Batch clean multiple product names efficiently
 * Uses parallel processing with rate limiting to stay cost-effective
 */
export async function batchCleanProductNames(
  productNames: string[],
  batchSize: number = 10,
  delayMs: number = 100
): Promise<(CleanedProductData | null)[]> {
  if (!model || !OPENAI_API_KEY) {
    return productNames.map(() => null)
  }

  const results: (CleanedProductData | null)[] = []
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < productNames.length; i += batchSize) {
    const batch = productNames.slice(i, i + batchSize)
    
    // Process batch in parallel
    const batchPromises = batch.map((name) => cleanProductNameWithAI(name))
    const batchResults = await Promise.all(batchPromises)
    
    results.push(...batchResults)
    
    // Small delay between batches to respect rate limits
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
  
  // Fallback to original name if AI fails
  return {
    cleanedName: originalName,
    brand: '',
    model: originalName,
    size: undefined,
    variant: undefined,
  }
}

