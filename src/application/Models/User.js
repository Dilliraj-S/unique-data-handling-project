/**
 * User Model
 * Defines the User data structure and methods
 */
class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.email = data.email || '';
    this.roles = data.roles || [];
    this.permissions = data.permissions || [];
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  /**
   * Check if user has role
   * @param {string} role - Role name
   * @returns {boolean}
   */
  hasRole(role) {
    return this.roles.includes(role);
  }

  /**
   * Check if user has permission
   * @param {string} permission - Permission name
   * @returns {boolean}
   */
  hasPermission(permission) {
    return this.permissions.includes(permission);
  }

  /**
   * Check if user has any of the given roles
   * @param {array} roles - Array of role names
   * @returns {boolean}
   */
  hasAnyRole(roles) {
    return roles.some(role => this.hasRole(role));
  }

  /**
   * Check if user has all of the given roles
   * @param {array} roles - Array of role names
   * @returns {boolean}
   */
  hasAllRoles(roles) {
    return roles.every(role => this.hasRole(role));
  }

  /**
   * Check if user has any of the given permissions
   * @param {array} permissions - Array of permission names
   * @returns {boolean}
   */
  hasAnyPermission(permissions) {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if user has all of the given permissions
   * @param {array} permissions - Array of permission names
   * @returns {boolean}
   */
  hasAllPermissions(permissions) {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Get user's full name
   * @returns {string}
   */
  getFullName() {
    return this.name;
  }

  /**
   * Get user's initials
   * @returns {string}
   */
  getInitials() {
    const names = this.name.split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
  }

  /**
   * Convert to plain object
   * @returns {object}
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      roles: this.roles,
      permissions: this.permissions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create User instance from API response
   * @param {object} data - API response data
   * @returns {User}
   */
  static fromApiResponse(data) {
    return new User(data);
  }
}

export default User;

