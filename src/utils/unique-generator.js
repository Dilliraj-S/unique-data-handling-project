/**
 * Unique ID Generator
 * Generates unique IDs with prefixes
 */

/**
 * Generate a unique ID
 * @param {string} prefix - Prefix for the ID (e.g., 'MOD', 'SEC')
 * @param {number} length - Length of numeric part
 * @returns {string} Unique ID
 */
export function generateUniqueId(prefix, length = 4) {
  const randomNum = Math.floor(Math.random() * Math.pow(10, length));
  return `${prefix}${randomNum.toString().padStart(length, '0')}`;
}

