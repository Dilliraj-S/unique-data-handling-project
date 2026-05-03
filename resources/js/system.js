/**
 * System initialization file for setting up global modules and configurations.
 */
import './general/index';

import Skeleton from './system/skeleton/index';
import Unique from './system/Unique';
import './system/theme/js/dropdown-hover';
import './system/theme/js/helpers';
import './system/theme/config.js';
import './system/theme/js/menu';
import './system/theme/js/template-customizer';
import './system/theme/main.js';
import './system/broadcast/index.js';


document.addEventListener('DOMContentLoaded', () => {
  if (!window.general) {
    console.log('System initialized, but General class not loaded yet');
    return;
  }
  window.general.log('System initialized with Skeleton and General modules');
});