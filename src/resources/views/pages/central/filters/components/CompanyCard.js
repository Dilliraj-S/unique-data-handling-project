import React, { useState } from 'react';
import { CFormCheck, CBadge } from '@coreui/react';

/**
 * CompanyCard — Rich company card with full master_accounts info.
 * Shows logo, company name, domain, industry, employee size, headquarters,
 * founded year, followers, type, specialties, description, and contacts count.
 * 
 * Props:
 *   company - Object with master_accounts fields (enriched from companies-products API)
 *   isSelected - Boolean
 *   onToggleSelect - Function
 *   onClick - Function (click company → show leads)
 *   contactsCount - Number (leads count for this company)
 */
const CompanyCard = ({ company, isSelected, onToggleSelect, onClick, onEdit, contactsCount = 0 }) => {
  const [showDescription, setShowDescription] = useState(false);

  const companyName = company.company_name || company.li_company_name || company.ap_company_name || 'Unnamed Company';
  const domain = company.company_li_smtp || company.li_smtp || '';
  const logo = company.li_logo || null;
  // Cascade: prefer companies_products CSV data → then master_accounts enrichment
  const industry = company.industry || company.li_company_industry || company.ap_industry || company.zm_industry || '';
  const employeeSize = company.employee_size || company.li_company_employee_size || company.zm_empyoyee_size || '';
  const employeesOnLinkedIn = company.employees_on_linked_in || '';
  const headquarters = company.location || company.li_company_headquarters || company.li_hq_address || '';
  const country = company.country || company.li_company_headquarters_country || company.zm_country || '';
  const founded = company.li_company_founded || '';
  const companyType = company.li_type || '';
  const website = company.website || company.li_website || company.zm_website || company.ap_company_website || '';
  const followerCount = company.li_follower_count || '';
  const specialties = company.li_company_specialties || '';
  const description = company.summary || company.li_company_description || company.li_company_about || company.zm_summary || '';
  const linkedinUrl = company.li_company_url || company.ap_company_linkedin_url || '';
  const revenue = company.revenue || '';
  const source = company.source || '';

  return (
    <div
      style={{
        borderRadius: '14px',
        border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
        backgroundColor: '#fff',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = isSelected ? '0 0 0 3px rgba(59,130,246,0.15)' : '0 1px 3px rgba(0,0,0,0.06)';
      }}
    >
      {/* ── Header with Logo ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px 10px',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <CFormCheck
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'pointer', flexShrink: 0 }}
        />
        {/* Logo */}
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {logo ? (
            <img
              src={logo}
              alt={companyName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div style="font-size:1.2rem;color:#94a3b8">🏢</div>';
              }}
            />
          ) : (
            <div style={{ fontSize: '1.2rem', color: '#94a3b8' }}>🏢</div>
          )}
        </div>
        {/* Name + Domain */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontWeight: 700,
            fontSize: '0.92rem',
            color: '#0f172a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }} title={companyName}>
            {companyName}
          </div>
          {domain && (
            <div style={{
              fontSize: '0.72rem',
              color: '#3b82f6',
              fontFamily: 'monospace',
            }} title={domain}>
              🌐 {domain}
            </div>
          )}
        </div>
        {/* Industry Badge */}
        {industry && (
          <span style={{
            flexShrink: 0,
            fontSize: '0.65rem',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: '#f0fdf4',
            color: '#15803d',
            whiteSpace: 'nowrap',
            maxWidth: '110px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }} title={industry}>
            {industry}
          </span>
        )}
      </div>

      {/* ── Info Grid ── */}
      <div style={{ padding: '10px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Row 1: Employee Size + Employees on LinkedIn */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {employeeSize && (
            <InfoItem label="Employees" value={employeeSize} icon="👥" />
          )}
          {employeesOnLinkedIn && (
            <InfoItem label="On LinkedIn" value={employeesOnLinkedIn} icon="💼" />
          )}
        </div>

        {/* Row 2: Headquarters + Country */}
        {(headquarters || country) && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {headquarters && (
              <InfoItem label="Headquarters" value={headquarters} icon="📍" />
            )}
            {country && !headquarters && (
              <InfoItem label="Country" value={country} icon="🌍" />
            )}
          </div>
        )}

        {/* Row 3: Founded + Type + Followers */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {founded && (
            <InfoItem label="Founded" value={founded} icon="📅" />
          )}
          {companyType && (
            <InfoItem label="Type" value={companyType} icon="🏛️" />
          )}
          {followerCount && (
            <InfoItem label="Followers" value={Number(followerCount).toLocaleString()} icon="⭐" />
          )}
        </div>

        {/* Row 4: Revenue + Source */}
        {(revenue || source) && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {revenue && (
              <InfoItem label="Revenue" value={revenue} icon="💰" />
            )}
            {source && (
              <InfoItem label="Source" value={source} icon="📋" />
            )}
          </div>
        )}

        {/* Row 4: Website */}
        {website && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>🔗</span>
            <a
              href={website.startsWith('http') ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: '0.78rem',
                color: '#3b82f6',
                textDecoration: 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={website}
            >
              {website.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          </div>
        )}

        {/* Specialties */}
        {specialties && (
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
              Specialties
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {specialties.split(',').slice(0, 4).map((s, i) => (
                <span key={i} style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#eff6ff',
                  color: '#1e40af',
                  whiteSpace: 'nowrap',
                }}>
                  {s.trim()}
                </span>
              ))}
              {specialties.split(',').length > 4 && (
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  +{specialties.split(',').length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Description (collapsible) */}
        {description && (
          <div>
            <div
              style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); setShowDescription(!showDescription); }}
            >
              About {showDescription ? '▲' : '▼'}
            </div>
            {showDescription && (
              <div style={{
                fontSize: '0.78rem',
                color: '#475569',
                lineHeight: 1.5,
                marginTop: '4px',
                maxHeight: '80px',
                overflowY: 'auto',
              }}>
                {description}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer: Contacts Count + LinkedIn Link ── */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fafbfc',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CBadge color="primary" style={{ fontSize: '0.72rem' }}>
            {(contactsCount || company.contacts_count || 0).toLocaleString()} Contacts
          </CBadge>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: '0.72rem', color: '#0077b5', textDecoration: 'none', fontWeight: 600 }}
              title="View on LinkedIn"
            >
              LinkedIn ↗
            </a>
          )}
          {typeof onEdit === 'function' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(company); }}
              title="Edit company"
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
    </div>
  );
};

/**
 * Small info item for the card grid
 */
const InfoItem = ({ label, value, icon }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
      <span style={{ fontSize: '0.7rem' }}>{icon}</span>
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
    </div>
    <div style={{
      fontSize: '0.78rem',
      fontWeight: 500,
      color: '#334155',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }} title={value}>
      {value}
    </div>
  </div>
);

export default CompanyCard;
