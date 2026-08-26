import React, { Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { CSpinner, useColorModes } from '@coreui/react'
import ProtectedRoute from './application/Components/ProtectedRoute'
import PublicRoute from './application/Components/PublicRoute'

// Containers
const DefaultLayout = React.lazy(() => import('./resources/views/layouts/DefaultLayout'))

// Pages
const Login = React.lazy(() => import('./resources/views/pages/auth/Login'))
const Register = React.lazy(() => import('./resources/views/pages/pages/register/Register'))
const Page404 = React.lazy(() => import('./resources/views/pages/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./resources/views/pages/pages/page500/Page500'))

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const storedTheme = useSelector((state) => state.theme)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.href.split('?')[1])
    const theme = urlParams.get('theme') && urlParams.get('theme').match(/^[A-Za-z0-9\s]+/)[0]
    if (theme) {
      setColorMode(theme)
    }

    if (isColorModeSet()) {
      return
    }

    setColorMode(storedTheme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <HashRouter>
      <Suspense
        fallback={
          <div className="pt-3 text-center">
            <CSpinner color="primary" variant="grow" />
          </div>
        }
      >
        <Routes>
          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Public routes - redirect to dashboard if already logged in */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          
          {/* Error pages */}
          <Route path="/404" element={<Page404 />} />
          <Route path="/500" element={<Page500 />} />
          
          {/* Protected routes - require authentication */}
          <Route 
            path="*" 
            element={
              <ProtectedRoute>
                <DefaultLayout />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App
