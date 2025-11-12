-- Seed Protein Powder Templates
-- Run this with: npm run db:push (to ensure schema is synced first)
-- Then manually execute via Replit database panel or execute_sql_tool

-- 1) Insert protein powder templates into food_items
-- Using source='template' to identify these as system templates
INSERT INTO food_items (
  name, 
  brand,
  per_unit_type,
  grams_per_serving,
  kcal_100g,
  protein_100g,
  fat_100g,
  carbs_100g,
  fiber_100g,
  sodium_100g,
  tags,
  source,
  is_verified,
  is_public,
  is_active
) VALUES
-- Whey Protein Templates
(
  'Whey Protein (Classic)',
  'Generic',
  'per100g',
  30,
  390,
  80,
  4,
  8,
  2,
  200,
  ARRAY['protein_powder', 'whey', 'default'],
  'template',
  true,
  true,
  true
),
(
  'Whey Protein (Lean)',
  'Generic',
  'per100g',
  30,
  385,
  81,
  3,
  7,
  2,
  180,
  ARRAY['protein_powder', 'whey', 'lean'],
  'template',
  true,
  true,
  true
),
(
  'Whey Protein (High-Carb)',
  'Generic',
  'per100g',
  30,
  410,
  78,
  4,
  12,
  3,
  220,
  ARRAY['protein_powder', 'whey', 'carb'],
  'template',
  true,
  true,
  true
),

-- Plant Protein Templates
(
  'Plant Protein (Pea/Soy)',
  'Generic',
  'per100g',
  30,
  380,
  70,
  7,
  10,
  5,
  300,
  ARRAY['protein_powder', 'plant', 'vegan'],
  'template',
  true,
  true,
  true
),

-- Blend Protein Templates
(
  'Protein Blend',
  'Generic',
  'per100g',
  30,
  400,
  75,
  6,
  12,
  3,
  250,
  ARRAY['protein_powder', 'blend'],
  'template',
  true,
  true,
  true
)
ON CONFLICT DO NOTHING;

-- 2) Bind demo barcodes to templates (for testing)
-- Using placeholder barcodes (9000000000xxx)
DO $$
DECLARE
  whey_classic_id varchar;
  whey_lean_id varchar;
  whey_carb_id varchar;
  plant_id varchar;
  blend_id varchar;
BEGIN
  -- Get template IDs
  SELECT id INTO whey_classic_id FROM food_items WHERE name = 'Whey Protein (Classic)' AND source = 'template' LIMIT 1;
  SELECT id INTO whey_lean_id FROM food_items WHERE name = 'Whey Protein (Lean)' AND source = 'template' LIMIT 1;
  SELECT id INTO whey_carb_id FROM food_items WHERE name = 'Whey Protein (High-Carb)' AND source = 'template' LIMIT 1;
  SELECT id INTO plant_id FROM food_items WHERE name = 'Plant Protein (Pea/Soy)' AND source = 'template' LIMIT 1;
  SELECT id INTO blend_id FROM food_items WHERE name = 'Protein Blend' AND source = 'template' LIMIT 1;

  -- Bind demo barcodes (can be replaced with real ones later)
  IF whey_classic_id IS NOT NULL THEN
    INSERT INTO food_barcodes (gtin, food_id) VALUES
      ('9000000000001', whey_classic_id),
      ('9000000000011', whey_classic_id),  -- Demo brand A
      ('9000000000012', whey_classic_id)   -- Demo brand B
    ON CONFLICT (gtin) DO UPDATE SET food_id = EXCLUDED.food_id;
  END IF;

  IF whey_lean_id IS NOT NULL THEN
    INSERT INTO food_barcodes (gtin, food_id) VALUES
      ('9000000000002', whey_lean_id)
    ON CONFLICT (gtin) DO UPDATE SET food_id = EXCLUDED.food_id;
  END IF;

  IF whey_carb_id IS NOT NULL THEN
    INSERT INTO food_barcodes (gtin, food_id) VALUES
      ('9000000000003', whey_carb_id)
    ON CONFLICT (gtin) DO UPDATE SET food_id = EXCLUDED.food_id;
  END IF;

  IF plant_id IS NOT NULL THEN
    INSERT INTO food_barcodes (gtin, food_id) VALUES
      ('9000000000004', plant_id)
    ON CONFLICT (gtin) DO UPDATE SET food_id = EXCLUDED.food_id;
  END IF;

  IF blend_id IS NOT NULL THEN
    INSERT INTO food_barcodes (gtin, food_id) VALUES
      ('9000000000005', blend_id)
    ON CONFLICT (gtin) DO UPDATE SET food_id = EXCLUDED.food_id;
  END IF;
END $$;
