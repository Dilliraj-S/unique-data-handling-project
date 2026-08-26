/**
 * Actions - Barrel Export
 * Exports shared action controllers used across all systems
 */

import Delete from './Delete';

// Placeholder for future action controllers
// import Select from './Select';
// import Unique from './Unique';

/**
 * Action Controllers Registry
 * Maps controller names to their classes for dynamic access
 */
export const ActionControllers = {
  Delete,
  // Select,
  // Unique,
};

// Default export for backward compatibility
export default ActionControllers;

