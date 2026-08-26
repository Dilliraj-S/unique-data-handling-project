import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <span>&copy; 2025 Digitalkuppam.</span>
      </div>
      <div className="ms-auto">
        <span>Digitalkuppam</span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)

