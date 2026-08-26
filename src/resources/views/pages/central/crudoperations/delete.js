import React, { useEffect, useState } from 'react';
import {
  CCard, CCardBody, CCol, CRow, CButton,
  CForm, CFormInput, CFormSelect, CFormLabel,
  CAlert,
  CNav, CNavItem, CNavLink,
  CModal, CModalHeader, CModalBody, CModalFooter,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilTrash } from '@coreui/icons';
import axios from 'axios';
import AuthService from 'src/application/Services/AuthService';

const Delete = () => {
  /* ================= STATE ================= */
  const [mode, setMode] = useState('column'); // column | value | duplicate | collection
  const [collectionAction, setCollectionAction] = useState('empty'); // empty | drop

  const [databases, setDatabases] = useState([]);
  const [collections, setCollections] = useState([]);
  const [columns, setColumns] = useState([]);

  const [database, setDatabase] = useState('');
  const [collection, setCollection] = useState('');
  const [column, setColumn] = useState('');

  // 🔥 multiple values support
  const [values, setValues] = useState([]);
  const [valueInput, setValueInput] = useState('');

  const [preview, setPreview] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* ================= AXIOS ================= */
  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  /* ================= LOAD DATABASES ================= */
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
      .get(`/api/System/Central/crudoperations/getSchema?database=${database}&collection=${collection}`)
      .then(res => {
        if (res.data?.success) {
          setColumns(res.data.columns.map(c => c.name));
        }
      });
  }, [database, collection]);

  /* ================= LIVE PREVIEW ================= */
  useEffect(() => {
    if (!database || !collection) {
      setPreview(null);
      return;
    }

    let type = '';

    if (mode === 'column' && column) type = 'delete_column';
    if (mode === 'value' && column && values.length) type = 'delete_value';
    if (mode === 'duplicate' && column) type = 'delete_duplicate';
    if (mode === 'collection') {
      type = collectionAction === 'empty'
        ? 'empty_collection'
        : 'drop_collection';
    }

    if (!type) {
      setPreview(null);
      return;
    }

    getAuthAxios()
      .post('/api/System/Central/crudoperations/CustomCtrl', {
        action: 'preview',
        type,
        database,
        collection,
        column,
        values
      })
      .then(res => {
        if (res.data?.success) {
          setPreview(res.data);
        }
      })
      .catch(() => setPreview(null));

  }, [mode, database, collection, column, values, collectionAction]);

  /* ================= DELETE HANDLER ================= */
  const handleDelete = async () => {
    try {
      let action = '';

      if (mode === 'column') action = 'delete_column';
      if (mode === 'value') action = 'delete_value';
      if (mode === 'duplicate') action = 'delete_duplicate';
      if (mode === 'collection') {
        action = collectionAction === 'empty'
          ? 'empty_collection'
          : 'drop_collection';
      }

      await getAuthAxios().post(
        '/api/System/Central/crudoperations/CustomCtrl',
        {
          action,
          database,
          collection,
          column,
          values
        }
      );

      setSuccess('Operation completed successfully');
      setConfirm(false);
      setPreview(null);
      setValues([]);
      setValueInput('');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardBody>
            <h4 className="mb-3 text-danger">Delete Manager</h4>

            {error && <CAlert color="danger">{error}</CAlert>}
            {success && <CAlert color="success">{success}</CAlert>}

            {/* ================= NAV TABS ================= */}
            <CNav variant="tabs" className="mb-3">
              <CNavItem>
                <CNavLink active={mode === 'column'} onClick={() => setMode('column')}>
                  Delete Column
                </CNavLink>
              </CNavItem>

              <CNavItem>
                <CNavLink active={mode === 'value'} onClick={() => setMode('value')}>
                  Delete by Value
                </CNavLink>
              </CNavItem>

              <CNavItem>
                <CNavLink active={mode === 'duplicate'} onClick={() => setMode('duplicate')}>
                  Delete Duplicates
                </CNavLink>
              </CNavItem>

              <CNavItem>
                <CNavLink active={mode === 'collection'} onClick={() => setMode('collection')}>
                  Empty / Delete Collection
                </CNavLink>
              </CNavItem>
            </CNav>

            <CForm>
              <CFormLabel>Database</CFormLabel>
              <CFormSelect value={database} onChange={e => setDatabase(e.target.value)}>
                <option value="">Select Database</option>
                {databases.map(d => <option key={d.name}>{d.name}</option>)}
              </CFormSelect>

              <CFormLabel className="mt-3">Collection</CFormLabel>
              <CFormSelect value={collection} onChange={e => setCollection(e.target.value)}>
                <option value="">Select Collection</option>
                {collections.map(c => <option key={c.name}>{c.name}</option>)}
              </CFormSelect>

              {(mode === 'column' || mode === 'value' || mode === 'duplicate') && (
                <>
                  <CFormLabel className="mt-3">Column</CFormLabel>
                  <CFormSelect value={column} onChange={e => setColumn(e.target.value)}>
                    <option value="">Select Column</option>
                    {columns.map(c => <option key={c}>{c}</option>)}
                  </CFormSelect>
                </>
              )}

              {/* ===== MULTI VALUE INPUT ===== */}
              {mode === 'value' && (
                <>
                  <CFormLabel className="mt-3">Values (comma separated)</CFormLabel>
                  <CFormInput
                    placeholder="eg: admin,user,guest"
                    value={valueInput}
                    onChange={e => {
                      const input = e.target.value;
                      setValueInput(input);
                      setValues(
                        input.split(',').map(v => v.trim()).filter(Boolean)
                      );
                    }}
                  />

                  {values.length > 0 && (
                    <div className="mt-2 d-flex flex-wrap gap-2">
                      {values.map((v, i) => (
                        <span key={i} className="badge bg-secondary">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ===== COLLECTION ACTION ===== */}
              {mode === 'collection' && (
                <>
                  <CFormLabel className="mt-3">Action</CFormLabel>

                  <div className="form-check">
                    <input
                      type="radio"
                      className="form-check-input"
                      checked={collectionAction === 'empty'}
                      onChange={() => setCollectionAction('empty')}
                    />
                    <label className="form-check-label">
                      Empty collection (delete all documents)
                    </label>
                  </div>

                  <div className="form-check mt-2">
                    <input
                      type="radio"
                      className="form-check-input"
                      checked={collectionAction === 'drop'}
                      onChange={() => setCollectionAction('drop')}
                    />
                    <label className="form-check-label text-danger">
                      Delete entire collection
                    </label>
                  </div>
                </>
              )}

              {/* ================= LIVE PREVIEW ================= */}
              {preview && (
                <CAlert color="warning" className="mt-3">
                  ⚠️ <strong>{preview.count}</strong> documents will be affected
                  <br />
                  ⏱️ Estimated time: <strong>{preview.estimate}</strong>
                </CAlert>
              )}

              <CButton
                color="danger"
                className="mt-4 d-flex align-items-center gap-2"
                disabled={
                  !database ||
                  !collection ||
                  ((mode === 'column' || mode === 'duplicate') && !column) ||
                  (mode === 'value' && (!column || !values.length))
                }
                onClick={() => setConfirm(true)}
              >
                <CIcon icon={cilTrash} />
                Confirm Delete
              </CButton>
            </CForm>

            {/* ================= CONFIRM MODAL ================= */}
            <CModal visible={confirm}>
              <CModalHeader className="text-danger">Confirm Delete</CModalHeader>
              <CModalBody>
                {mode === 'value'
                  ? `This will permanently delete records where "${column}" IN (${values.join(', ')}).`
                  : mode === 'collection'
                  ? collectionAction === 'empty'
                    ? `This will delete ALL documents inside "${collection}".`
                    : `This will permanently DELETE the collection "${collection}".`
                  : 'This action cannot be undone.'}
              </CModalBody>
              <CModalFooter>
                <CButton color="secondary" onClick={() => setConfirm(false)}>
                  Cancel
                </CButton>
                <CButton color="danger" onClick={handleDelete}>
                  Confirm Delete
                </CButton>
              </CModalFooter>
            </CModal>

          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default Delete;
