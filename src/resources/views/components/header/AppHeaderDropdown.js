import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAvatar,
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import {
  cilFile,
  cilAccountLogout,
  cilSettings,
  cilUser,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { useAuth } from 'src/application/Providers/AuthContext'

import avatar8 from 'src/resources/assets/images/avatars/8.jpg'

const AppHeaderDropdown = () => {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [imageError, setImageError] = useState(false)
  const avatarSrc = user?.profile || avatar8?.src || avatar8 || '/avatars/8.jpg'
  
  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
          {!imageError && avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Profile"
              style={{
                width: '40px',
                height: '40px',
                minWidth: '40px',
                minHeight: '40px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid transparent',
                display: 'block'
              }}
              onError={() => setImageError(true)}
            />
          ) : (
            <CAvatar 
              size="md"
              status={user?.account_status === 'active' ? 'success' : 'secondary'}
              style={{
                width: '40px',
                height: '40px',
                minWidth: '40px',
                minHeight: '40px'
              }}
            >
              {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
            </CAvatar>
          )}
        </div>
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">Settings</CDropdownHeader>
        <CDropdownItem 
          onClick={() => navigate('/central/profile')}
          style={{ cursor: 'pointer' }}
        >
          <CIcon icon={cilUser} className="me-2" />
          Profile
        </CDropdownItem>
        <CDropdownItem 
          onClick={() => navigate('/central/profile/settings')}
          style={{ cursor: 'pointer' }}
        >
          <CIcon icon={cilSettings} className="me-2" />
          Settings
        </CDropdownItem>
        <CDropdownItem href="#">
          <CIcon icon={cilFile} className="me-2" />
          Projects
          <CBadge color="primary" className="ms-2">
            42
          </CBadge>
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem 
          onClick={async () => {
            await logout()
            navigate('/login', { replace: true })
          }}
          style={{ cursor: 'pointer' }}
        >
          <CIcon icon={cilAccountLogout} className="me-2" />
          Logout
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown

