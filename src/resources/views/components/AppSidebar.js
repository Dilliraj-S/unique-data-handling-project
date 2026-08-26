import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSpeedometer } from '@coreui/icons'
import * as icons from '@coreui/icons'
import { CNavItem, CNavTitle } from '@coreui/react'

import { AppSidebarNav } from './AppSidebarNav'
import { sygnet } from '../../assets/icons/sygnet'
import axios from 'axios'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  
  // Dynamic navigation state
  const [navigation, setNavigation] = useState([
    {
      component: CNavItem,
      name: 'Dashboard',
      to: '/dashboard',
      icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    }
  ])
  const [loading, setLoading] = useState(true)

  // Fetch dynamic navigation from database
  useEffect(() => {
    fetchNavigation()
  }, [])

  const fetchNavigation = async () => {
    try {
      const token = localStorage.getItem('access_token')
      
      if (!token) {
        console.log('No auth token, using default navigation')
        setLoading(false)
        return
      }

      const response = await axios.get('/api/navigation', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.status && response.data.data) {
        console.log('✅ Dynamic navigation loaded:', response.data.data.length, 'items')
        setNavigation(response.data.data)
      }
    } catch (error) {
      console.error('Failed to load navigation:', error)
      // Keep default navigation on error
    } finally {
      setLoading(false)
    }
  }

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand to="/">
          <img 
            src="/uk.svg" 
            alt="Logo" 
            className="sidebar-brand-full" 
            style={{ 
              height: '60px', 
              width: 'auto', 
              maxWidth: '220px', 
              minWidth: '120px',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto'
            }}
          />
          <CIcon customClassName="sidebar-brand-narrow" icon={sygnet} height={32} />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      
      {loading ? (
        <div className="text-center p-3 text-white">Loading...</div>
      ) : (
      <AppSidebarNav items={navigation} />
      )}
      
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
