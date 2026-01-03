-- Migration 004: Add image_url column to products
-- For storing product images

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for queries that might filter by image presence
CREATE INDEX IF NOT EXISTS idx_products_image_url ON products(image_url) WHERE image_url IS NOT NULL;
