import React, { useState, useEffect } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CFormCheck,
  CAlert,
  CSpinner
} from '@coreui/react';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';

/**
 * UserPermissionsModal - Modal for editing user permissions
 * Based on Hello Kuppam's permission system structure
 */
const UserPermissionsModal = ({ show, onClose, onSave, user }) => {
  const [permissions, setPermissions] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const permissionTypes = ['create', 'view', 'edit', 'delete', 'import', 'export'];

  // Helper to get axios with auth headers
  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  // Fetch permissions structure and user's existing permissions
  useEffect(() => {
    if (show && user) {
      fetchPermissions();
    }
  }, [show, user]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const authAxios = getAuthAxios();
      
      // Fetch permissions structure
      const permissionsResponse = await authAxios.get(`/api/skeleton-action/central_skeleton_user_permissions_e?id=${user._id || user.id}`);
      
      if (permissionsResponse.data.status && permissionsResponse.data.data) {
        const permissionsData = permissionsResponse.data.data;
        setPermissions(permissionsData.viewPermissions || {});
        
        // Initialize selected permissions from existing user permissions
        const existingPerms = new Set();
        if (permissionsData.existingPermissions) {
          permissionsData.existingPermissions.forEach(permId => {
            existingPerms.add(permId);
          });
        }
        setSelectedPermissions(existingPerms);
      } else {
        setError('Failed to load permissions structure');
      }
    } catch (err) {
      console.error('❌ Error fetching permissions:', err);
      setError(err.response?.data?.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  // Handle checkbox change
  const handlePermissionToggle = (permissionId, checked) => {
    console.log('🔄 Toggling permission:', permissionId, checked);
    setSelectedPermissions(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(permissionId);
      } else {
        newSelected.delete(permissionId);
      }
      console.log('✅ Updated permissions:', Array.from(newSelected));
      return newSelected;
    });
  };

  // Helper to collect all permission IDs from a target (module/section/item) and its children
  const collectPermissionIds = (module, section, item) => {
    const permIds = new Set();
    
    if (!permissions || !permissions[module]) {
      console.log('⚠️ No permissions found for module:', module);
      return permIds;
    }

    console.log('🔍 Collecting permissions for:', { module, section, item });
    console.log('📦 Permissions structure:', permissions[module]);

    // If selecting module, include all its sections and items
    if (!section && !item) {
      // Module level permissions
      const moduleTarget = permissions[module];
      if (moduleTarget?.permissions) {
        permissionTypes.forEach(permType => {
          if (moduleTarget.permissions[permType]) {
            Object.keys(moduleTarget.permissions[permType]).forEach(permId => {
              permIds.add(permId);
              console.log('✅ Added module-level permission:', permId, 'type:', permType);
            });
          }
        });
      }
      
      // All section-level permissions in this module
      Object.entries(permissions[module]).forEach(([key, value]) => {
        // Skip 'permissions' key and only process section objects
        if (key === 'permissions' || typeof value !== 'object' || !value) return;
        
        // Check if this is a section (has permissions property)
        if (value?.permissions) {
          permissionTypes.forEach(permType => {
            if (value.permissions[permType]) {
              Object.keys(value.permissions[permType]).forEach(permId => {
                permIds.add(permId);
                console.log('✅ Added section-level permission:', permId, 'section:', key, 'type:', permType);
              });
            }
          });
        }
        
        // Check for item-level permissions within this section
        Object.entries(value).forEach(([itemKey, itemValue]) => {
          if (itemKey === 'permissions' || typeof itemValue !== 'object' || !itemValue) return;
          
          if (itemValue?.permissions) {
            permissionTypes.forEach(permType => {
              if (itemValue.permissions[permType]) {
                Object.keys(itemValue.permissions[permType]).forEach(permId => {
                  permIds.add(permId);
                  console.log('✅ Added item-level permission:', permId, 'item:', itemKey, 'type:', permType);
                });
              }
            });
          }
        });
      });
    }
    // If selecting section, include all its items
    else if (section && !item) {
      const sectionTarget = permissions[module]?.[section];
      if (!sectionTarget) {
        console.log('⚠️ Section not found:', section);
        return permIds;
      }
      
      // Section-level permissions
      if (sectionTarget?.permissions) {
        permissionTypes.forEach(permType => {
          if (sectionTarget.permissions[permType]) {
            Object.keys(sectionTarget.permissions[permType]).forEach(permId => {
              permIds.add(permId);
              console.log('✅ Added section-level permission:', permId, 'type:', permType);
            });
          }
        });
      }
      
      // All item-level permissions in this section
      Object.entries(sectionTarget).forEach(([key, value]) => {
        if (key === 'permissions' || typeof value !== 'object' || !value) return;
        
        if (value?.permissions) {
          permissionTypes.forEach(permType => {
            if (value.permissions[permType]) {
              Object.keys(value.permissions[permType]).forEach(permId => {
                permIds.add(permId);
                console.log('✅ Added item-level permission:', permId, 'item:', key, 'type:', permType);
              });
            }
          });
        }
      });
    }
    // If selecting item, only include item-level permissions
    else if (section && item) {
      const itemTarget = permissions[module]?.[section]?.[item];
      if (!itemTarget) {
        console.log('⚠️ Item not found:', item);
        return permIds;
      }
      
      if (itemTarget?.permissions) {
        permissionTypes.forEach(permType => {
          if (itemTarget.permissions[permType]) {
            Object.keys(itemTarget.permissions[permType]).forEach(permId => {
              permIds.add(permId);
              console.log('✅ Added item-level permission:', permId, 'type:', permType);
            });
          }
        });
      }
    }

    console.log('📊 Total collected permissions:', permIds.size, Array.from(permIds));
    return permIds;
  };

  // Handle row selection (select all permissions for a module/section/item and its children)
  const handleRowSelect = (module, section, item, checked) => {
    console.log('🔄 Row select:', { module, section, item, checked });
    
    // Collect all permission IDs for this level and its children
    const permIds = collectPermissionIds(module, section, item);
    console.log('📋 Collected permission IDs:', Array.from(permIds));
    
    setSelectedPermissions(prev => {
      const newSelected = new Set(prev);
      
      // Add or remove all collected permissions
      permIds.forEach(permId => {
        if (checked) {
          newSelected.add(permId);
        } else {
          newSelected.delete(permId);
        }
      });

      console.log('✅ Updated permissions after row select:', Array.from(newSelected));
      return newSelected;
    });
  };

  // Check if a permission is selected
  const isPermissionSelected = (permissionId) => {
    return selectedPermissions.has(permissionId);
  };

  // Check if a row is fully selected (including all children)
  const isRowFullySelected = (module, section, item) => {
    if (!permissions || !permissions[module]) return false;

    // Get all permission IDs for this level and its children
    const permIds = collectPermissionIds(module, section, item);
    
    if (permIds.size === 0) return false;

    // Check if all permissions are selected
    let allSelected = true;
    permIds.forEach(permId => {
      if (!selectedPermissions.has(permId)) {
        allSelected = false;
      }
    });

    return allSelected;
  };

  // Check if a row is partially selected (indeterminate state)
  const isRowPartiallySelected = (module, section, item) => {
    if (!permissions || !permissions[module]) return false;

    const permIds = collectPermissionIds(module, section, item);
    
    if (permIds.size === 0) return false;

    let selectedCount = 0;
    permIds.forEach(permId => {
      if (selectedPermissions.has(permId)) {
        selectedCount++;
      }
    });

    return selectedCount > 0 && selectedCount < permIds.size;
  };

  // Render permission checkboxes for a level
  const renderPermissionCheckboxes = (module, section, item) => {
    if (!permissions || !permissions[module]) {
      return (
        <small className="text-muted" style={{ color: '#9CA3AF' }}>No permissions configured for this level</small>
      );
    }

    const target = item 
      ? permissions[module]?.[section]?.[item]
      : section 
        ? permissions[module]?.[section]
        : permissions[module];

    if (!target || !target.permissions) {
      return (
        <small className="text-muted" style={{ color: '#9CA3AF' }}>No permissions configured for this level</small>
      );
    }

    const checkboxes = [];
    permissionTypes.forEach(permType => {
      if (target.permissions[permType] && Object.keys(target.permissions[permType]).length > 0) {
        Object.entries(target.permissions[permType]).forEach(([permId, permData]) => {
          const isChecked = isPermissionSelected(permId);
          checkboxes.push(
            <CFormCheck
              key={`${permId}-${permType}`}
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                e.stopPropagation();
                handlePermissionToggle(permId, e.target.checked);
              }}
              className="d-inline-block me-3 mb-2"
              label={permType.charAt(0).toUpperCase() + permType.slice(1)}
            />
          );
        });
      }
    });

    if (checkboxes.length === 0) {
      return (
        <small className="text-muted" style={{ color: '#9CA3AF' }}>No permissions configured for this level</small>
      );
    }

    return <div>{checkboxes}</div>;
  };

  // Render permissions table
  const renderPermissionsTable = () => {
    if (!permissions) return null;

    return (
      <CAccordion alwaysOpen>
        {Object.entries(permissions).map(([moduleName, moduleData]) => (
          <CAccordionItem key={moduleName} itemKey={moduleName}>
            <CAccordionHeader>
              <div className="d-flex align-items-center w-100" onClick={(e) => {
                // Don't toggle accordion when clicking checkbox
                if (e.target.type === 'checkbox' || e.target.closest('.form-check')) {
                  e.stopPropagation();
                }
              }}>
                <CFormCheck
                  type="checkbox"
                  checked={isRowFullySelected(moduleName, null, null)}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = isRowPartiallySelected(moduleName, null, null);
                    }
                  }}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleRowSelect(moduleName, null, null, e.target.checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="me-2"
                />
                <strong className="text-primary">
                  <i className="cil-folder me-2"></i>
                  {moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module
                </strong>
                <small className="ms-auto text-muted">
                  (Select entire module to grant all access)
                </small>
              </div>
            </CAccordionHeader>
            <CAccordionBody>
              <CTable bordered hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Level</CTableHeaderCell>
                    <CTableHeaderCell>Permissions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {/* Module level permissions */}
                  {moduleData.permissions && (
                    <CTableRow className="table-primary">
                      <CTableDataCell>
                        <CFormCheck
                          type="checkbox"
                          checked={isRowFullySelected(moduleName, null, null)}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = isRowPartiallySelected(moduleName, null, null);
                            }
                          }}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleRowSelect(moduleName, null, null, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          label={
                            <strong>
                              <i className="cil-folder me-1"></i>
                              Module Level (All Sections & Items)
                            </strong>
                          }
                        />
                      </CTableDataCell>
                      <CTableDataCell>
                        <small className="text-muted">
                          {(() => {
                            const hasItems = Object.entries(moduleData).some(([key, value]) => 
                              key !== 'permissions' && 
                              typeof value === 'object' && 
                              Object.entries(value).some(([itemKey, itemValue]) => 
                                itemKey !== 'permissions' && typeof itemValue === 'object'
                              )
                            );
                            return hasItems 
                              ? 'Selecting module grants access to all sections and items within it'
                              : 'Selecting module grants access to all sections within it';
                          })()}
                        </small>
                        <div className="mt-2">
                          {renderPermissionCheckboxes(moduleName, null, null)}
                        </div>
                      </CTableDataCell>
                    </CTableRow>
                  )}

                  {/* Section level permissions */}
                  {Object.entries(moduleData).map(([sectionName, sectionData]) => {
                    if (sectionName === 'permissions' || typeof sectionData !== 'object') return null;
                    
                    return (
                      <React.Fragment key={sectionName}>
                        <CTableRow className="table-secondary">
                          <CTableDataCell>
                            <CFormCheck
                              type="checkbox"
                              checked={isRowFullySelected(moduleName, sectionName, null)}
                              ref={(el) => {
                                if (el) {
                                  el.indeterminate = isRowPartiallySelected(moduleName, sectionName, null);
                                }
                              }}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleRowSelect(moduleName, sectionName, null, e.target.checked);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              label={
                                <strong>
                                  <i className="cil-folder-open me-1"></i>
                                  Section: {sectionName}
                                  {(() => {
                                    const sectionData = permissions[moduleName]?.[sectionName];
                                    const hasItems = sectionData && Object.entries(sectionData).some(([key, value]) => 
                                      key !== 'permissions' && typeof value === 'object' && value?.permissions
                                    );
                                    return hasItems ? ' (All Items)' : '';
                                  })()}
                                </strong>
                              }
                            />
                          </CTableDataCell>
                          <CTableDataCell>
                            <small className="text-muted">
                              {(() => {
                                const sectionData = permissions[moduleName]?.[sectionName];
                                const hasItems = sectionData && Object.entries(sectionData).some(([key, value]) => 
                                  key !== 'permissions' && typeof value === 'object' && value?.permissions
                                );
                                return hasItems 
                                  ? 'Selecting section grants access to all items within it'
                                  : 'Selecting section grants access to this section';
                              })()}
                            </small>
                            <div className="mt-2">
                              {renderPermissionCheckboxes(moduleName, sectionName, null)}
                            </div>
                          </CTableDataCell>
                        </CTableRow>

                        {/* Item level permissions */}
                        {Object.entries(sectionData).map(([itemName, itemData]) => {
                          if (itemName === 'permissions' || typeof itemData !== 'object') return null;
                          
                          return (
                            <CTableRow key={itemName} className="table-light">
                              <CTableDataCell style={{ paddingLeft: '2rem' }}>
                                <CFormCheck
                                  type="checkbox"
                                  checked={isRowFullySelected(moduleName, sectionName, itemName)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleRowSelect(moduleName, sectionName, itemName, e.target.checked);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  label={`Item: ${itemName}`}
                                />
                              </CTableDataCell>
                              <CTableDataCell>
                                {renderPermissionCheckboxes(moduleName, sectionName, itemName)}
                              </CTableDataCell>
                            </CTableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </CTableBody>
              </CTable>
            </CAccordionBody>
          </CAccordionItem>
        ))}
      </CAccordion>
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const permissionIds = Array.from(selectedPermissions);
      await onSave(permissionIds);
    } catch (err) {
      console.error('Error saving permissions:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <CModal visible={show} onClose={onClose} size="xl" scrollable>
      <CModalHeader>
        <CModalTitle>Edit User Permissions - {user?.username || user?.email || 'User'}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {loading ? (
          <div className="text-center py-4">
            <CSpinner color="primary" />
            <p className="mt-2">Loading permissions...</p>
          </div>
        ) : error ? (
          <CAlert color="danger">{error}</CAlert>
        ) : (
          <>
            <CAlert color="info" className="mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <i className="cil-info me-2"></i>
                  Selected <b>{selectedPermissions.size}</b> permissions
                </div>
                <div className="text-muted small">
                  <strong>Tip:</strong> Select module checkbox to grant access to entire module, or select specific sections only
                </div>
              </div>
            </CAlert>
            {renderPermissionsTable()}
          </>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleSave} disabled={saving || loading}>
          {saving ? <><CSpinner size="sm" className="me-2" />Saving...</> : 'Save Permissions'}
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default UserPermissionsModal;

