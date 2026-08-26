import { getCollection } from '../lib/mongodb';

/**
 * SkeletonService - Laravel SkeletonService equivalent
 * Handles token resolution, skeleton data, and token mapping
 */
class SkeletonService {
  // Token resolution cache (in production, use Redis or proper session)
  static tokenCache = new Map();
  static tokenMap = new Map();

  /**
   * Resolve token from database (simplified version of Laravel's resolveToken)
   * In Laravel, this looks up from session map, but we'll use database directly for Next.js
   * 
   * @param {string} generatedToken - Full token like 'central_skeleton_tokens_t'
   * @returns {Promise<object>} Token configuration
   */
  static async resolveToken(generatedToken) {
    try {
      // Parse token to get base token (remove action suffix)
      const parts = generatedToken.split('_');
      
      // Laravel expects at least 5 parts, we'll be flexible
      if (parts.length < 2) {
        throw new Error('Invalid token format');
      }

      // Last part is the action, rest is base token
      const action = parts[parts.length - 1];
      const baseToken = parts.slice(0, -1).join('_');

      console.log(`🔍 Resolving token: ${generatedToken} -> base: ${baseToken}, action: ${action}`);

      // Lookup token configuration from database
      const collection = await getCollection('skeleton_tokens');
      
      // Strategy 1: Try full token first (direct lookup)
      let tokenData = await collection.findOne({ key: generatedToken });
      
      if (tokenData) {
        console.log(`✅ Found full token: ${generatedToken}`);
      } else {
        // Strategy 2: Try base token (original logic)
        tokenData = await collection.findOne({ key: baseToken });
        
        if (tokenData) {
          console.log(`✅ Found base token: ${baseToken}`);
        } else {
          console.error(`❌ Token config not found for: ${generatedToken} (tried full token and base: ${baseToken})`);
          return { status: false, message: 'Token configuration not found' };
        }
      }

      // Return configuration matching Laravel's format
      const config = {
        status: true,
        key: tokenData.key,
        module: tokenData.module,
        system: tokenData.system,
        type: tokenData.type,
        table: tokenData.table,
        column: tokenData.column,
        value: tokenData.value,
        validate: tokenData.validate,
        act: tokenData.act,
        actions: tokenData.actions,
        // Action info from token
        for: action, // 't', 'a', 'as', etc.
        id: parts.length >= 6 ? parts[5] : null, // ID if present
        param: parts.length > 6 ? parts.slice(6).join('_') : null // Additional params
      };

      console.log(`✅ Token resolved:`, JSON.stringify({ 
        key: config.key, 
        module: config.module, 
        system: config.system,
        table: config.table,
        column: config.column,
        act: config.act
      }, null, 2));
      return config;

    } catch (error) {
      console.error('❌ Failed to resolve token:', error);
      return {
        status: false,
        message: error.message || 'Failed to resolve token'
      };
    }
  }

  /**
   * Get skeleton data (modules, sections, items, tokens)
   * Equivalent to Laravel's getSkeletonData
   * 
   * @param {boolean} isAuthenticated - Whether user is authenticated
   * @returns {Promise<object>} Skeleton data
   */
  static async getSkeletonData(isAuthenticated = true) {
    try {
      // Cache key
      const cacheKey = `skeleton_global_data_${isAuthenticated ? 'auth' : 'unauth'}`;
      
      // Check cache (in production, use Redis)
      if (this.tokenCache.has(cacheKey)) {
        return this.tokenCache.get(cacheKey);
      }

      // Fetch modules
      const modulesCollection = await getCollection('skeleton_modules');
      const modules = await modulesCollection.find({
        is_approved: true,
        deleted_at: null
      })
      .sort({ order: 1 })
      .project({
        id: 1,
        module_id: 1,
        name: 1,
        display: 1,
        system: 1,
        icon: 1,
        order: 1,
        is_navigable: 1
      })
      .toArray();

      // Fetch sections
      const sectionsCollection = await getCollection('skeleton_sections');
      const sections = await sectionsCollection.find({
        is_approved: true,
        deleted_at: null
      })
      .sort({ order: 1 })
      .project({
        id: 1,
        section_id: 1,
        module_id: 1,
        name: 1,
        display: 1,
        icon: 1,
        order: 1,
        is_navigable: 1
      })
      .toArray();

      // Fetch items
      const itemsCollection = await getCollection('skeleton_items');
      const items = await itemsCollection.find({
        is_approved: true,
        deleted_at: null
      })
      .sort({ order: 1 })
      .project({
        id: 1,
        item_id: 1,
        section_id: 1,
        name: 1,
        display: 1,
        icon: 1,
        order: 1,
        is_navigable: 1
      })
      .toArray();

      // Fetch tokens
      const tokensCollection = await getCollection('skeleton_tokens');
      const tokens = await tokensCollection.find({
        deleted_at: null
      })
      .project({
        id: 1,
        key: 1,
        module: 1,
        system: 1,
        type: 1,
        table: 1,
        column: 1,
        value: 1,
        validate: 1,
        act: 1,
        actions: 1
      })
      .toArray();

      const skeletonData = {
        modules: modules.map(m => ({
          module_id: m.module_id,
          name: m.name,
          display: m.display,
          system: m.system,
          icon: m.icon,
          order: m.order,
          is_navigable: m.is_navigable
        })),
        sections: sections.map(s => ({
          section_id: s.section_id,
          module_id: s.module_id,
          name: s.name,
          display: s.display,
          icon: s.icon,
          order: s.order,
          is_navigable: s.is_navigable
        })),
        items: items.map(i => ({
          item_id: i.item_id,
          section_id: i.section_id,
          name: i.name,
          display: i.display,
          icon: i.icon,
          order: i.order,
          is_navigable: i.is_navigable
        })),
        tokens: tokens.map(t => ({
          key: t.key,
          module: t.module,
          system: t.system,
          type: t.type,
          table: t.table,
          column: t.column,
          value: t.value,
          validate: t.validate,
          act: t.act,
          actions: t.actions
        }))
      };

      // Cache for 5 hours (matching Laravel)
      this.tokenCache.set(cacheKey, skeletonData);

      return skeletonData;

    } catch (error) {
      console.error('❌ Failed to get skeleton data:', error);
      return {
        modules: [],
        sections: [],
        items: [],
        tokens: []
      };
    }
  }

  /**
   * Clear skeleton cache
   */
  static clearCache() {
    this.tokenCache.clear();
    this.tokenMap.clear();
    console.log('🧹 Skeleton cache cleared');
  }

  /**
   * Get authenticated user system
   */
  static async getUserSystem(user) {
    try {
      if (!user || !user.business_id) {
        return 'central'; // Default system
      }

      const systemsCollection = await getCollection('systems');
      const systemData = await systemsCollection.findOne({
        business_id: user.business_id,
        is_active: true,
        deleted_at: null
      }, {
        projection: { system: 1 }
      });

      return systemData?.system || 'central';
    } catch (error) {
      console.error('Error getting user system:', error);
      return 'central';
    }
  }
}

export default SkeletonService;
