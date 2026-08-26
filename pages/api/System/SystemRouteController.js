import SkeletonService from '../../../src/services/SkeletonService';
import { getController } from './ControllerRegistry';

const BASE_PATH = './'; // Relative from pages/api/System/
const TOKEN_LENGTH = 27; // Laravel default

/**
 * SystemRouteController - Laravel SystemRouteController equivalent
 * Routes requests to appropriate controllers based on tokens
 */
export default class SystemRouteController {
  /**
   * Dispatch request to appropriate controller
   * @param {Request} req - Next.js request object
   * @param {Response} res - Next.js response object
   * @returns {Promise<Response>}
   */
  static async dispatch(req, res) {
    try {
      console.log('🎯 SystemRouteController::dispatch()');

      // Token is already extracted and set in req.params.token by [token].js handler
      const token = req.params?.token || req.query?.token || '';
      
      // Extract segments from URL (for non-token routes)
      const urlSegments = req.url.split('/').filter(Boolean);
      console.log('📋 URL segments:', urlSegments);

      // Extract module, section, item from segments (for non-token routes)
      const module = urlSegments[0] || 'Dashboard';
      const section = urlSegments[1] || null;
      const item = urlSegments[2] || null;

      // For redirect tokens (legacy routes)
      const redirectToken = (urlSegments[0] === 't' && urlSegments[1]) ? urlSegments : [];

      console.log('📋 Extracted:', { module, section, item, token, hasToken: !!token });

      // If token-based route, resolve controller for token
      if (token) {
        // Extract system from token (first part before first underscore)
        // Token format: {system}_{module}_{resource}_{action}
        // Examples: central_skeleton_tokens_t, business_users_table_t, user_profile_settings_t
        const tokenParts = token.split('_');
        const extractedSystem = tokenParts.length > 0 ? tokenParts[0] : 'central';
        const system = extractedSystem || 'central'; // Fallback to 'central' if extraction fails
        
        console.log('🔍 System extracted from token:', { token, extractedSystem, system });
        
        // Module will be extracted from token data in resolveController
        const controllerInfo = await this.resolveController(req, system, module, token, redirectToken);
        
        if (!controllerInfo) {
          return res.status(404).json({
            status: false,
            message: 'Controller not found for token'
          });
        }

        const { controllerClass, method, systemName, moduleName, controllerName, isActionController } = controllerInfo;

        console.log('📦 Loading controller:', { 
          controllerClass, 
          method, 
          systemName, 
          moduleName, 
          controllerName,
          isActionController 
        });

        // Load controller using static imports (webpack-analyable)
        const controllerModule = await SystemRouteController.loadController(
          systemName, 
          moduleName, 
          controllerName, 
          isActionController
        );

        if (!controllerModule || !controllerModule.default) {
          console.error('❌ Controller module not found:', controllerClass);
          return res.status(404).json({
            status: false,
            message: `Controller not found: ${controllerClass}`
          });
        }

        const controllerInstance = new controllerModule.default();
        
        // Check if method exists
        if (typeof controllerInstance[method] !== 'function') {
          console.error(`❌ Method '${method}' not found on controller ${controllerName}`);
          console.error(`Available methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(controllerInstance)));
          return res.status(404).json({
            status: false,
            message: `Method '${method}' not found on controller ${controllerName}`
          });
        }
        
        console.log(`✅ Controller loaded, calling method: ${method}`);
        
        return await controllerInstance[method](req, res);

      } else if (redirectToken.length > 0) {
        // Handle redirect token routes
        const moduleName = this.toCamelCase(redirectToken[1]);
        const system = 'Central'; // Default to Central
        
        console.log(`📦 Loading TokenCtrl for redirect: ${system}/${moduleName}`);
        
        const ControllerClass = getController(system, moduleName, 'TokenCtrl', false);
        
        if (!ControllerClass) {
          console.warn(`⚠️ TokenCtrl not found for ${system}/${moduleName}, falling back to NavCtrl`);
          const NavControllerClass = getController(system, moduleName, 'NavCtrl', false);
          if (!NavControllerClass) {
            return res.status(404).json({
              status: false,
              message: `Controller not found: ${system}/${moduleName}/TokenCtrl or NavCtrl`
            });
          }
          const navInstance = new NavControllerClass();
          return await navInstance.index(req, res);
        }
        
        const controllerInstance = new ControllerClass();
        return await controllerInstance.index(req, res);

      } else {
        // Handle normal NavCtrl routes
        const moduleName = this.toCamelCase(module);
        const system = 'Central'; // Default to Central
        
        console.log(`📦 Loading NavCtrl for module: ${system}/${moduleName}`);
        
        const ControllerClass = getController(system, moduleName, 'NavCtrl', false);
        
        if (!ControllerClass) {
          return res.status(404).json({
            status: false,
            message: `Controller not found: ${system}/${moduleName}/NavCtrl`
          });
        }
        
        const controllerInstance = new ControllerClass();
        return await controllerInstance.index(req, res);
      }

    } catch (error) {
      console.error('❌ SystemRouteController error:', error);
      return res.status(500).json({
        status: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Resolve controller for token-based routes
   * Equivalent to Laravel's resolveController method
   * @param {Request} req 
   * @param {string} system 
   * @param {string} module 
   * @param {string} token 
   * @param {array} redirectToken 
   * @returns {Promise<object|null>}
   */
  static async resolveController(req, system, module, token, redirectToken) {
    if (token) {
      // Resolve token configuration
      const config = await SkeletonService.resolveToken(token);
      
      if (!config || !config.status || !config.key) {
        console.error('❌ Invalid token config:', config);
        return null;
      }

      // Use config directly from database (it already has module and system)
      // Fallback to skeleton data lookup only if module is missing
      let moduleName = config.module;
      let resolvedSystem = config.system;
      
      if (!moduleName || !resolvedSystem) {
        // Only lookup in skeleton data if config doesn't have module/system
        const skeletonData = await SkeletonService.getSkeletonData(req.user ? true : false);
        const tokenData = skeletonData.tokens.find(t => t.key === config.key);
        
        if (tokenData) {
          moduleName = moduleName || tokenData.module;
          resolvedSystem = resolvedSystem || tokenData.system;
        }
      }
      
      // Final fallbacks
      moduleName = moduleName || module || 'Dashboard';
      resolvedSystem = resolvedSystem || system || 'central';
      
      // Convert to camelCase for controller path
      const moduleNameCamel = this.toCamelCase(moduleName);
      const systemName = this.toCamelCase(resolvedSystem);
      
      console.log('🔍 System resolution:', { 
        fromToken: system, 
        fromConfig: config.system, 
        fromModule: config.module,
        resolved: resolvedSystem,
        resolvedModule: moduleName,
        systemName,
        moduleNameCamel
      });

      // Build action controller info
      const actionInfo = this.buildActionControllerName(token);

      if (!actionInfo || actionInfo.length < 3) {
        console.error('❌ Invalid action info for token:', token);
        return null;
      }

      const [actionType, controllerName, methodName] = actionInfo;

      // Determine if this is an Actions controller or module controller
      const isActionController = ['d', 'ds', 'db', 'dbs', 's', 'u'].includes(actionType);
      
      const controllerClass = isActionController
        ? `${BASE_PATH}Actions/${controllerName}`
        : `${BASE_PATH}${systemName}/${moduleNameCamel}/${controllerName}`;

      console.log('📍 Controller resolved:', { 
        controllerClass, 
        methodName, 
        actionType,
        systemName,
        moduleName: moduleNameCamel,
        controllerName,
        isActionController
      });
      
      return { 
        controllerClass, 
        method: methodName, 
        action: actionType,
        systemName,
        moduleName: moduleNameCamel,
        controllerName,
        isActionController,
        // Pass through config for use in controllers
        tokenConfig: config
      };

      } else if (redirectToken.length > 0) {
        const moduleName = this.toCamelCase(redirectToken[1]);
        // Return controller info for registry lookup
        return { 
          controllerClass: null, // Not used, ControllerRegistry resolves it
          method: 'index', 
          action: null,
          systemName: 'Central',
          moduleName: moduleName,
          controllerName: 'TokenCtrl',
          isActionController: false
        };

      } else {
        const moduleName = this.toCamelCase(module);
        // Return controller info for registry lookup
        return { 
          controllerClass: null, // Not used, ControllerRegistry resolves it
          method: 'index', 
          action: null,
          systemName: 'Central',
          moduleName: moduleName,
          controllerName: 'NavCtrl',
          isActionController: false
        };
      }
  }

  /**
   * Build action controller name from token
   * Equivalent to Laravel's buildActionControllerName
   * @param {string} token - Full token like 'central_skeleton_tokens_t'
   * @returns {array|null} Action info [actionType, controllerName, methodName]
   */
  static buildActionControllerName(token) {
    const parts = token.split('_');
    
    // Token format: {system}_{module}_{resource}_{action} or variations
    // Minimum requirement: at least 2 parts (system + action)
    // Examples:
    // - central_skeleton_tokens_t (4 parts) ✅
    // - business_users_table_t (4 parts) ✅
    // - central_module_section_item_t (5 parts) ✅
    if (parts.length < 2) {
      console.warn('⚠️ Token has less than 2 parts:', token);
      return null;
    }

    const actionMap = {
      // Add
      'a': ['a', 'ShowAddCtrl', 'index'],
      'as': ['as', 'SaveAddCtrl', 'index'],
      // Edit
      'e': ['e', 'ShowEditCtrl', 'index'],
      'es': ['es', 'SaveEditCtrl', 'index'],
      'eb': ['eb', 'ShowEditCtrl', 'bulk'],
      'ebs': ['ebs', 'SaveEditCtrl', 'bulk'],
      // Delete
      'd': ['d', 'Delete', 'single'],
      'ds': ['ds', 'Delete', 'delete_single'],
      'db': ['db', 'Delete', 'bulk'],
      'dbs': ['dbs', 'Delete', 'delete_bulk'],
      // Form
      'f': ['f', 'FormCtrl', 'index'],
      // Display/View
      'c': ['c', 'CardCtrl', 'index'],
      't': ['t', 'TableCtrl', 'index'],
      'v': ['v', 'ViewCtrl', 'index'],
      // Custom actions
      'custom': ['custom', 'CustomCtrl', 'index'],
      // Utility
      's': ['s', 'Select', 'index'],
      'u': ['u', 'Unique', 'index'],
    };

    // Always use the last part as the action (most flexible approach)
    // This works for tokens with any number of parts >= 2
    const action = parts[parts.length - 1];
    
    console.log(`🔍 Parsing token action: ${token} → action: ${action}, parts: ${parts.length}`);

    const actionInfo = actionMap[action];
    if (!actionInfo) {
      console.warn(`⚠️ Unknown action: ${action} in token: ${token}`);
      return null;
    }

    return actionInfo;
  }

  /**
   * Convert dashed string to camel case
   * Equivalent to Laravel's toCamelCase
   * @param {string} input - Input string
   * @returns {string} PascalCase string (preserves existing PascalCase)
   */
  static toCamelCase(input) {
    if (!input || input === 'Dashboard') {
      return 'Dashboard';
    }
    
    // If already PascalCase (starts with uppercase and has mixed case), preserve it
    if (input.charAt(0) === input.charAt(0).toUpperCase() && 
        input.length > 1 && 
        input !== input.toLowerCase() && 
        input !== input.toUpperCase()) {
      // Check if it's already PascalCase format (e.g., "QueryChain", "UserManagement")
      const hasInternalUppercase = /[a-z][A-Z]/.test(input);
      if (hasInternalUppercase) {
        return input; // Already PascalCase, return as-is
      }
    }
    
    // Otherwise, convert to PascalCase
      return input
      .split(/[\s_-]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
  }

  /**
   * Load controller dynamically using ControllerRegistry
   * Scalable approach - no hardcoded switch statements
   * Equivalent to Laravel's app($controllerClass) but webpack-friendly
   * 
   * @param {string} system - System name (Central, Business, User)
   * @param {string} module - Module name (Developer, Dashboard, etc.)
   * @param {string} controllerName - Controller name (TableCtrl, ShowAddCtrl, etc.)
   * @param {boolean} isActionController - Whether this is an Actions controller
   * @returns {Promise<object>} Controller module with default export
   */
  static async loadController(system, module, controllerName, isActionController = false) {
    try {
      console.log(`📦 loadController: ${system}/${module}/${controllerName} (isAction: ${isActionController})`);

      // Get controller class from registry (similar to Laravel's class_exists check)
      const ControllerClass = getController(system, module, controllerName, isActionController);
      
      if (!ControllerClass) {
        throw new Error(`Controller not found: ${system}/${module}/${controllerName}`);
      }

      // Return as module-like object with default export (compatible with existing code)
      // This mimics the structure returned by dynamic imports
      return {
        default: ControllerClass
      };

    } catch (error) {
      console.error(`❌ Failed to load controller: ${system}/${module}/${controllerName}`, error);
      throw error;
    }
  }
}

