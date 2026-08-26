import React from 'react';
import { CFormCheck } from '@coreui/react';

/**
 * ProductCard — Clean, compact SaaS-style product card.
 * No CCard/CCardHeader used — pure divs for full control.
 */
const ProductCard = ({ product, isSelected, onToggleSelect, onClick, onEdit, formatDate }) => {

  const cardStyle = {
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  };

  const labelStyle = {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#94a3b8',
    marginBottom: '2px',
  };

  const valueStyle = {
    fontSize: '0.82rem',
    fontWeight: 500,
    color: '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
      }}
    >
      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        padding: '12px 16px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #e2e8f0',
      }}>
        {/* Left: checkbox + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <CFormCheck
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: 'pointer', flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 600,
              fontSize: '0.9rem',
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }} title={product.product_name || 'Unnamed Product'}>
              {product.product_name || 'Unnamed Product'}
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: '#94a3b8',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }} title={product.product_id}>
              {product.product_id}
            </div>
          </div>
        </div>

        {/* Right: category badge + edit icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {product.category && (
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              whiteSpace: 'nowrap',
            }}>
              {product.category}
            </span>
          )}
          {typeof onEdit === 'function' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(product); }}
              title="Edit product"
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                fontSize: '0.8rem',
                color: '#64748b'
              }}
            >
              ✏️
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Section 1: Description */}
        <div style={{ marginBottom: '10px' }}>
          <div style={labelStyle}>Description</div>
          <div style={{
            fontSize: '0.82rem',
            lineHeight: '1.45',
            color: '#475569',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }} title={product.description}>
            {product.description || 'No description'}
          </div>
        </div>

        {/* Section 2: Vendor / Parent — with divider */}
        <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '10px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={labelStyle}>Vendor</div>
              <div style={valueStyle} title={product.vendor}>{product.vendor || '—'}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={labelStyle}>Parent Product</div>
              <div style={valueStyle} title={product.pp_name}>{product.pp_name || '—'}</div>
            </div>
          </div>
        </div>

        {/* Section 3: Companies / Contacts badges */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 10px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          marginBottom: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Companies</span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: product.companies_count > 0 ? '#dbeafe' : '#f1f5f9',
              color: product.companies_count > 0 ? '#1d4ed8' : '#94a3b8',
            }}>
              {product.companies_count || 0}
            </span>
          </div>
          <div style={{ width: '1px', height: '14px', backgroundColor: '#e2e8f0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Contacts</span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: '#dcfce7',
              color: '#15803d',
            }}>
              {product.contacts_count || 0}
            </span>
          </div>
        </div>

        {/* Section 4: Footer */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '8px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {formatDate ? formatDate(product.created_at) : '—'}
          </span>
          {product.created_by && (
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              {product.created_by}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
