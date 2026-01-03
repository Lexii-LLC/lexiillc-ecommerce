-- Migration 002: Add product_type and variants table
-- Run this after 001_create_products_table.sql

-- 1. Add product_type column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'other';
-- Values: 'sneaker', 'apparel', 'accessory', 'other'

-- 2. Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  clover_item_id TEXT UNIQUE NOT NULL,
  size TEXT,
  color TEXT,
  condition TEXT,  -- 'new', 'used', 'ds' (deadstock)
  variant_number TEXT,  -- '(2)', '(02)' etc from Clover naming
  price INTEGER,  -- Price may vary by variant (stored in cents)
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_clover_item_id ON product_variants(clover_item_id);
CREATE INDEX IF NOT EXISTS idx_variants_size ON product_variants(size);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);

-- 4. Add updated_at trigger for variants
CREATE TRIGGER update_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable RLS on variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for variants
CREATE POLICY "Variants are viewable by everyone"
  ON product_variants FOR SELECT
  USING (true);

CREATE POLICY "Variants are insertable by service role"
  ON product_variants FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Variants are updatable by service role"
  ON product_variants FOR UPDATE
  USING (auth.role() = 'service_role');
