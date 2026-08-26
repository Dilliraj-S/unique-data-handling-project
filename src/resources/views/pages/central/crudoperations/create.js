import React, { useEffect, useState } from 'react';
import {
  CCard, CCardBody, CCol, CRow, CButton,
  CForm, CFormInput, CFormSelect, CFormLabel,
  CAlert, CSpinner,
  CNav, CNavItem, CNavLink,
  CTable, CTableHead, CTableBody,
  CTableRow, CTableHeaderCell, CTableDataCell,
  CModal, CModalHeader, CModalBody, CModalFooter,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilSave, cilTrash, cilSettings } from '@coreui/icons';
import axios from 'axios';
import AuthService from 'src/application/Services/AuthService';

const Create = () => {
  /* ================= STATE ================= */
  const [mode, setMode] = useState('create'); // create | update
  const [databases, setDatabases] = useState([]);
  const [collections, setCollections] = useState([]);

  const [database, setDatabase] = useState('');
  const [newDatabase, setNewDatabase] = useState('');
  const [collection, setCollection] = useState('');

  const [columns, setColumns] = useState([]);
  const [headerInput, setHeaderInput] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
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
      .then(res => setDatabases(res.data.databases || []))
      .catch(() => setError('Failed to load databases'));
  }, []);

  /* ================= LOAD COLLECTIONS ================= */
  useEffect(() => {
    if (!database || mode !== 'update') return;

    getAuthAxios()
      .get(`/api/import/collections?database=${database}`)
      .then(res => setCollections(res.data.collections || []));
  }, [database, mode]);

  /* ================= LOAD SCHEMA (UPDATE) ================= */
  useEffect(() => {
    if (mode !== 'update' || !database || !collection) return;

    getAuthAxios()
      .get(`/api/System/Central/querynest/getSchema?database=${database}&collection=${collection}`)
      .then(res => {
        if (res.data?.success) {
          setColumns(
            res.data.columns.map(c => ({
              name: c.name,
              dbName: c.name,
              type: c.type || 'string',
              index: c.index || 'none'
            }))
          );
        }
      })
      .catch(() => setColumns([]));
  }, [mode, database, collection]);

  /* ================= OPEN MODAL ================= */
  const openSchemaBuilder = () => {
    const finalDb = newDatabase || database;

    if (!finalDb || !collection) {
      setError('Database and collection are required');
      return;
    }

    setDatabase(finalDb); // 🔥 important
    setError('');
    setShowModal(true);
  };

  /* ================= ADD HEADERS ================= */
  const addHeaders = () => {
    if (!headerInput.trim()) return;

    const headers = headerInput
      .split(',')
      .map(h => h.trim())
      .filter(Boolean);

    const existing = columns.map(c => c.name);

    const newCols = headers
      .filter(h => !existing.includes(h))
      .map(h => ({
        name: h,
        dbName: null, // new field
        type: 'string',
        index: 'none'
      }));

    setColumns([...columns, ...newCols]);
    setHeaderInput('');
  };

  const updateColumn = (i, key, value) => {
    setColumns(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [key]: value };
      return copy;
    });
  };

  const removeColumn = (i) => {
    setColumns(columns.filter((_, idx) => idx !== i));
  };

  /* ================= SAVE ================= */
  const saveSchema = async () => {
    const finalDb = newDatabase || database;

    setLoading(true);
    try {
      const res = await getAuthAxios().post(
        '/api/System/Central/querynest/CustomCtrl',
        { database: finalDb, collection, columns }
      );

      setSuccess(res.data.message || 'Saved successfully');
      setShowModal(false);
      setNewDatabase('');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardBody>
            <h4 className="mb-3">Collection Designer</h4>

            {error && <CAlert color="danger">{error}</CAlert>}
            {success && <CAlert color="success">{success}</CAlert>}

            {/* TABS */}
            <CNav variant="tabs" className="mb-3">
              <CNavItem>
                <CNavLink
                  active={mode === 'create'}
                  onClick={() => {
                    setMode('create');
                    setCollection('');
                    setColumns([]);
                    setDatabase('');
                    setNewDatabase('');
                  }}
                >
                  Create
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={mode === 'update'}
                  onClick={() => {
                    setMode('update');
                    setCollection('');
                    setColumns([]);
                  }}
                >
                  Update
                </CNavLink>
              </CNavItem>
            </CNav>

            {/* FORM */}
            <CForm>
              <CFormLabel>Database</CFormLabel>

              {mode === 'create' ? (
                <>
                  <CFormSelect
                    value={database}
                    onChange={e => {
                      setDatabase(e.target.value);
                      setNewDatabase('');
                    }}
                  >
                    <option value="">Select Existing Database</option>
                    {databases.map(d => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </CFormSelect>

                  <div className="text-center my-2 text-muted">OR</div>

                  <CFormInput
                    placeholder="Create new database name"
                    value={newDatabase}
                    onChange={e => {
                      setNewDatabase(e.target.value);
                      setDatabase('');
                    }}
                  />
                </>
              ) : (
                <CFormSelect value={database} onChange={e => setDatabase(e.target.value)}>
                  <option value="">Select Database</option>
                  {databases.map(d => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </CFormSelect>
              )}

              <CFormLabel className="mt-3">Collection</CFormLabel>

              {mode === 'create' ? (
                <CFormInput
                  placeholder="New collection name"
                  value={collection}
                  onChange={e => setCollection(e.target.value)}
                />
              ) : (
                <CFormSelect value={collection} onChange={e => setCollection(e.target.value)}>
                  <option value="">Select Collection</option>
                  {collections.map(c => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                </CFormSelect>
              )}

              {mode === 'create' ? (
  <CButton
    color="success"
    className="mt-3 d-flex align-items-center gap-2"
    onClick={openSchemaBuilder}
  >
    <CIcon icon={cilPlus} />
    Create Collection
  </CButton>
) : (
  <CButton
    color="info"
    className="mt-3 d-flex align-items-center gap-2"
    onClick={openSchemaBuilder}
    disabled={!collection}
  >
    <CIcon icon={cilSave} />
    Update Collection
  </CButton>
)}

            </CForm>

            {/* MODAL */}
            <CModal visible={showModal} size="lg">
              <CModalHeader>Schema Builder – {collection}</CModalHeader>

              <CModalBody>
                <CFormLabel>Add Columns (comma separated)</CFormLabel>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <CFormInput
                    placeholder="name,email,phone"
                    value={headerInput}
                    onChange={e => setHeaderInput(e.target.value)}
                  />
                  <CButton color="success" variant="outline" onClick={addHeaders}>
                    <CIcon icon={cilPlus} className="me-1" />
                    Add
                  </CButton>
                </div>

                <CTable bordered hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Column</CTableHeaderCell>
                      <CTableHeaderCell>Type</CTableHeaderCell>
                      <CTableHeaderCell>Index</CTableHeaderCell>
                      <CTableHeaderCell />
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {columns.map((c, i) => (
                      <CTableRow key={i}>
                        <CTableDataCell>
                          <CFormInput
                            value={c.name}
                            onChange={e => updateColumn(i, 'name', e.target.value)}
                          />
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormSelect
                            value={c.type}
                            onChange={e => updateColumn(i, 'type', e.target.value)}
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="boolean">Boolean</option>
                          </CFormSelect>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormSelect
                            value={c.index}
                            onChange={e => updateColumn(i, 'index', e.target.value)}
                          >
                            <option value="none">None</option>
                            <option value="index">Index</option>
                            <option value="unique">Unique</option>
                          </CFormSelect>
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeColumn(i)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CModalBody>

              <CModalFooter className="d-flex justify-content-between">
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </CButton>

                <CButton color="primary" onClick={saveSchema} disabled={loading}>
                  {loading ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilSave} className="me-2" />
                      Save Changes
                    </>
                  )}
                </CButton>
              </CModalFooter>
            </CModal>

          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default Create;
