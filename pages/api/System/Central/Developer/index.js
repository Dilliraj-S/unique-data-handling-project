/**
 * Developer Module - Barrel Export
 * Exports all controllers for this module
 * This allows webpack to analyze all imports while enabling dynamic access
 */

// Import all Developer controllers
import TableCtrl from './TableCtrl';
import ShowAddCtrl from './ShowAddCtrl';
import SaveAddCtrl from './SaveAddCtrl';
import ShowEditCtrl from './ShowEditCtrl';
import SaveEditCtrl from './SaveEditCtrl';
import ViewCtrl from './ViewCtrl';
import CardCtrl from './CardCtrl';
import FormCtrl from './FormCtrl';
import NavCtrl from './NavCtrl';
import CustomCtrl from './CustomCtrl';

/**
 * Developer Module Controllers Registry
 * Maps controller names to their classes for dynamic access
 */
export const DeveloperControllers = {
  TableCtrl,
  ShowAddCtrl,
  SaveAddCtrl,
  ShowEditCtrl,
  SaveEditCtrl,
  ViewCtrl,
  CardCtrl,
  FormCtrl,
  NavCtrl,
  CustomCtrl,
};

// Default export for backward compatibility
export default DeveloperControllers;

