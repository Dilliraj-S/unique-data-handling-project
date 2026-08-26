import React, { useState, useEffect, useRef } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CFormTextarea,
  CRow,
  CCol,
  CSpinner,
  CAlert
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilX, cilSave } from '@coreui/icons';
import { Editor } from '@tinymce/tinymce-react';
import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';
import 'tinymce/models/dom';
import 'tinymce/skins/ui/oxide/skin.css';
import 'tinymce/skins/ui/oxide/content.css';
import 'tinymce/skins/content/default/content.css';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/image';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/help';
import 'tinymce/plugins/wordcount';

const TemplateEditor = ({
  show,
  onClose,
  onSave,
  template = null,
  loading = false,
  prefillLoading = false
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [editorType, setEditorType] = useState('wysiwyg');
  const [codeContent, setCodeContent] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [placeholders, setPlaceholders] = useState({ subscriber: [], emailAccount: [] });
  const [loadingPlaceholders, setLoadingPlaceholders] = useState(false);
  const [error, setError] = useState(null);
  const [templateResetCounter, setTemplateResetCounter] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    setIsClient(typeof window !== 'undefined');
  }, []);

  useEffect(() => {
    if (!show) return;

    const initialContent = template?.content || '';
    setTitle(template?.title || '');
    setSubject(template?.subject || '');
    setEditorType('wysiwyg');
    setCodeContent(initialContent);
    setEditorContent(initialContent);
    setTemplateResetCounter(prev => prev + 1);
    setError(null);

    const fetchPlaceholders = async () => {
      setLoadingPlaceholders(true);
      try {
        setPlaceholders({
          subscriber: [
            { value: '[first_name]', label: 'First Name' },
            { value: '[last_name]', label: 'Last Name' },
            { value: '[email]', label: 'Email' },
            { value: '[unsubscribe_link]', label: 'Unsubscribe Link' }
          ],
          emailAccount: [
            { value: '[sender_email]', label: 'Sender Email' },
            { value: '[sender_first_name]', label: 'Sender First Name' },
            { value: '[sender_last_name]', label: 'Sender Last Name' }
          ]
        });
      } catch (err) {
        console.error('Failed to fetch placeholders:', err);
      } finally {
        setLoadingPlaceholders(false);
      }
    };

    fetchPlaceholders();
  }, [show, template]);

  useEffect(() => {
    if (
      templateResetCounter > 0 &&
      show &&
      editorType === 'wysiwyg' &&
      editorRef.current &&
      editorContent !== undefined
    ) {
      editorRef.current.setContent(editorContent || '');
    }
  }, [templateResetCounter, show, editorType]);

  const insertPlaceholder = (value) => {
    if (!value) return;
    if (editorType === 'wysiwyg' && editorRef.current) {
      editorRef.current.insertContent(value);
      setEditorContent(editorRef.current.getContent());
    } else {
      const textarea = document.getElementById('code-editor');
      const current = codeContent;
      if (!textarea) {
        setCodeContent(`${current}${value}`);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextValue = current.substring(0, start) + value + current.substring(end);
      setCodeContent(nextValue);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start + value.length, start + value.length);
      });
    }
  };

  const handleEditorTypeChange = (newType) => {
    if (newType === editorType) return;
    if (newType === 'code' && editorRef.current) {
      const current = editorRef.current.getContent();
      setCodeContent(current);
      setEditorContent(current);
    }
    if (newType === 'wysiwyg') {
      setEditorContent(codeContent);
    }
    setEditorType(newType);
  };

  const getCurrentContent = () => {
    if (editorType === 'wysiwyg') {
      return editorRef.current ? editorRef.current.getContent() : editorContent;
    }
    return codeContent;
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError('Template title is required.');
      return;
    }

    const finalContent = getCurrentContent();
    if (!finalContent || !finalContent.trim()) {
      setError('Template content is required.');
      return;
    }

    onSave({
      title: title.trim(),
      subject: subject.trim(),
      content: finalContent
    });
  };

  const currentContent = getCurrentContent() || '';
  const hasContent = !!currentContent.trim();
  const isFormDisabled = loading || prefillLoading;
  const editorInitConfig = {
    plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount',
    toolbar: 'undo redo | formatselect | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table | code',
    menubar: 'file edit view insert format tools table help',
    height: 400,
    branding: false,
    promotion: false,
    license_key: 'gpl',
    skin: false,
    content_css: false,
    enter: 'br',
    content_style: `
      body {
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.2;
        padding-top: 10px;
        margin: 0;
      }
      br {
        line-height: 1;
      }
      p {
        margin: 0;
        padding-left: 10px;
      }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      table, th, td {
        border: 1px solid #ccc;
        padding: 8px;
      }
      th {
        background-color: #f4f4f4;
      }
    `
  };

  return (
    <CModal visible={show} onClose={onClose} size="xl" backdrop="static">
      <CModalHeader>
        <CModalTitle>{template ? 'Edit Template' : 'Add Template'}</CModalTitle>
        <CButton color="secondary" variant="ghost" onClick={onClose} disabled={loading}>
          <CIcon icon={cilX} />
        </CButton>
      </CModalHeader>
      <CModalBody>
        {(error) && (
          <CAlert color="danger" className="mb-3" dismissible onClose={() => setError(null)}>
            {error}
          </CAlert>
        )}

        {prefillLoading && (
          <div className="d-flex align-items-center gap-2 text-muted mb-3">
            <CSpinner size="sm" />
            <span>Loading template details...</span>
          </div>
        )}

        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel className="fw-semibold">
              Template Title <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter template title"
              maxLength={255}
              disabled={isFormDisabled}
            />
          </CCol>
          <CCol md={6}>
            <CFormLabel className="fw-semibold">Template Subject</CFormLabel>
            <CFormInput
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
              maxLength={255}
              disabled={isFormDisabled}
            />
          </CCol>
        </CRow>

        <div className="mb-3">
          <CFormLabel className="fw-semibold">
            Editor Type <span className="text-danger">*</span>
          </CFormLabel>
          <CFormSelect
            value={editorType}
            onChange={(e) => handleEditorTypeChange(e.target.value)}
            disabled={isFormDisabled}
          >
            <option value="wysiwyg">WYSIWYG Editor</option>
            <option value="code">Advanced Code Editor (HTML)</option>
          </CFormSelect>
        </div>

        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel className="fw-semibold">Subscriber Placeholders</CFormLabel>
            <CFormSelect
              onChange={(e) => {
                insertPlaceholder(e.target.value);
                e.target.value = '';
              }}
              disabled={isFormDisabled || loadingPlaceholders}
            >
              <option value="">Select Subscriber Placeholder</option>
              {placeholders.subscriber.map((ph) => (
                <option key={ph.value} value={ph.value}>
                  {ph.label}
                </option>
              ))}
            </CFormSelect>
            <small className="text-muted">
              Use placeholders like [first_name], [last_name] to personalize for subscribers.
            </small>
          </CCol>
          <CCol md={6}>
            <CFormLabel className="fw-semibold">Sender Placeholders</CFormLabel>
            <CFormSelect
              onChange={(e) => {
                insertPlaceholder(e.target.value);
                e.target.value = '';
              }}
              disabled={isFormDisabled || loadingPlaceholders}
            >
              <option value="">Select Email Account Placeholder</option>
              {placeholders.emailAccount.map((ph) => (
                <option key={ph.value} value={ph.value}>
                  {ph.label}
                </option>
              ))}
            </CFormSelect>
            <small className="text-muted">
              Use placeholders like [sender_email], [sender_first_name] for account details.
            </small>
          </CCol>
        </CRow>

        {editorType === 'wysiwyg' ? (
          <div className="mb-3 position-relative">
            <CFormLabel className="fw-semibold">
              Template Content <span className="text-danger">*</span>
            </CFormLabel>
            <div className="position-relative">
              {prefillLoading && (
                <div
                  className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white bg-opacity-75"
                  style={{ zIndex: 2 }}
                >
                  <CSpinner color="primary" />
                  <p className="mt-2 text-muted">Loading template...</p>
                </div>
              )}
              {isClient ? (
                <Editor
                  key={`template-editor-${templateResetCounter}`}
                  value={editorContent}
                  init={editorInitConfig}
                  disabled={isFormDisabled}
                  onInit={(_evt, editor) => {
                    editorRef.current = editor;
                    if (editorContent) {
                      editor.setContent(editorContent);
                    }
                  }}
                  onEditorChange={(content) => setEditorContent(content)}
                />
              ) : (
                <div className="text-center py-4">
                  <CSpinner color="primary" />
                  <p className="mt-2 text-muted">Preparing editor...</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <CFormLabel className="fw-semibold">
              Template Content (HTML) <span className="text-danger">*</span>
            </CFormLabel>
            <CFormTextarea
              id="code-editor"
              value={codeContent}
              onChange={(e) => setCodeContent(e.target.value)}
              rows={15}
              disabled={isFormDisabled}
              style={{ fontFamily: 'monospace' }}
            />
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          onClick={handleSave}
          disabled={isFormDisabled || !title.trim() || !hasContent}
        >
          {loading && <CSpinner size="sm" className="me-2" />}
          <CIcon icon={cilSave} className="me-2" />
          {template ? 'Update Template' : 'Save Template'}
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default TemplateEditor;
