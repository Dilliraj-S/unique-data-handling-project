-- ============================================================
-- Add Modules to Sidebar Navigation
-- This makes modules appear in the dynamic sidebar
-- ============================================================

-- First, check existing modules
SELECT id, module_id, name, display, system, is_approved, is_navigable
FROM skeleton_modules
ORDER BY system, `order`;

-- ============================================================
-- Add "Modules" module to appear in sidebar
-- ============================================================

INSERT INTO skeleton_modules (
  module_id,
  name,
  display,
  system,
  icon,
  `order`,
  is_approved,
  is_navigable,
  created_by,
  updated_by,
  created_at,
  updated_at
) VALUES (
  'MOD_MODULES',              -- Unique module ID
  'modules',                  -- Module name (lowercase, no spaces)
  'Modules',                  -- Display name (shows in sidebar)
  'central',                  -- System: central (developer section)
  'cilApps',                  -- Icon (CoreUI icon name)
  20,                         -- Order (shows after tokens)
  1,                          -- Is approved (1 = yes, visible)
  1,                          -- Is navigable (1 = yes, shows in sidebar)
  'SYSTEM',                   -- Created by
  'SYSTEM',                   -- Updated by
  NOW(),                      -- Created at
  NOW()                       -- Updated at
)
ON DUPLICATE KEY UPDATE
  updated_at = NOW();

-- ============================================================
-- Add other developer modules
-- ============================================================

-- Tokens module (if not exists)
INSERT INTO skeleton_modules (
  module_id,
  name,
  display,
  system,
  icon,
  `order`,
  is_approved,
  is_navigable,
  created_by,
  updated_by,
  created_at,
  updated_at
) VALUES (
  'MOD_TOKENS',
  'tokens',
  'Tokens',
  'central',
  'cilShieldAlt',
  10,
  1,
  1,
  'SYSTEM',
  'SYSTEM',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  updated_at = NOW();

-- ============================================================
-- Verify inserts
-- ============================================================

SELECT 
  module_id,
  name,
  display,
  system,
  icon,
  `order`,
  is_approved,
  is_navigable
FROM skeleton_modules
WHERE system = 'central'
ORDER BY `order`;

-- ============================================================
-- Expected result:
-- module_id    | name    | display | system  | icon          | order | is_approved | is_navigable
-- -------------|---------|---------|---------|---------------|-------|-------------|-------------
-- MOD_TOKENS   | tokens  | Tokens  | central | cilShieldAlt  | 10    | 1           | 1
-- MOD_MODULES  | modules | Modules | central | cilApps       | 20    | 1           | 1
-- ============================================================

