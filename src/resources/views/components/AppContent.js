import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'

// routes config
import routes from '../../../routes'

const AppContent = () => {
  console.log('🌐 AppContent: Rendering with', routes.length, 'routes');
  
  // Log developer mode routes specifically
  const devRoutes = routes.filter(r => r.path.includes('developer-mode'));
  console.log('🔧 Developer Mode routes:', devRoutes.map(r => ({ path: r.path, name: r.name })));
  
  return (
    <CContainer className="px-4" lg>
      <Suspense 
        fallback={
          <div className="text-center py-5">
            <CSpinner color="primary" />
            <p className="mt-2">Loading component...</p>
          </div>
        }
      >
        <Routes>
          {routes.map((route, idx) => {
            return (
              route.element && (
                <Route
                  key={idx}
                  path={route.path}
                  exact={route.exact}
                  name={route.name}
                  element={<route.element />}
                />
              )
            )
          })}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)

