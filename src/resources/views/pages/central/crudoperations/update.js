import React, { useEffect, useState } from 'react';
import {
  CCard, CCardBody, CCol, CRow, CButton,
  CForm, CFormInput, CFormSelect, CFormLabel,
  CAlert,
  CNav, CNavItem, CNavLink,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSave, cilCloudUpload } from '@coreui/icons';
import axios from 'axios';
import AuthService from 'src/application/Services/AuthService';

const Update = () => {
  /* ================= COMMON ================= */
  const [mode, setMode] = useState('manual'); 
  // manual | csv

  const [databases, setDatabases] = useState([]);
  const [collections, setCollections] = useState([]);
  const [columns, setColumns] = useState([]);

  const [database, setDatabase] = useState('');
  const [collection, setCollection] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  /* ================= LOAD DBS ================= */
  useEffect(() => {
    getAuthAxios()
      .get('/api/import/databases')
      .then(res => setDatabases(res.data.databases || []));
  }, []);

  /* ================= LOAD COLLECTIONS ================= */
  useEffect(() => {
    if (!database) return;
    getAuthAxios()
      .get(`/api/import/collections?database=${database}`)
      .then(res => setCollections(res.data.collections || []));
  }, [database]);

  /* ================= LOAD COLUMNS ================= */
  useEffect(() => {
    if (!database || !collection) return;
    getAuthAxios()
      .get(`/api/System/Central/querynest/getSchema?database=${database}&collection=${collection}`)
      .then(res => {
        if (res.data?.success) {
          setColumns(res.data.columns.map(c => c.name));
        }
      });
  }, [database, collection]);

  /* =====================================================
     🟢 UPDATE BY SELECT (MANUAL)
  ===================================================== */
  const [matchColumn, setMatchColumn] = useState('');
  const [updateColumn, setUpdateColumn] = useState('');
  const [matchValues, setMatchValues] = useState('');
  const [updateValues, setUpdateValues] = useState('');

  const handleManualUpdate = async () => {
    try {
      await getAuthAxios().post(
        '/api/System/Central/querynest/CustomCtrl',
        {
          action: 'bulk_update_manual',
          database,
          collection,
          matchColumn,
          updateColumn,
          matchValues: matchValues.split(',').map(v => v.trim()),
          updateValues: updateValues.split(',').map(v => v.trim()),
        }
      );

      setSuccess('Bulk update completed successfully');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  /* =====================================================
     🔵 UPDATE BY CSV / DB → DB
  ===================================================== */
  const [csvFile, setCsvFile] = useState(null);
  const [matchColumns, setMatchColumns] = useState([]);
  const [updateColumns, setUpdateColumns] = useState([]);

  const [targetDatabase, setTargetDatabase] = useState('');
  const [targetCollection, setTargetCollection] = useState('');

  const handleCsvUpdate = async () => {
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('database', database);
      formData.append('collection', collection);
      formData.append('targetDatabase', targetDatabase);
      formData.append('targetCollection', targetCollection);
      formData.append('matchColumns', JSON.stringify(matchColumns));
      formData.append('updateColumns', JSON.stringify(updateColumns));

      await getAuthAxios().post(
        '/api/System/Central/querynest/CustomCtrl',
        formData
      );

      setSuccess('CSV / DB bulk update completed');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  /* ================= UI ================= */
  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardBody>
            <h4 className="mb-3 text-primary">Bulk Update Manager</h4>

            {error && <CAlert color="danger">{error}</CAlert>}
            {success && <CAlert color="success">{success}</CAlert>}

            {/* ================= NAV ================= */}
            <CNav variant="tabs" className="mb-4">
              <CNavItem>
                <CNavLink active={mode === 'manual'} onClick={() => setMode('manual')}>
                  Update by Select
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink active={mode === 'csv'} onClick={() => setMode('csv')}>
                  Update by CSV / DB
                </CNavLink>
              </CNavItem>
            </CNav>

            {/* ================= COMMON FORM ================= */}
            <CForm>
              <CFormLabel>Database</CFormLabel>
              <CFormSelect value={database} onChange={e => setDatabase(e.target.value)}>
                <option value="">Select Database</option>
                {databases.map(d => <option key={d.name}>{d.name}</option>)}
              </CFormSelect>

              <CFormLabel className="mt-3">Table</CFormLabel>
              <CFormSelect value={collection} onChange={e => setCollection(e.target.value)}>
                <option value="">Select Table</option>
                {collections.map(c => <option key={c.name}>{c.name}</option>)}
              </CFormSelect>
            </CForm>

            {/* =====================================================
               🔹 UPDATE BY SELECT
            ===================================================== */}
            {mode === 'manual' && (
              <CForm className="mt-4">
                <CFormLabel>Header (Match Column)</CFormLabel>
                <CFormSelect value={matchColumn} onChange={e => setMatchColumn(e.target.value)}>
                  <option value="">Select Header</option>
                  {columns.map(c => <option key={c}>{c}</option>)}
                </CFormSelect>

                <CFormLabel className="mt-3">Match Values (comma separated)</CFormLabel>
                <CFormInput
                  placeholder="a@gmail.com,b@gmail.com"
                  value={matchValues}
                  onChange={e => setMatchValues(e.target.value)}
                />

                <CFormLabel className="mt-3">Update Column</CFormLabel>
                <CFormSelect value={updateColumn} onChange={e => setUpdateColumn(e.target.value)}>
                  <option value="">Select Column</option>
                  {columns.map(c => <option key={c}>{c}</option>)}
                </CFormSelect>

                <CFormLabel className="mt-3">Update Values (comma separated)</CFormLabel>
                <CFormInput
                  placeholder="ACTIVE,INACTIVE"
                  value={updateValues}
                  onChange={e => setUpdateValues(e.target.value)}
                />

                <CButton
                  color="primary"
                  className="mt-4 d-flex align-items-center gap-2"
                  onClick={handleManualUpdate}
                >
                  <CIcon icon={cilSave} />
                  Update Records
                </CButton>
              </CForm>
            )}

            {/* =====================================================
               🔹 UPDATE BY CSV / DB
            ===================================================== */}
            {mode === 'csv' && (
              <CForm className="mt-4">
                <CFormLabel>📂 Upload CSV File</CFormLabel>
                <CFormInput type="file" onChange={e => setCsvFile(e.target.files[0])} />

                <CFormLabel className="mt-3">Select Match Columns</CFormLabel>
                <CFormSelect multiple onChange={e =>
                  setMatchColumns([...e.target.selectedOptions].map(o => o.value))
                }>
                  {columns.map(c => <option key={c}>{c}</option>)}
                </CFormSelect>

                <CFormLabel className="mt-3">Select Update Columns</CFormLabel>
                <CFormSelect multiple onChange={e =>
                  setUpdateColumns([...e.target.selectedOptions].map(o => o.value))
                }>
                  {columns.map(c => <option key={c}>{c}</option>)}
                </CFormSelect>

                <CFormLabel className="mt-3">Target Database</CFormLabel>
                <CFormSelect value={targetDatabase} onChange={e => setTargetDatabase(e.target.value)}>
                  <option value="">Select Target DB</option>
                  {databases.map(d => <option key={d.name}>{d.name}</option>)}
                </CFormSelect>

                <CFormLabel className="mt-3">Target Table</CFormLabel>
                <CFormSelect value={targetCollection} onChange={e => setTargetCollection(e.target.value)}>
                  <option value="">Select Target Table</option>
                  {collections.map(c => <option key={c.name}>{c.name}</option>)}
                </CFormSelect>

                <CButton
                  color="success"
                  className="mt-4 d-flex align-items-center gap-2"
                  onClick={handleCsvUpdate}
                >
                  <CIcon icon={cilCloudUpload} />
                  Run Bulk Update
                </CButton>
              </CForm>
            )}

          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default Update;
