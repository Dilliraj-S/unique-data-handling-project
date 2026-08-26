import { authMiddleware } from 'src/server/Http/Middleware/auth';
import NavigationService from 'src/services/NavigationService';

/**
 * Dynamic Navigation API
 * Generates sidebar navigation from skeleton_modules and skeleton_sections
 * Filtered by user's view permissions - only checked modules/sections are visible
 * Grouped by system (central, business, user)
 */
export default async function handler(req, res) {
  // Apply authentication
  try {
    req.user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get userId from authenticated user
    const userId = req.user.user_id || req.user.id;
    
    if (!userId) {
      return res.status(400).json({
        status: false,
        message: 'User ID is required'
      });
    }

    console.log(`🔄 Fetching permission-based navigation for user: ${userId}...`);

    // Check if permissions exist in database
    const { getCollection } = await import('src/lib/mongodb');
    const permissionsCollection = await getCollection('permissions');
    const totalPermissions = await permissionsCollection.countDocuments({ is_approved: true });
    const viewPermissions = await permissionsCollection.countDocuments({ 
      is_approved: true, 
      name: { $regex: /^view:/ } 
    });
    
    console.log(`📊 Database check: ${totalPermissions} total permissions, ${viewPermissions} view permissions`);
    
    if (viewPermissions === 0) {
      console.log('⚠️ No view permissions exist in database!');
      console.log('💡 Run: npm run db:generate-permissions');
    }

    // Get permission-filtered navigation using NavigationService
    const filteredModules = await NavigationService.getUserNavigation(userId);
    
    console.log(`📦 Found ${filteredModules.length} visible modules for user ${userId}`);
    
    if (filteredModules.length === 0) {
      console.log('⚠️ No modules visible for user. Possible reasons:');
      console.log('   1. User has no "view" permissions assigned in user_permissions collection');
      console.log('   2. No permissions exist in the database (run: npm run db:generate-permissions)');
      console.log('   3. User permissions are not active (is_active: false)');
      console.log('💡 Solution:');
      console.log('   - First, ensure permissions exist: npm run db:generate-permissions');
      console.log('   - Then, assign permissions: Go to Users page → Click Edit icon → Check desired permissions');
    }

    // Build navigation structure (compatible with CoreUI format)
    const navigation = [];

    // Dashboard (always first)
    navigation.push({
      component: 'CNavItem',
      name: 'Dashboard',
      to: '/dashboard',
      icon: 'cilSpeedometer',
      badge: {
        color: 'info',
        text: 'NEW',
      },
    });

    // Group filtered modules by system
    const groupedModules = filteredModules.reduce((acc, module) => {
      if (!acc[module.system]) {
        acc[module.system] = [];
      }
      acc[module.system].push(module);
      return acc;
    }, {});

    // Central System - Each module becomes a CNavTitle with sections as CNavItem
    if (groupedModules.central && groupedModules.central.length > 0) {
      groupedModules.central.forEach(module => {
        // Module name as TITLE (like "DEVELOPER MODE")
        const displayName = module.display || module.name;
        
        navigation.push({
          component: 'CNavTitle',
          name: displayName.toUpperCase(),  // Uppercase for title style
          className: 'nav-title'
        });
        
        // Add sections under this module as CNavItem (only visible sections)
        const moduleSections = module.sections || [];
        moduleSections.forEach(section => {
          const sectionDisplayName = section.display || section.name;
          
          navigation.push({
            component: 'CNavItem',
            name: sectionDisplayName,
            to: section.url || `/central/${module.name.toLowerCase().replace(/\s+/g, '-')}/${section.name.toLowerCase().replace(/\s+/g, '-')}`,
            icon: section.icon || 'cilFile'
          });
        });
      });
    }

    // Business System - Each module becomes a CNavTitle with sections as CNavItem
    if (groupedModules.business && groupedModules.business.length > 0) {
      groupedModules.business.forEach(module => {
        const displayName = module.display || module.name;
        
        navigation.push({
          component: 'CNavTitle',
          name: displayName.toUpperCase(),
          className: 'nav-title'
        });
        
        // Add sections under this module as CNavItem (only visible sections)
        const moduleSections = module.sections || [];
        moduleSections.forEach(section => {
          const sectionDisplayName = section.display || section.name;
          
          navigation.push({
            component: 'CNavItem',
            name: sectionDisplayName,
            to: section.url || `/business/${module.name.toLowerCase().replace(/\s+/g, '-')}/${section.name.toLowerCase().replace(/\s+/g, '-')}`,
            icon: section.icon || 'cilFile'
          });
        });
      });
    }

    // User System - Each module becomes a CNavTitle with sections as CNavItem
    if (groupedModules.user && groupedModules.user.length > 0) {
      groupedModules.user.forEach(module => {
        const displayName = module.display || module.name;
        
        navigation.push({
          component: 'CNavTitle',
          name: displayName.toUpperCase(),
          className: 'nav-title'
        });
        
        // Add sections under this module as CNavItem (only visible sections)
        const moduleSections = module.sections || [];
        moduleSections.forEach(section => {
          const sectionDisplayName = section.display || section.name;
          
          navigation.push({
            component: 'CNavItem',
            name: sectionDisplayName,
            to: section.url || `/user/${module.name.toLowerCase().replace(/\s+/g, '-')}/${section.name.toLowerCase().replace(/\s+/g, '-')}`,
            icon: section.icon || 'cilFile'
          });
        });
      });
    }

    console.log(`✅ Generated ${navigation.length} permission-filtered navigation items`);

    return res.status(200).json({
      status: true,
      data: navigation,
      modules: groupedModules,
      message: 'Navigation generated successfully'
    });

  } catch (error) {
    console.error('Navigation error:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to generate navigation',
      error: error.message
    });
  }
}
