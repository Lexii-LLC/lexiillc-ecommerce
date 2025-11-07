import type { ParsedShoe } from '../types/inventory'

/**
 * Parses inconsistent shoe names from Clover inventory
 * Handles formats like "Af1 Ambush 5y/6.5w (7)" and variations
 */
export function parseShoeName(originalName: string): ParsedShoe {
  // Remove extra whitespace
  let name = originalName.trim()

  // Extract size information (patterns like "5y/6.5w (7)", "10", "10.5", etc.)
  // More comprehensive size patterns
  const sizePatterns = [
    /\s+Size\s+\d+[yY]\s*\/\s*\d+\.?\d*[wW]\s*\(?\d+\)?/i, // "Size 5y/6.5w (7)"
    /\s+\d+[yY]\s*\/\s*\d+\.?\d*[wW]\s*\(?\d+\)?/, // " 5y/6.5w (7)"
    /\s+Size\s+\d+\.?\d*[mMyYwW]\s*\(?\d+\)?/i, // "Size 10M (01)"
    /\s+\d+\.?\d*[mMyYwW]\s*\(?\d+\)?/, // " 10M (01)"
    /\s+Size\s+\d+\.?\d*[mMyYwW]/i, // "Size 10M"
    /\s+\d+\.?\d*\s*[mMyYwW]\s*\(/, // " 10M ("
    /\s+Size\s+\d+\.?\d*\s*\(/i, // "Size 10 ("
    /\s+\d+\.?\d*\s*\(/, // " 10 ("
    /\s+\(?\d+\.?\d*\)?\s*$/, // "(7)" or "10" at the end
    /\s+\d+\.?\d*\s*$/, // " 10.5" at the end
    /\s+[SMLXL]+$/i, // " L" or " XL" at the end
  ]

  let size: string | undefined
  let cleanedName = name

  // Remove size patterns from the name
  for (const pattern of sizePatterns) {
    const match = name.match(pattern)
    if (match) {
      size = match[0].trim()
      cleanedName = name.replace(pattern, '').trim()
      break
    }
  }

  // Also remove standalone "Size" word if it remains
  cleanedName = cleanedName.replace(/\s+Size\s+/gi, ' ').trim()

  // Split into parts to extract brand and model
  const parts = cleanedName.split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    // Fallback: return original name as model
    return {
      brand: '',
      model: originalName,
      size,
      originalName,
      searchQuery: originalName,
    }
  }

  // Common shoe brand patterns (case-insensitive)
  const brandPatterns = [
    /^nike$/i,
    /^adidas$/i,
    /^jordan$/i,
    /^air\s+jordan$/i,
    /^new\s+balance$/i,
    /^puma$/i,
    /^reebok$/i,
    /^vans$/i,
    /^converse$/i,
    /^yeezy$/i,
    /^dunk$/i,
    /^af1$/i,
    /^air\s+force$/i,
  ]

  // Try to identify brand from first part(s)
  let brand = ''
  let modelStartIndex = 0

  // Check if first part is a brand
  if (parts[0] && brandPatterns.some((p) => p.test(parts[0]))) {
    brand = parts[0]
    modelStartIndex = 1

    // Check for two-word brands (e.g., "Air Jordan", "New Balance")
    if (parts.length > 1) {
      const twoWordBrand = `${parts[0]} ${parts[1]}`
      if (brandPatterns.some((p) => p.test(twoWordBrand))) {
        brand = twoWordBrand
        modelStartIndex = 2
      }
    }
  } else {
    // If no brand found, check for common abbreviations
    const firstPart = parts[0]?.toLowerCase() || ''
    if (firstPart === 'af1' || firstPart === 'af') {
      brand = 'Nike'
      modelStartIndex = 1
      // Add "Air Force 1" to model if it's just "AF1"
      if (parts.length === 1 || (parts.length > 1 && !parts[1].match(/^\d+$/))) {
        parts.splice(1, 0, 'Air', 'Force', '1')
        modelStartIndex = 4
      }
    } else if (firstPart.startsWith('aj') || (firstPart === 'j' && parts.length > 1)) {
      brand = 'Jordan'
      modelStartIndex = 1
    } else if (firstPart === 'nb') {
      brand = 'New Balance'
      modelStartIndex = 1
    } else if (firstPart === 'sb' && parts.length > 1 && parts[1].toLowerCase() === 'dunk') {
      brand = 'Nike'
      modelStartIndex = 0 // Keep "Sb Dunk" as part of model
    } else {
      // Default: use first part as brand if it looks like one
      brand = parts[0] || ''
      modelStartIndex = 1
    }
  }

  // Remaining parts are the model
  let model = parts.slice(modelStartIndex).join(' ') || cleanedName

  // Clean up model - remove common words that shouldn't be in search
  model = model
    .replace(/\s+Size\s+/gi, ' ')
    .replace(/\s+Vnds\s*/gi, '')
    .replace(/\s+Used\s*/gi, '')
    .replace(/\s+USED\s*/gi, '')
    .replace(/\s+NO BOX LABEL\s*/gi, '')
    .replace(/\s+Store Credit\s*/gi, '')
    .trim()

  // Create search query for KicksDB
  // For Jordan shoes, format as "Air Jordan [number] [colorway]"
  let searchQuery = ''
  if (brand.toLowerCase() === 'jordan' && model.match(/^\d+/)) {
    const modelMatch = model.match(/^(\d+)\s*(.+)?/)
    if (modelMatch) {
      const jordanNumber = modelMatch[1]
      const colorway = modelMatch[2]?.trim() || ''
      searchQuery = `Air Jordan ${jordanNumber} ${colorway}`.trim()
    } else {
      searchQuery = `Air Jordan ${model}`.trim()
    }
  } else if (brand.toLowerCase() === 'nike' && model.toLowerCase().includes('dunk')) {
    // Format Nike Dunks properly
    searchQuery = `Nike ${model}`.trim()
  } else {
    // Combine brand and model
    const searchParts = [brand, model].filter(Boolean)
    searchQuery = searchParts.join(' ').trim() || originalName
  }

  // Clean up search query
  searchQuery = searchQuery.replace(/\s+/g, ' ').trim()

  return {
    brand: brand.trim(),
    model: model.trim(),
    size,
    originalName,
    searchQuery,
  }
}

/**
 * Normalizes a shoe name for better matching
 */
export function normalizeShoeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
}

