import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CFormCheck,
  CRow,
  CAlert,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilUser, cilLockLocked } from '@coreui/icons';
import { useAuth } from '../../../../application/Providers/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(identifier, password);

      if (result.success) {
        // Redirect to dashboard after successful login
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={4} sm={8}>
            {/* Floating Card */}
            <CCard
              style={{
                border: 'none',
                borderRadius: '12px',
                overflow: 'hidden',
                transform: 'translateY(0)',
                animation: 'float 6s ease-in-out infinite',
                boxShadow: '0 12px 24px rgba(0, 120, 180, 0.1)',
                background: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(149, 209, 255, 0.2)',
              }}
            >
              <CCardBody className="p-4">
                {/* Logo */}
                <div className="text-center mb-4">
                  <a href="/" style={{ textDecoration: 'none' }}>
                    <img
                      src="/uk.svg"
                      alt="GrowMyBizz Logo"
                      style={{
                        width: '50%',
                        height: 'auto',
                        filter: 'drop-shadow(0 2px 4px rgba(0, 100, 150, 0.1))',
                      }}
                    />
                  </a>
                </div>

                {/* Header */}
                <div className="text-center mb-3">
                  <h4 className="mb-1" style={{ color: '#0369a1' }}>
                    Welcome Back!
                  </h4>
                  <p className="text-muted small mb-0">Sign in to continue your session</p>
                </div>

                <CForm onSubmit={handleSubmit}>
                  {error && (
                    <CAlert
                      color="danger"
                      dismissible
                      onClose={() => setError('')}
                      className="mb-3"
                    >
                      {error}
                    </CAlert>
                  )}

                  {/* Username Input */}
                  <div className="mb-3">
                    <div
                      style={{
                        position: 'relative',
                        marginBottom: '0',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#38bdf8',
                          zIndex: 10,
                          pointerEvents: 'none',
                        }}
                      >
                        <CIcon icon={cilUser} size="lg" />
                      </div>
                      <CFormInput
                        type="text"
                        id="username"
                        name="username"
                       
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        autoComplete="username"
                        autoFocus
                        style={{
                          paddingRight: '45px',
                          paddingTop: '20px',
                          paddingBottom: '8px',
                          borderColor: '#cbd5e1',
                          borderRadius: '8px',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#7dd3fc';
                          e.target.style.boxShadow = '0 0 0 3px rgba(125, 211, 252, 0.3)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#cbd5e1';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <label
                        htmlFor="username"
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: identifier ? '6px' : '50%',
                          transform: identifier ? 'none' : 'translateY(-50%)',
                          fontSize: identifier ? '11px' : '14px',
                          color: '#64748b',
                          transition: 'all 0.2s ease',
                          pointerEvents: 'none',
                          backgroundColor: identifier ? 'white' : 'transparent',
                          padding: identifier ? '0 4px' : '0',
                        }}
                      >
                        User Name
                      </label>
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="mb-3">
                    <div
                      style={{
                        position: 'relative',
                        marginBottom: '0',
                      }}
                    >
                      <div
                        onClick={togglePasswordVisibility}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#38bdf8',
                          zIndex: 10,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.color = '#0284c7';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = '#38bdf8';
                        }}
                      >
                        <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '18px' }}></i>
                      </div>
                      <CFormInput
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                       
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        style={{
                          paddingRight: '45px',
                          paddingTop: '20px',
                          paddingBottom: '8px',
                          borderColor: '#cbd5e1',
                          borderRadius: '8px',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#7dd3fc';
                          e.target.style.boxShadow = '0 0 0 3px rgba(125, 211, 252, 0.3)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#cbd5e1';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <label
                        htmlFor="password"
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: password ? '6px' : '50%',
                          transform: password ? 'none' : 'translateY(-50%)',
                          fontSize: password ? '11px' : '14px',
                          color: '#64748b',
                          transition: 'all 0.2s ease',
                          pointerEvents: 'none',
                          backgroundColor: password ? 'white' : 'transparent',
                          padding: password ? '0 4px' : '0',
                        }}
                      >
                        Password
                      </label>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div
                    className="d-flex align-items-center justify-content-between mb-3"
                    style={{ marginTop: '8px' }}
                  >
                    <CFormCheck
                      id="remember_me"
                      label="Remember Me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{
                        fontSize: '14px',
                        color: '#64748b',
                      }}
                    />
                    <div className="text-end">
                      <a
                        href="#"
                        className="small"
                        style={{
                          color: '#0ea5e9',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.opacity = '0.8';
                          e.target.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.opacity = '1';
                          e.target.style.textDecoration = 'none';
                        }}
                      >
                        Forgot Password?
                      </a>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <CButton
                    type="submit"
                    className="w-100 py-2 mb-2 border-0"
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(to right, #0ea5e9, #22d3ee)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
                      transition: 'all 0.2s ease',
                      borderRadius: '8px',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.4)';
                        e.target.style.background =
                          'linear-gradient(to right, #0ea5e9, #06b6d4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 8px rgba(14, 165, 233, 0.3)';
                      e.target.style.background = 'linear-gradient(to right, #0ea5e9, #22d3ee)';
                    }}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </CButton>

                  {/* Authentication ID */}
                  <div
                    className="mt-3 pt-2 border-top text-center"
                    style={{ borderColor: 'rgba(0, 180, 216, 0.1) !important' }}
                  >
                    <small className="text-muted">
                      <span
                        style={{
                          fontFamily: 'monospace',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          color: '#0e7490',
                        }}
                      >
                        Authentication Id : {typeof window !== 'undefined' ? window.location.hostname : 'localhost'}
                      </span>
                    </small>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>

            {/* Footer */}
            <div className="text-center mt-5">
              <p className="mb-0 small" style={{ color: '#64748b' }}>
                © {new Date().getFullYear()} - <b>Unique</b> Made with 💖 by{' '}
                <a
                  href="https://digitalkuppam.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#0ea5e9',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = '0.8';
                    e.target.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = '1';
                    e.target.style.textDecoration = 'none';
                  }}
                >
                  Digital Kuppam
                </a>
              </p>
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  );
};

export default Login;

