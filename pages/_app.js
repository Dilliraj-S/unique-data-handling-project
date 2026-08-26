import React from 'react';
import { Provider } from 'react-redux';
import 'core-js';

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// Import DataTables Bootstrap 5 CSS
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css';

// Import Bootstrap Icons
import 'bootstrap-icons/font/bootstrap-icons.css';

// Import FontAwesome (for table action icons like Hello Kuppam)
import '@fortawesome/fontawesome-free/css/all.min.css';

// Import Bootstrap CSS with Hello Kuppam theme overrides
import '../src/resources/assets/styles/bootstrap-theme.css';

// Import CoreUI pre-compiled CSS (includes all CoreUI variables and styles)
import '@coreui/coreui/dist/css/coreui.min.css';
import 'simplebar-react/dist/simplebar.min.css';

// Import custom styles (only our overrides)
import '../src/resources/assets/styles/custom.css';

import store from '../src/store';
import { AuthProvider } from '../src/application/Providers/AuthContext';
import BootstrapLoader from '../src/application/Components/BootstrapLoader';

function MyApp({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <AuthProvider>
        <BootstrapLoader />
        <Component {...pageProps} />
      </AuthProvider>
    </Provider>
  );
}

export default MyApp;
