-- Migration 003: Fix schema for Parent/Variant relationship
-- Run this after 002_add_variants.sql

-- 1. Make clover_id nullable (Parents don't have clover_ids)
ALTER TABLE products ALTER COLUMN clover_id DROP NOT NULL;

-- 2. Add is_parent flag to distinguish Parents from un-normalized raw items
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT false;

-- 3. Add constraint: Parents must have clean_name
ALTER TABLE products ADD CONSTRAINT check_parent_has_name 
  CHECK (is_parent = false OR (is_parent = true AND clean_name IS NOT NULL));

-- 4. Create index for fast parent lookup
CREATE INDEX IF NOT EXISTS idx_products_is_parent ON products(is_parent);
CREATE INDEX IF NOT EXISTS idx_products_clean_keys ON products(clean_brand, clean_model, clean_colorway) WHERE is_parent = true;
