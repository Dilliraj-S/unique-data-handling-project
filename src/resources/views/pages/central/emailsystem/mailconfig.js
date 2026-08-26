import React, { useState, useEffect, useRef } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CForm,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CFormLabel,
  CAlert,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilReload, cilCheck, cilX } from '@coreui/icons';
import DynamicTable from 'src/application/Components/DynamicTable';
import ViewModal from 'src/application/Components/ViewModal';
import { useViewModal } from 'src/application/Hooks/useViewModal';
import { useDelete } from 'src/application/Hooks/useDelete';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';

/**
 * Mail Config Page - Email Account Management
 * Multi-step form for adding email accounts (Account Details -> Setup Choice -> Manual Setup)
 * Based on bv project's mail-config.blade.php
 */
const Mailconfig = () => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Account Details, 2: Setup Choice, 3: Manual Setup
  const [accountDetails, setAccountDetails] = useState({});
  const [manualSetup, setManualSetup] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [phoneIti, setPhoneIti] = useState(null);
  const phoneInputRef = useRef(null);

  const baseToken = 'central_email_config';

  // View & Delete hooks for email accounts table
  const { handleView, showViewModal, viewData, setShowViewModal, setViewData } = useViewModal(baseToken);
  const { handleDelete } = useDelete(baseToken, () => {
    setTableRefreshKey(prev => prev + 1);
  });

  // Handle URL parameters for OAuth callback success/error messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const successMsg = urlParams.get('success');
    const errorMsg = urlParams.get('error');
    
    if (successMsg) {
      setSuccess(decodeURIComponent(successMsg));
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh table
      setTableRefreshKey(prev => prev + 1);
    }
    
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Port settings based on encryption type
  const portSettings = {
    imap: {
      ssl: 993,
      tls: 143,
      starttls: 143,
      none: 143
    },
    smtp: {
      ssl: 465,
      tls: 587,
      starttls: 587,
      none: 25
    }
  };

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  // Initialize intl-tel-input when component mounts
  useEffect(() => {
    // Load intl-tel-input from CDN
    if (typeof window !== 'undefined' && !window.intlTelInputLoaded) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/css/intlTelInput.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/js/intlTelInput.min.js';
      script.onload = () => {
        const utilsScript = document.createElement('script');
        utilsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/js/utils.js';
        utilsScript.onload = initializePhoneInput;
        document.body.appendChild(utilsScript);
      };
      document.body.appendChild(script);
      window.intlTelInputLoaded = true;
    } else if (window.intlTelInput) {
      initializePhoneInput();
    }
  }, []);

  const initializePhoneInput = () => {
    if (phoneInputRef.current && window.intlTelInput) {
      const iti = window.intlTelInput(phoneInputRef.current, {
        initialCountry: 'in',
        separateDialCode: true,
        utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/18.2.1/js/utils.js',
        preferredCountries: ['in', 'us', 'gb'],
        nationalMode: false,
        autoPlaceholder: 'aggressive',
        dropdownContainer: document.body
      });
      setPhoneIti(iti);
    }
  };

  const getPhoneNumberData = () => {
    if (!phoneIti || !phoneIti.getNumber) {
      return {
        extension: null,
        phone_number: null,
        full_number: null
      };
    }

    const fullNumber = phoneIti.getNumber();
    const selectedCountryData = phoneIti.getSelectedCountryData();

    return {
      extension: selectedCountryData ? selectedCountryData.dialCode : null,
      phone_number: fullNumber ? fullNumber.replace(`+${selectedCountryData.dialCode}`, '').trim() : null,
      full_number: fullNumber
    };
  };

  // Handle Account Details form submission
  const handleAccountDetailsSubmit = (e) => {
    e.preventDefault();
    const form = e.target;

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      setError('Please fill all required fields.');
      return;
    }

    const phoneData = getPhoneNumberData();
    const formData = {
      first_name: form['first-name'].value.trim(),
      last_name: form['last-name'].value.trim(),
      extension: phoneData.extension,
      phone_number: phoneData.phone_number,
      designation: form.designation.value.trim(),
      postal_code: form['postal-code'].value.trim(),
      address: form.address.value.trim(),
      fax: form.fax.value.trim(),
      unsubscribe: form.unsubscribe.value.trim(),
      region: form.region.value.trim(),
      daily_send_limit: parseInt(form['daily-send-limit'].value) || 100
    };

    setAccountDetails(formData);
    setCurrentStep(2);
    setError(null);
  };

  // Handle Setup Choice (Google Auth or Manual)
  const handleSetupChoice = async (type) => {
    if (type === 'google') {
      // Pre-save account details and redirect to Google OAuth
      try {
        if (!accountDetails.first_name || !accountDetails.last_name) {
          setError('Please fill and submit account details first.');
          setCurrentStep(1);
          return;
        }

        const authAxios = getAuthAxios();
        
        // Step 1: Pre-save account details
        const preSaveResponse = await authAxios.post('/api/pre-save-google-account', accountDetails);

        if (!preSaveResponse.data.status) {
          setError(preSaveResponse.data.message || 'Failed to pre-save account details.');
          return;
        }

        // Step 2: Get Google OAuth redirect URL (with auth header)
        const redirectResponse = await authAxios.get('/api/auth/google/redirect');

        // The endpoint returns JSON with redirectUrl when called via axios
        if (redirectResponse.data.status && redirectResponse.data.redirectUrl) {
          // Redirect to Google OAuth URL
          window.location.href = redirectResponse.data.redirectUrl;
          return;
        }

        // Fallback: if redirect URL is in response data
        if (preSaveResponse.data.redirect) {
          window.location.href = preSaveResponse.data.redirect;
        } else {
          setError('Failed to get Google OAuth redirect URL.');
        }
      } catch (err) {
        console.error('Error initiating Google OAuth:', err);
        setError(err.response?.data?.message || 'Failed to initiate Google OAuth. Please try again.');
      }
      return;
    }
    setCurrentStep(3);
  };

  // Handle Manual Setup form submission
  const handleManualSetupSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      setError('Please fill all required fields.');
      return;
    }

    try {
      const formData = {
        ...accountDetails,
        email: form['manual-email'].value.trim(),
        password: form['manual-password'].value.trim(),
        incoming_host: form['incoming-host'].value.trim(),
        incoming_port: parseInt(form['incoming-port'].value) || 993,
        incoming_encryption: form['incoming-encryption'].value || 'ssl',
        outgoing_host: form['outgoing-host'].value.trim(),
        outgoing_port: parseInt(form['outgoing-port'].value) || 465,
        outgoing_encryption: form['outgoing-encryption'].value || 'ssl',
        type: 'manual',
        status: 'active'
      };

      const authAxios = getAuthAxios();
      const response = await authAxios.post(`/api/skeleton-action/${baseToken}_as`, formData);

      if (response.data.status) {
        setSuccess(response.data.message || 'Email account added successfully!');
        setCurrentStep(1);
        setAccountDetails({});
        setManualSetup({});
        e.target.reset();
        setTableRefreshKey(prev => prev + 1);
      } else {
        setError(response.data.message || 'Failed to save email account.');
      }
    } catch (err) {
      console.error('Error saving email account:', err);
      setError(err.response?.data?.message || 'Failed to save email account.');
    }
  };

  // Handle Auto-Detect Settings
  const handleAutoDetect = async () => {
    const email = document.getElementById('manual-email')?.value.trim();
    if (!email) {
      setError('Please enter an email address first.');
      return;
    }

    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/email-autodetect', { email });

      if (response.data && response.data.settings) {
        const settings = response.data.settings;
        setManualSetup({
          incoming_host: settings.imap_host || '',
          incoming_port: settings.imap_port || '',
          incoming_encryption: settings.imap_encryption || 'ssl',
          outgoing_host: settings.smtp_host || '',
          outgoing_port: settings.smtp_port || '',
          outgoing_encryption: settings.smtp_encryption || 'ssl'
        });
        setSuccess('Settings auto-detected successfully!');
      } else {
        setError('Could not auto-detect settings. Please enter manually.');
      }
    } catch (err) {
      console.error('Error auto-detecting settings:', err);
      setError('Failed to auto-detect settings.');
    }
  };

  // Handle Test Connection
  const handleTestConnection = async () => {
    const form = document.getElementById('manual-setup-form');
    if (!form || !form.checkValidity()) {
      setError('Please fill all fields before testing.');
      return;
    }

    try {
      const data = {
        email: form['manual-email'].value.trim(),
        password: form['manual-password'].value.trim(),
        incoming_host: form['incoming-host'].value.trim(),
        incoming_port: parseInt(form['incoming-port'].value) || 993,
        incoming_encryption: form['incoming-encryption'].value || 'ssl',
        outgoing_host: form['outgoing-host'].value.trim(),
        outgoing_port: parseInt(form['outgoing-port'].value) || 465,
        outgoing_encryption: form['outgoing-encryption'].value || 'ssl'
      };

      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/email-test-connection', data);

      if (response.data && response.data.status) {
        setSuccess(response.data.message || 'Connection test successful!');
      } else {
        setError(response.data.message || 'Connection test failed.');
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      setError(err.response?.data?.message || 'Connection test failed. Please check your settings.');
    }
  };

  // Table columns for email accounts
  const tableColumns = {
    id: ['id', true],
    email: ['email', true],
    first_name: ['first_name', true],
    last_name: ['last_name', true],
    designation: ['designation', true],
    region: ['region', true],
    daily_send_limit: ['daily_send_limit', true],
    status: ['status', true],
    type: ['type', true],
    created_at: ['created_at', true]
  };

  const tableReqSet = {
    token: `${baseToken}_t`,
    table: 'email_accounts',
    actions: 'cevd',
    act: 'id',
    system: 'pluto' // email_accounts collection is in pluto database
  };

  const handleTableAction = (actionType, row) => {
    if (!row) return;

    switch (actionType) {
      case 'view':
        // Use universal view modal (offcanvas) driven by skeleton config
        handleView(row);
        break;
      case 'edit':
        // For now, reuse view for edit as well – email account editing is handled
        // via the manual setup wizard above, not via a separate popup form.
        handleView(row);
        break;
      case 'delete':
        handleDelete(row);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <CRow>
        <CCol xs={12}>
          {/* Step 1: Account Details */}
          {currentStep === 1 && (
          <CCard className="mb-4">
              <CCardHeader className="bg-primary text-white">
                <h5 className="mb-0">Add Email Account - Personal Details</h5>
              </CCardHeader>
            <CCardBody>
                {error && (
                  <CAlert color="danger" dismissible onClose={() => setError(null)}>
                    {error}
                  </CAlert>
                )}
                {success && (
                  <CAlert color="success" dismissible onClose={() => setSuccess(null)}>
                    {success}
                  </CAlert>
                )}

                <CForm id="account-details-form" onSubmit={handleAccountDetailsSubmit} noValidate>
                  <CRow className="mb-3">
                    <CCol md={6}>
                      <CFormLabel>First Name <span className="text-danger">*</span></CFormLabel>
                      <CFormInput
                        type="text"
                        name="first-name"
                        required
                        placeholder="First Name"
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Last Name <span className="text-danger">*</span></CFormLabel>
                      <CFormInput
                        type="text"
                        name="last-name"
                        required
                        placeholder="Last Name"
                      />
                    </CCol>
                  </CRow>

                  <CRow className="mb-3">
                    <CCol md={6}>
                      <CFormLabel>Phone Number</CFormLabel>
                      <CFormInput
                        type="tel"
                        name="extension"
                        ref={phoneInputRef}
                        placeholder="Phone Number"
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Designation <span className="text-danger">*</span></CFormLabel>
                      <CFormInput
                        type="text"
                        name="designation"
                        required
                        placeholder="Designation"
                      />
                    </CCol>
                  </CRow>

                  <CRow className="mb-3">
                    <CCol md={6}>
                      <CFormLabel>Unsubscribe URL</CFormLabel>
                      <CFormInput
                        type="url"
                        name="unsubscribe"
                        placeholder="Unsubscribe URL"
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Fax</CFormLabel>
                      <CFormInput
                        type="text"
                        name="fax"
                        placeholder="Fax"
                      />
                    </CCol>
                  </CRow>

                  <CRow className="mb-3">
                    <CCol md={6}>
                      <CFormLabel>Region <span className="text-danger">*</span></CFormLabel>
                      <CFormSelect name="region" required>
                        <option value="">Select a region</option>
                        <option value="North America">North America</option>
                        <option value="South America">South America</option>
                        <option value="APJ & APAC">APJ & APAC</option>
                        <option value="EMEA">EMEA</option>
                        <option value="MENA">MENA</option>
                        <option value="DACH">DACH</option>
                        <option value="Oceania">Oceania</option>
                        <option value="NORDICS">NORDICS</option>
                      </CFormSelect>
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Postal Code <span className="text-danger">*</span></CFormLabel>
                      <CFormInput
                        type="text"
                        name="postal-code"
                        required
                        placeholder="Postal Code"
                      />
                    </CCol>
                  </CRow>

                  <CRow className="mb-3">
                    <CCol md={6}>
                      <CFormLabel>Address <span className="text-danger">*</span></CFormLabel>
                      <CFormTextarea
                        name="address"
                        rows={4}
                        required
                        placeholder="Address"
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Daily Send Limit <span className="text-danger">*</span></CFormLabel>
                      <CFormInput
                        type="number"
                        name="daily-send-limit"
                        min={1}
                        required
                        placeholder="Daily Send Limit"
                        defaultValue={100}
                      />
                      <small className="text-muted">Maximum emails this account can send per rolling 24 hours.</small>
                    </CCol>
                  </CRow>

                  <div className="d-flex justify-content-end">
                    <CButton color="primary" type="submit">
                      Next
                    </CButton>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>
          )}

          {/* Step 2: Setup Choice */}
          {currentStep === 2 && (
            <CCard className="mb-4">
              <CCardHeader className="bg-primary text-white">
                <h5 className="mb-0">Choose Setup Method</h5>
              </CCardHeader>
              <CCardBody>
                <div className="d-flex flex-column align-items-center gap-3">
                  <CButton 
                    color="primary"
                    className="w-100"
                    style={{ maxWidth: '300px' }}
                    onClick={() => handleSetupChoice('google')}
                  >
                    <CIcon icon={cilPlus} className="me-2" />
                    Add Google Account
                  </CButton>
                  <CButton 
                    color="outline-primary"
                    className="w-100"
                    style={{ maxWidth: '300px' }}
                    onClick={() => handleSetupChoice('manual')}
                  >
                    <CIcon icon={cilCheck} className="me-2" />
                    Manual Setup
                  </CButton>
                </div>
                <div className="d-flex justify-content-start mt-4">
                  <CButton color="secondary" onClick={() => setCurrentStep(1)}>
                    Back
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          )}

          {/* Step 3: Manual Setup */}
          {currentStep === 3 && (
            <CCard className="mb-4">
              <CCardHeader className="bg-primary text-white">
                <h5 className="mb-0">Manual Email Configuration</h5>
              </CCardHeader>
              <CCardBody>
                {error && (
                  <CAlert color="danger" dismissible onClose={() => setError(null)}>
                    {error}
                  </CAlert>
                )}
                {success && (
                  <CAlert color="success" dismissible onClose={() => setSuccess(null)}>
                    {success}
                  </CAlert>
                )}

                <CForm id="manual-setup-form" onSubmit={handleManualSetupSubmit} noValidate>
                  <CRow className="mb-3">
                    <CCol md={6}>
                      <CFormLabel>Email Address <span className="text-danger">*</span></CFormLabel>
                      <CFormInput
                        type="email"
                        id="manual-email"
                        name="manual-email"
                        required
                        placeholder="Email Address"
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Password <span className="text-danger">*</span></CFormLabel>
                      <CFormInput
                        type="password"
                        id="manual-password"
                        name="manual-password"
                        required
                        placeholder="Password"
                      />
                    </CCol>
                  </CRow>

                  <div className="mb-4">
                    <CButton
                      type="button"
                      color="outline-primary"
                      onClick={handleAutoDetect}
                    >
                      <CIcon icon={cilCheck} className="me-2" />
                      Auto-Detect Settings
                    </CButton>
              </div>

                  <CRow>
                    {/* IMAP Card */}
                    <CCol md={6} className="mb-4">
                      <CCard>
                        <CCardHeader className="bg-info text-white">
                          <h6 className="mb-0">Receive (IMAP)</h6>
                        </CCardHeader>
                        <CCardBody>
                          <div className="mb-3">
                            <CFormLabel>IMAP Host <span className="text-danger">*</span></CFormLabel>
                            <CFormInput
                              type="text"
                              id="incoming-host"
                              name="incoming-host"
                              required
                              placeholder="IMAP Host"
                              value={manualSetup.incoming_host || ''}
                              onChange={(e) => setManualSetup({ ...manualSetup, incoming_host: e.target.value })}
                            />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>IMAP Port <span className="text-danger">*</span></CFormLabel>
                            <CFormInput
                              type="number"
                              id="incoming-port"
                              name="incoming-port"
                              required
                              placeholder="IMAP Port"
                              value={manualSetup.incoming_port || ''}
                              onChange={(e) => setManualSetup({ ...manualSetup, incoming_port: e.target.value })}
                            />
                          </div>
                          <div>
                            <CFormLabel>IMAP Encryption <span className="text-danger">*</span></CFormLabel>
                            <CFormSelect
                              id="incoming-encryption"
                              name="incoming-encryption"
                              required
                              value={manualSetup.incoming_encryption || ''}
                              onChange={(e) => {
                                const encryption = e.target.value;
                                setManualSetup({
                                  ...manualSetup,
                                  incoming_encryption: encryption,
                                  incoming_port: portSettings.imap[encryption] || ''
                                });
                              }}
                            >
                              <option value="">Select Encryption</option>
                              <option value="ssl">SSL</option>
                              <option value="tls">TLS</option>
                              <option value="starttls">STARTTLS</option>
                              <option value="none">None</option>
                            </CFormSelect>
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>

                    {/* SMTP Card */}
                    <CCol md={6}>
                      <CCard>
                        <CCardHeader className="bg-success text-white">
                          <h6 className="mb-0">Send (SMTP)</h6>
                        </CCardHeader>
                        <CCardBody>
                          <div className="mb-3">
                            <CFormLabel>SMTP Host <span className="text-danger">*</span></CFormLabel>
                            <CFormInput
                              type="text"
                              id="outgoing-host"
                              name="outgoing-host"
                              required
                              placeholder="SMTP Host"
                              value={manualSetup.outgoing_host || ''}
                              onChange={(e) => setManualSetup({ ...manualSetup, outgoing_host: e.target.value })}
                            />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>SMTP Port <span className="text-danger">*</span></CFormLabel>
                            <CFormInput
                              type="number"
                              id="outgoing-port"
                              name="outgoing-port"
                              required
                              placeholder="SMTP Port"
                              value={manualSetup.outgoing_port || ''}
                              onChange={(e) => setManualSetup({ ...manualSetup, outgoing_port: e.target.value })}
                            />
                          </div>
                          <div>
                            <CFormLabel>SMTP Encryption <span className="text-danger">*</span></CFormLabel>
                            <CFormSelect
                              id="outgoing-encryption"
                              name="outgoing-encryption"
                              required
                              value={manualSetup.outgoing_encryption || ''}
                              onChange={(e) => {
                                const encryption = e.target.value;
                                setManualSetup({
                                  ...manualSetup,
                                  outgoing_encryption: encryption,
                                  outgoing_port: portSettings.smtp[encryption] || ''
                                });
                              }}
                            >
                              <option value="">Select Encryption</option>
                              <option value="ssl">SSL</option>
                              <option value="tls">TLS</option>
                              <option value="starttls">STARTTLS</option>
                              <option value="none">None</option>
                            </CFormSelect>
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  </CRow>

                  <div className="d-flex justify-content-between gap-3 mt-4">
                    <CButton color="secondary" onClick={() => setCurrentStep(2)}>
                      Back
                    </CButton>
                    <div className="d-flex gap-3">
                      <CButton
                        type="button"
                        color="secondary"
                        onClick={handleTestConnection}
                      >
                        Test Connection
                      </CButton>
                      <CButton color="primary" type="submit">
                        Save Account
                      </CButton>
                    </div>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>
          )}

      {/* Email Accounts Table */}
          <CCard className="mt-5">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Email Accounts</h5>
              <CButton
                color="secondary"
                size="sm"
                onClick={() => setTableRefreshKey(prev => prev + 1)}
              >
                <CIcon icon={cilReload} className="me-1" />
                Refresh
              </CButton>
            </CCardHeader>
            <CCardBody>
              <DynamicTable
                key={tableRefreshKey}
                token={`${baseToken}_t`}
                tableName="email_accounts"
                system="central"
                columns={tableColumns}
                custom={[]}
                reqSet={tableReqSet}
                onAction={handleTableAction}
                initialFilters={{}}
                autoFetch={true}
                enableSelection={false}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* View Modal for email accounts */}
      <ViewModal
        show={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewData(null);
        }}
        data={viewData}
      />
    </>
  );
};

export default Mailconfig;
