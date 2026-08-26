import React from 'react'
import { NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'
import CIcon from '@coreui/icons-react'
import * as icons from '@coreui/icons'

import SimpleBar from 'simplebar-react'
// Note: simplebar-react CSS is imported globally in pages/_app.js

import { CBadge, CNavLink, CSidebarNav, CNavItem, CNavTitle } from '@coreui/react'

export const AppSidebarNav = ({ items }) => {
  const navLink = (name, iconName, badge, indent = false) => {
    // Convert icon string to actual icon component
    let icon = null;
    
    if (iconName) {
      if (typeof iconName === 'string') {
        // Check if it's a Bootstrap icon (starts with 'bi ' or 'bi-')
        const isBootstrapIcon = iconName.trim().startsWith('bi ') || iconName.trim().startsWith('bi-');
        
        if (isBootstrapIcon) {
          // Handle Bootstrap icons (e.g., 'bi bi-person' or 'bi-person')
          const iconClass = iconName.trim().startsWith('bi ') 
            ? iconName.trim() 
            : `bi ${iconName.trim()}`;
          icon = <i className={`${iconClass} nav-icon`}></i>;
        } else {
          // Handle CoreUI icons (e.g., 'cil-apps' or 'cilApps')
        // Convert kebab-case to camelCase (e.g., 'cil-shield-alt' -> 'cilShieldAlt')
        const camelCaseIcon = iconName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        
        // If it's a string like 'cilSpeedometer' or 'cil-speedometer', convert to icon
        const iconObj = icons[camelCaseIcon];
        if (iconObj) {
          icon = <CIcon icon={iconObj} customClassName="nav-icon" />;
        } else {
          // Fallback if icon not found
          console.warn(`Icon '${iconName}' (converted to '${camelCaseIcon}') not found in CoreUI icons`);
          icon = <CIcon icon={icons.cilFile} customClassName="nav-icon" />;
          }
        }
      } else {
        // Already a component
        icon = iconName;
      }
    } else if (indent) {
      // Show bullet for indented items without icons
      icon = (
        <span className="nav-icon">
          <span className="nav-icon-bullet"></span>
        </span>
      );
    }

    return (
      <>
        {icon}
        {name && name}
        {badge && (
          <CBadge color={badge.color} className="ms-auto" size="sm">
            {badge.text}
          </CBadge>
        )}
      </>
    )
  }

  const navItem = (item, index, indent = false) => {
    const { component, name, badge, icon, className, ...rest } = item
    
    // Debug: Log navigation item details
    if (rest.to) {
      console.log(`🔗 NavItem: "${name}" -> ${rest.to}`, { component, ...rest });
    }
    
    // Convert string component to actual component
    const Component = typeof component === 'string' 
      ? (component === 'CNavItem' ? CNavItem : CNavTitle)
      : component;
    
    // Add className prop if exists (key must be separate for React)
    const componentProps = {
      as: "div",
      ...(className && { className })
    };
    
    return (
      <Component key={index} {...componentProps}>
        {rest.to || rest.href ? (
          <CNavLink
            {...(rest.to && { as: NavLink })}
            {...(rest.href && { target: '_blank', rel: 'noopener noreferrer' })}
            {...rest}
          >
            {navLink(name, icon, badge, indent)}
          </CNavLink>
        ) : (
          navLink(name, icon, badge, indent)
        )}
      </Component>
    )
  }

  const navGroup = (item, index) => {
    const { component, name, icon, items, to, ...rest } = item
    const Component = component
    return (
      <Component compact as="div" key={index} toggler={navLink(name, icon)} {...rest}>
        {items?.map((item, index) =>
          item.items ? navGroup(item, index) : navItem(item, index, true),
        )}
      </Component>
    )
  }

  return (
    <CSidebarNav as={SimpleBar}>
      {items &&
        items.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
    </CSidebarNav>
  )
}

AppSidebarNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
}

