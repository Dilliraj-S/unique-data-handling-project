-- ============================================================================
-- Link Developer Mode Sections to Sidebar
-- ============================================================================
-- This script adds sections to the "Developer Mode" module
-- Making them appear automatically in the dynamic sidebar
-- 
-- Equivalent to Hello Kuppam's skeleton_sections table
-- ============================================================================

-- First, get the module_id for "Developer Mode" module
-- If it doesn't exist, you need to add it via the frontend first

-- Add sections under Developer Mode
INSERT INTO skeleton_sections (
  module_id,
  section,
  url,
  icon,
  `order`,
  is_system,
  is_navigable,
  is_approved,
  created_by,
  created_at,
  updated_at
) VALUES
  -- Token Management Section
  (
    (SELECT module_id FROM skeleton_modules WHERE module = 'developer' AND system = 'central' LIMIT 1),
    'Token Management',
    '/central/developer-mode/token-management',
    'cil-shield-alt',
    1,
    1,  -- is_system
    1,  -- is_navigable (shows in sidebar)
    1,  -- is_approved
    'SYSTEM',
    NOW(),
    NOW()
  ),
  
  -- Module Management Section
  (
    (SELECT module_id FROM skeleton_modules WHERE module = 'developer' AND system = 'central' LIMIT 1),
    'Module Management',
    '/central/developer-mode/module-management',
    'cil-apps',
    2,
    1,
    1,
    1,
    'SYSTEM',
    NOW(),
    NOW()
  ),
  
  -- Section Management Section
  (
    (SELECT module_id FROM skeleton_modules WHERE module = 'developer' AND system = 'central' LIMIT 1),
    'Section Management',
    '/central/developer-mode/section-management',
    'cil-list',
    3,
    1,
    1,
    1,
    'SYSTEM',
    NOW(),
    NOW()
  ),
  
  -- Permission Management Section
  (
    (SELECT module_id FROM skeleton_modules WHERE module = 'developer' AND system = 'central' LIMIT 1),
    'Permission Management',
    '/central/developer-mode/permission-management',
    'cil-lock-locked',
    4,
    1,
    1,
    1,
    'SYSTEM',
    NOW(),
    NOW()
  )
ON DUPLICATE KEY UPDATE
  url = VALUES(url),
  icon = VALUES(icon),
  `order` = VALUES(`order`),
  is_navigable = VALUES(is_navigable),
  is_approved = VALUES(is_approved),
  updated_at = NOW();

-- ============================================================================
-- Result: After running this SQL, your sidebar will show:
-- 
-- DEVELOPER MODE (CNavTitle)
--   🛡️ Token Management (CNavItem)
--   📦 Module Management (CNavItem)
--   📋 Section Management (CNavItem)
--   🔒 Permission Management (CNavItem)
-- 
-- Just like Hello Kuppam's Laravel sidebar!
-- ============================================================================

-- Verify the sections were added
SELECT 
  s.section_id,
  m.module AS module_name,
  s.section,
  s.url,
  s.icon,
  s.is_navigable,
  s.is_approved
FROM skeleton_sections s
JOIN skeleton_modules m ON s.module_id = m.module_id
WHERE m.module = 'developer' AND m.system = 'central'
ORDER BY s.order;

