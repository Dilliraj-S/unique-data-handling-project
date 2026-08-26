/**
 * ControllerRegistry - Scalable Controller Registry
 * Mimics Laravel's dynamic class resolution but webpack-friendly
 * 
 * How it works:
 * 1. All controllers are imported at top level (webpack can analyze)
 * 2. Registry maps `${system}/${module}/${controllerName}` to controller class
 * 3. Dynamic resolution uses registry instead of dynamic imports
 * 
 * This scales to 15+ modules without hardcoding switch statements
 */

// Import all Central system modules
import DeveloperControllers from './Central/Developer';
import DashboardControllers from './Central/Dashboard';
import QuerynestControllers from './Central/querynest';
import FiltersControllers from './Central/filters';
import EmailsystemControllers from './Central/emailsystem';
import AutomationsControllers from './Central/automations';


// Import all Actions controllers
import ActionControllers from './Actions';

/**
 * Central System Module Registry
 * Maps module names to their controller exports
 */
const CentralModules = {
  Developer: DeveloperControllers,
  Dashboard: DashboardControllers,
  querynest: QuerynestControllers,
  Querynest: QuerynestControllers, // Support both cases
  filters: FiltersControllers,
  Filters: FiltersControllers,
  emailsystem: EmailsystemControllers,
  Emailsystem: EmailsystemControllers, // Support both cases
  automations: AutomationsControllers,
  Automations: AutomationsControllers, // Support both cases
  // Add more modules here as they're created:
  // UserManagement: UserManagementControllers,
  // Ticket: TicketControllers,
  // etc.
};

/**
 * System Registry
 * Maps system names to their module registries
 */
const SystemRegistry = {
  Central: CentralModules,
  // Future systems:
  // Business: BusinessModules,
  // User: UserModules,
};

/**
 * Get controller class dynamically
 * Equivalent to Laravel's app($controllerClass)
 * 
 * @param {string} system - System name (Central, Business, User)
 * @param {string} module - Module name (Developer, Dashboard, etc.)
 * @param {string} controllerName - Controller name (TableCtrl, ShowAddCtrl, etc.)
 * @param {boolean} isActionController - Whether this is an Actions controller
 * @returns {class|null} Controller class or null if not found
 */
export function getController(system, module, controllerName, isActionController = false) {
  try {
    // Action controllers are shared across all systems
    if (isActionController) {
      const controller = ActionControllers[controllerName];
      if (!controller) {
        console.error(`❌ Action controller not found: ${controllerName}`);
        return null;
      }
      return controller;
    }

    // Module controllers are system-specific
    const systemModules = SystemRegistry[system];
    if (!systemModules) {
      console.error(`❌ System not found: ${system}`);
      return null;
    }

    const moduleControllers = systemModules[module];
    if (!moduleControllers) {
      console.error(`❌ Module not found: ${system}/${module}`);
      return null;
    }

    const controller = moduleControllers[controllerName];
    if (!controller) {
      console.error(`❌ Controller not found: ${system}/${module}/${controllerName}`);
      return null;
    }

    return controller;
  } catch (error) {
    console.error(`❌ Error getting controller: ${system}/${module}/${controllerName}`, error);
    return null;
  }
}

/**
 * Check if controller exists
 * Equivalent to Laravel's class_exists()
 * 
 * @param {string} system - System name
 * @param {string} module - Module name
 * @param {string} controllerName - Controller name
 * @param {boolean} isActionController - Whether this is an Actions controller
 * @returns {boolean}
 */
export function controllerExists(system, module, controllerName, isActionController = false) {
  return getController(system, module, controllerName, isActionController) !== null;
}

/**
 * Check if controller method exists
 * Equivalent to Laravel's method_exists()
 * 
 * @param {class} ControllerClass - Controller class
 * @param {string} methodName - Method name
 * @returns {boolean}
 */
export function methodExists(ControllerClass, methodName) {
  if (!ControllerClass || typeof ControllerClass !== 'function') {
    return false;
  }
  
  // Check if method exists in prototype
  return typeof ControllerClass.prototype[methodName] === 'function';
}

export default {
  getController,
  controllerExists,
  methodExists,
};

