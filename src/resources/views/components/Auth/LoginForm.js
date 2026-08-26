import React, { useState } from 'react';
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLockLocked, cilUser } from '@coreui/icons';
import { useAuthContext } from '../../../../application/Providers/AuthProvider';
import { useRouter } from 'next/router';

/**
 * Login Form Component
 * Displays login form and handles authentication
 */
const LoginForm = () => {
  const { login, isLoading } = useAuthContext();
  const router = useRouter();

  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  /**
   * Handle input change
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage('');

    const result = await login(credentials);

    if (result.success) {
      // Redirect to dashboard
      router.push('/dashboard');
    } else {
      if (result.errors) {
        setErrors(result.errors);
      } else {
        setMessage(result.message || 'Login failed');
      }
    }
  };

  return (
    <div className="bg-light min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  <CForm onSubmit={handleSubmit}>
                    <h1>Login</h1>
                    <p className="text-medium-emphasis">Sign In to your account</p>

                    {message && (
                      <div className="alert alert-danger" role="alert">
                        {message}
                      </div>
                    )}

                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        type="email"
                        name="email"
                        placeholder="Email"
                        autoComplete="email"
                        value={credentials.email}
                        onChange={handleChange}
                        invalid={!!errors.email}
                      />
                    </CInputGroup>
                    {errors.email && (
                      <div className="text-danger mb-3">{errors.email}</div>
                    )}

                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        name="password"
                        placeholder="Password"
                        autoComplete="current-password"
                        value={credentials.password}
                        onChange={handleChange}
                        invalid={!!errors.password}
                      />
                    </CInputGroup>
                    {errors.password && (
                      <div className="text-danger mb-3">{errors.password}</div>
                    )}

                    <CRow>
                      <CCol xs={6}>
                        <CButton
                          color="primary"
                          className="px-4"
                          type="submit"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Loading...' : 'Login'}
                        </CButton>
                      </CCol>
                      <CCol xs={6} className="text-right">
                        <CButton color="link" className="px-0">
                          Forgot password?
                        </CButton>
                      </CCol>
                    </CRow>
                  </CForm>
                </CCardBody>
              </CCard>
              <CCard className="text-white bg-primary py-5" style={{ width: '44%' }}>
                <CCardBody className="text-center">
                  <div>
                    <h2>Sign up</h2>
                    <p>
                      Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
                      tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                    <CButton
                      color="primary"
                      className="mt-3"
                      active
                      tabIndex={-1}
                      onClick={() => router.push('/register')}
                    >
                      Register Now!
                    </CButton>
                  </div>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  );
};

export default LoginForm;


