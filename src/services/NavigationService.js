import { getCollection } from '../lib/mongodb';
import PermissionService from './PermissionService';

/**
 * NavigationService - Handles navigation filtering based on user permissions
 * Only modules/sections/items with 'view' permission are visible to users
 */
class NavigationService {
  /**
   * Get user's visible navigation based on permissions
   * Only modules/sections/items with 'view' permission are included
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Filtered navigation structure
   */
  static async getUserNavigation(userId) {
    try {
      console.log(`🔍 Getting navigation for user: ${userId}`);
      
      // 1. Get user's view permissions
      const viewPermissions = await PermissionService.getUserViewPermissions(userId);
      
      console.log(`📋 User has ${viewPermissions.size} view permissions:`, Array.from(viewPermissions));

      if (viewPermissions.size === 0) {
        console.log('⚠️ User has no view permissions assigned.');
        console.log('💡 To fix: Assign "view" permissions to this user via the "Edit User Permissions" modal.');
        console.log('💡 Or run the permission generation script: npm run db:generate-permissions');
        return [];
      }

      // 2. Get modules, sections, items
      const modulesCollection = await getCollection('skeleton_modules');
      const sectionsCollection = await getCollection('skeleton_sections');
      const itemsCollection = await getCollection('skeleton_items');

      const allModules = await modulesCollection.find({
        is_approved: true,
        is_navigable: true,
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      }).sort({ order: 1 }).toArray();

      const allSections = await sectionsCollection.find({
        is_approved: true,
        is_navigable: true,
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      }).sort({ order: 1 }).toArray();

      const allItems = await itemsCollection.find({
        is_approved: true,
        is_navigable: true,
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      }).sort({ order: 1 }).toArray();

      // 3. Build filtered navigation
      const navigation = [];

      for (const module of allModules) {
        const moduleName = module.name;
        const moduleViewPerm = `view:${moduleName}`;
        
        // Check if user has view permission for this module (must be explicitly checked)
        const hasModuleView = viewPermissions.has(moduleViewPerm);
        
        // Get sections for this module
        const moduleSections = allSections.filter(s => s.module_id === module.module_id);
        
        // Check if user has view permission for any section/item in this module
        let hasAnySectionView = false;
        const visibleSections = [];
        
        for (const section of moduleSections) {
          const sectionName = section.name;
          const sectionViewPerm = `view:${moduleName}::${sectionName}`;
          
          // IMPORTANT: Section visibility logic (based on user requirement):
          // - Only CHECKED permissions should be visible
          // - If module checkbox is checked → module is visible, and all sections are visible (unless section is explicitly unchecked)
          // - If module checkbox is unchecked → hide entire module (all sections hidden)
          // - If section checkbox is unchecked → hide that section (even if module is checked)
          // Logic: Section is visible if:
          //   1. Module-level view is checked (grants access to all sections), OR
          //   2. Section-level view is explicitly checked (standalone section)
          // But if module is unchecked, all sections are hidden
          const hasSectionView = hasModuleView || viewPermissions.has(sectionViewPerm);
          
          // Get items for this section
          const sectionItems = allItems.filter(i => i.section_id === section.section_id);
          
          // Check if user has view permission for any item in this section
          let hasAnyItemView = false;
          const visibleItems = [];
          
          for (const item of sectionItems) {
            const itemName = item.name;
            const itemViewPerm = `view:${moduleName}::${sectionName}::${itemName}`;
            
            // Item is visible if:
            // 1. Module-level view is checked, OR
            // 2. Section-level view is checked, OR
            // 3. Item-level view is explicitly checked
            const hasItemView = hasModuleView || hasSectionView || viewPermissions.has(itemViewPerm);
            
            if (hasItemView) {
              hasAnyItemView = true;
              visibleItems.push({
                item_id: item.item_id,
                name: item.name,
                display: item.display || item.name,
                icon: item.icon,
                order: item.order,
                url: item.url || `/${module.system}/${moduleName}/${sectionName}/${itemName}`
              });
            }
          }
          
          // Include section if:
          // 1. User has module-level view (checked), OR
          // 2. User has section-level view (checked), OR
          // 3. User has view for any item in this section
          if (hasModuleView || hasSectionView || hasAnyItemView) {
            hasAnySectionView = true;
            visibleSections.push({
              section_id: section.section_id,
              name: section.name,
              display: section.display || section.name,
              icon: section.icon,
              order: section.order,
              url: section.url || `/${module.system}/${moduleName}/${sectionName}`,
              items: visibleItems.sort((a, b) => a.order - b.order)
            });
          }
        }
        
        // Include module ONLY if:
        // 1. User has module-level view (checked), OR
        // 2. User has view for any section/item in this module
        // If module checkbox is unchecked, hide entire module
        if (hasModuleView || hasAnySectionView) {
          navigation.push({
            module_id: module.module_id,
            name: module.name,
            display: module.display || module.name,
            icon: module.icon,
            order: module.order,
            system: module.system,
            url: module.url || `/${module.system}/${moduleName}`,
            sections: visibleSections.sort((a, b) => a.order - b.order)
          });
        }
      }

      return navigation.sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error('❌ Error getting user navigation:', error);
      return [];
    }
  }

  /**
   * Check if user has view permission for a specific module/section/item
   * 
   * @param {string} userId - User ID
   * @param {string} moduleName - Module name
   * @param {string} sectionName - Section name (optional)
   * @param {string} itemName - Item name (optional)
   * @returns {Promise<boolean>} True if user has view permission
   */
  static async hasViewPermission(userId, moduleName, sectionName = null, itemName = null) {
    try {
      const viewPermissions = await PermissionService.getUserViewPermissions(userId);

      if (itemName && sectionName) {
        // Item-level check
        const itemPerm = `view:${moduleName}::${sectionName}::${itemName}`;
        if (viewPermissions.has(itemPerm)) return true;
      }

      if (sectionName) {
        // Section-level check
        const sectionPerm = `view:${moduleName}::${sectionName}`;
        if (viewPermissions.has(sectionPerm)) return true;
      }

      // Module-level check
      const modulePerm = `view:${moduleName}`;
      if (viewPermissions.has(modulePerm)) return true;

      return false;
    } catch (error) {
      console.error('❌ Error checking view permission:', error);
      return false;
    }
  }
}

export default NavigationService;

