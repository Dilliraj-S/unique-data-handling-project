import dynamic from 'next/dynamic'
import { Provider } from 'react-redux'
import store from '../src/store'
import { AuthProvider } from '../src/application/Providers/AuthContext'

// Dynamically import the ClientOnlyApp component with no SSR
const ClientOnlyApp = dynamic(() => import('../src/ClientOnlyApp'), { 
  ssr: false,
  loading: () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '24px'
    }}>
      Loading...
    </div>
  )
})

export default function Home() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <ClientOnlyApp />
      </AuthProvider>
    </Provider>
  )
}
