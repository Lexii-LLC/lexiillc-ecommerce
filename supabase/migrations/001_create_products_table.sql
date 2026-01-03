-- Supabase Products Table Migration
-- This table serves as a caching layer for normalized Clover inventory

-- Create the products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clover_id TEXT UNIQUE NOT NULL,
  raw_name TEXT NOT NULL,
  clean_name TEXT,
  clean_brand TEXT,
  clean_model TEXT,
  clean_size TEXT,
  clean_colorway TEXT,
  price INTEGER, -- stored in cents
  stock_quantity INTEGER DEFAULT 0,
  is_normalized BOOLEAN DEFAULT FALSE,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_clover_id ON products(clover_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(clean_brand);
CREATE INDEX IF NOT EXISTS idx_products_normalized ON products(is_normalized);
CREATE INDEX IF NOT EXISTS idx_products_last_synced ON products(last_synced);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (enable row level security)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for storefront)
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (true);

-- Restrict write access to authenticated service role only
CREATE POLICY "Products are insertable by service role"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Products are updatable by service role"
  ON products FOR UPDATE
  USING (auth.role() = 'service_role');
