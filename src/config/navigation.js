import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilShieldAlt,
  cilApps,
} from '@coreui/icons'
import { CNavItem, CNavTitle } from '@coreui/react'

// Static navigation - will be replaced by dynamic navigation from API
const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },
  {
    component: CNavTitle,
    name: 'Developer Mode'
  },
  {
    component: CNavItem,
    name: 'Tokens',
    to: '/developer/tokens',
    icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />
  },
  {
    component: CNavItem,
    name: 'Modules',
    to: '/developer/modules',
    icon: <CIcon icon={cilApps} customClassName="nav-icon" />
  }
]

export default _nav
