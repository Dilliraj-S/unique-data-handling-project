/**
 * FilterSidebar Component - Modern B2B SaaS Design
 * Enterprise-grade filter sidebar with elegant UI/UX
 * Matches table design system with purple gradient theme
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  CCard,
  CCardBody,
  CFormInput,
  CFormSelect,
  CButton,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
  CBadge
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilX, cilArrowBottom, cilArrowTop, cilFilter, cilSearch, cilOptions } from '@coreui/icons';
import AuthService from '../Services/AuthService';

/**
 * Enhanced TagInput Component with Modern Design
 * Features:
 * - Elegant suggestions dropdown
 * - Smooth animations
 * - Better visual feedback
 * - Professional styling
 */
const TagInput = ({ value = [], onChange, placeholder, id, category, onSuggestionSelect }) => {
  const [inputValue, setInputValue] = useState('');
  const [tags, setTags] = useState(value || []);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    setTags(value || []);
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Fetch predefined filter suggestions from API
   */
  const fetchSuggestions = async (categoryId, searchTerm = '') => {
    if (!categoryId || categoryId.trim() === '') {
      setSuggestions([]);
      return;
    }

    try {
      setLoadingSuggestions(true);
      setSuggestionError(null);

      const authToken = AuthService.getToken();
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const params = new URLSearchParams({ category: categoryId });
      if (searchTerm && searchTerm.trim()) {
        params.append('q', searchTerm.trim());
      }

      const response = await fetch(`/api/filter-options?${params.toString()}`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          AuthService.logout();
          window.location.href = '/login';
          throw new Error('Session expired');
        }
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch suggestions' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.status && Array.isArray(result.data)) {
        setSuggestions(result.data);
        setShowSuggestions(true);
        setFocusedIndex(-1);
      } else {
        setSuggestions([]);
        setSuggestionError(result.message || 'No suggestions available');
      }
    } catch (error) {
      console.error('Error fetching filter suggestions:', error);
      setSuggestions([]);
      setSuggestionError(error.message || 'Failed to load suggestions');
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleFocus = () => {
    if (category) {
      fetchSuggestions(category, inputValue);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (category) {
        fetchSuggestions(category, newValue);
      }
    }, 300);
  };

  const handleSuggestionClick = (suggestion) => {
    const suggestionValue = suggestion.value || suggestion.option;
    
    if (suggestionValue && !tags.includes(suggestionValue)) {
      const newTags = [...tags, suggestionValue];
      setTags(newTags);
      onChange(newTags);
      
      if (onSuggestionSelect) {
        onSuggestionSelect(suggestion);
      }
    }
    
    setInputValue('');
    setShowSuggestions(false);
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : -1);
        return;
      }
      if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        handleSuggestionClick(suggestions[focusedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        setFocusedIndex(-1);
        return;
      }
    }

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed && !tags.includes(trimmed)) {
        const newTags = [...tags, trimmed];
        setTags(newTags);
        onChange(newTags);
        setInputValue('');
        setShowSuggestions(false);
      }
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      const newTags = tags.slice(0, -1);
      setTags(newTags);
      onChange(newTags);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    onChange(newTags);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        className="tagify-input-wrapper" 
        style={{ 
          border: '1px solid #E9EDF4', 
          borderRadius: '6px', 
          padding: '4px 8px',
          minHeight: '36px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#fff',
          cursor: 'text',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}
        onFocus={() => {
          if (inputRef.current) inputRef.current.focus();
        }}
      >
        {tags.map((tag, index) => (
          <span
            key={index}
            className="badge"
            style={{
              background: 'linear-gradient(135deg, #9369f3 0%, #7c5cf0 100%)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(147, 105, 243, 0.3)'
            }}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.3)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '0',
                marginLeft: '2px',
                fontSize: '14px',
                lineHeight: '1',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              aria-label="Remove tag"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          id={id}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          style={{
            border: 'none',
            outline: 'none',
            flex: 1,
            minWidth: '100px',
            fontSize: '13px',
            padding: '4px 0',
            color: '#495057',
            background: 'transparent'
          }}
        />
      </div>

      {/* Enhanced Suggestions Dropdown */}
      {showSuggestions && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: '#fff',
            border: '1px solid #E9EDF4',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: '4px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          {loadingSuggestions ? (
            <div style={{ 
              padding: '12px 16px', 
              color: '#6c757d', 
              fontSize: '12px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '14px',
                height: '14px',
                border: '2px solid #E9EDF4',
                borderTopColor: '#9369f3',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite'
              }} />
              Loading suggestions...
            </div>
          ) : suggestionError ? (
            <div style={{ 
              padding: '12px 16px', 
              color: '#dc3545', 
              fontSize: '12px',
              background: '#fff5f5',
              borderLeft: '3px solid #dc3545'
            }}>
              {suggestionError}
            </div>
          ) : suggestions.length === 0 ? (
            <div style={{ 
              padding: '12px 16px', 
              color: '#6c757d', 
              fontSize: '12px',
              textAlign: 'center'
            }}>
              No suggestions available
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <div
                key={suggestion.option_id || index}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  borderBottom: index < suggestions.length - 1 ? '1px solid #F3F4F6' : 'none',
                  backgroundColor: focusedIndex === index ? '#F9FAFB' : 'transparent',
                  transition: 'background-color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={() => setFocusedIndex(index)}
                onMouseLeave={() => setFocusedIndex(-1)}
              >
                {suggestion.color && (
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '2px',
                      backgroundColor: suggestion.color,
                      display: 'inline-block',
                      flexShrink: 0
                    }}
                  />
                )}
                <span style={{ flex: 1, color: '#495057' }}>
                  {suggestion.value || suggestion.option}
                </span>
                {suggestion.description && (
                  <span 
                    style={{ 
                      color: '#9CA3AF', 
                      fontSize: '11px',
                      opacity: 0.7
                    }} 
                    title={suggestion.description}
                  >
                    ℹ️
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const BOUNCE_CATEGORIES = [
  { value: 'unsubscribe', label: 'Unsubscribe' },
  { value: 'automatic_reply', label: 'Automatic Reply' },
  { value: 'no_longer', label: 'No Longer Interested' },
  { value: 'hard_bounce', label: 'Hard Bounce' },
  { value: 'soft_bounce', label: 'Soft Bounce' },
  { value: 'other', label: 'Other' }
];

const FilterSidebar = ({
  columns = [],
  filters = {},
  onFiltersChange,
  token = '',
  onClearAll,
  activeFilterCount = 0
}) => {
  const [localFilters, setLocalFilters] = useState({
    search: filters.search || '',
    dateRange: filters.dateRange || {},
    columns: filters.columns ? { ...filters.columns } : {},
    filterType: filters.filterType ? { ...filters.filterType } : {},
    sort: filters.sort || {},
    pagination: filters.pagination || { page: 1, limit: 25 },
    export: filters.export || {}
  });



  const prevFiltersPropRef = useRef('');
  
  useEffect(() => {
    const filtersString = JSON.stringify({
      search: filters.search || '',
      dateRange: filters.dateRange || {},
      columns: filters.columns || {},
      filterType: filters.filterType || {},
      sort: filters.sort || {},
      pagination: filters.pagination || { page: 1, limit: 25 },
      export: filters.export || {}
    });

    if (filtersString !== prevFiltersPropRef.current) {
      prevFiltersPropRef.current = filtersString;
      
      setLocalFilters(prev => {
        const incomingColumns = filters.columns || {};
        const prevColumns = prev.columns || {};
        const incomingFilterTypes = filters.filterType || {};
        const prevFilterTypes = prev.filterType || {};
        
        const mergedColumns = { ...prevColumns };
        
        Object.keys(incomingColumns).forEach(key => {
          const incomingValue = incomingColumns[key]?.search?.value;
          const hasValues = Array.isArray(incomingValue) 
            ? incomingValue.length > 0 
            : (incomingValue && String(incomingValue).trim().length > 0);
          
          if (hasValues) {
            mergedColumns[key] = incomingColumns[key];
          } else if (key in incomingColumns) {
            delete mergedColumns[key];
          }
        });
        
        const mergedFilterTypes = { ...prevFilterTypes, ...incomingFilterTypes };
        
        return {
          search: filters.search !== undefined ? filters.search : prev.search,
          dateRange: filters.dateRange ? { ...prev.dateRange, ...filters.dateRange } : prev.dateRange,
          columns: mergedColumns,
          filterType: mergedFilterTypes,
          sort: filters.sort ? { ...prev.sort, ...filters.sort } : prev.sort,
          pagination: filters.pagination || prev.pagination || { page: 1, limit: 25 },
          export: filters.export ? { ...prev.export, ...filters.export } : prev.export
        };
      });
    }
  }, [filters]);

  const onFiltersChangeRef = useRef(onFiltersChange);
  const lastFiltersStringRef = useRef('');
  
  useEffect(() => {
    onFiltersChangeRef.current = onFiltersChange;
  }, [onFiltersChange]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onFiltersChangeRef.current) {
        const currentFiltersString = JSON.stringify(localFilters);
        
        if (currentFiltersString !== lastFiltersStringRef.current) {
          lastFiltersStringRef.current = currentFiltersString;
          
          // CRITICAL: Send complete filter object to preserve all filters when merging
          // This ensures multiple filters work together without resetting each other
          // CRITICAL: Only send dateRange when BOTH from and to dates are selected
          // This prevents single-date selections from triggering filtering
          const cleanedDateRange = (() => {
            const dr = localFilters.dateRange || {};
            const cleaned = {};
            Object.keys(dr).forEach(key => {
              if (key === 'column') return; // Skip metadata key
              const range = dr[key];
              if (range && range.from && range.to) {
                cleaned[key] = range;
                cleaned.column = key;
              }
            });
            return cleaned;
          })();

          const filtersToSend = {
            search: localFilters.search !== undefined ? localFilters.search : '',
            dateRange: cleanedDateRange,
            columns: localFilters.columns || {},
            filterType: localFilters.filterType || {},
            sort: localFilters.sort || {},
            pagination: localFilters.pagination || { page: 1, limit: 25 },
            export: localFilters.export || {},
            processId: localFilters.processId || null
          };
          
          console.log('📤 FilterSidebar - Sending filters:', {
            columns: Object.keys(filtersToSend.columns),
            filterType: filtersToSend.filterType,
            hasDateRange: Object.keys(filtersToSend.dateRange).filter(k => k !== 'column').length > 0,
            search: filtersToSend.search
          });
          
          onFiltersChangeRef.current(filtersToSend);
        }
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localFilters]);

  const handleColumnFilter = (column, value, filterType) => {
    setLocalFilters(prev => {
      // CRITICAL: Preserve all existing filters when updating one column
      // This ensures multiple filters work together without resetting each other
      const newColumns = { ...prev.columns };
      const newFilterType = { ...(prev.filterType || {}) };
      let values = [];
      
      if (Array.isArray(value)) {
        values = value.filter(v => v && String(v).trim());
      } else if (value) {
        values = String(value).split(',').map(v => v.trim()).filter(v => v);
      }
      
      // CRITICAL FIX: Always update filterType if provided, even if values are empty
      // This ensures filterType persists when user changes mode without values
      if (filterType && filterType !== '') {
        newFilterType[column] = filterType;
      }
      
      // Update column filter values
      if (values.length > 0) {
        newColumns[column] = {
          search: { value: values }
        };
      } else {
        if (newFilterType[column]) {
          // Keep filterType and maintain column entry with empty values
          newColumns[column] = {
            search: { value: [] }
          };
        } else {
          // Only remove if both filterType and values are empty
          delete newColumns[column];
          delete newFilterType[column];
        }
      }

      console.log(`🔧 FilterSidebar.handleColumnFilter - Updated filter for "${column}":`, {
        filterType: newFilterType[column],
        hasValues: values.length > 0,
        valuesCount: values.length,
        hasColumnEntry: !!newColumns[column]
      });

      // CRITICAL: Preserve all other filter properties (dateRange, search, sort, etc.)
      return {
        ...prev,
        columns: newColumns,
        filterType: newFilterType,
        pagination: { ...prev.pagination, page: 1 } // Reset to page 1 when filter changes
      };
    });
  };

  const handleSearchChange = (value) => {
    setLocalFilters(prev => ({
      ...prev,
      search: value,
      pagination: { ...prev.pagination, page: 1 }
    }));
  };

  const handleDateRangeChange = (from, to) => {
    setLocalFilters(prev => {
      // CRITICAL: Preserve all existing filters when updating date range
      // Only update the dateRange, keep all other filters intact
      const newDateRange = {
        ...prev.dateRange,
        created_at: { from, to },
        column: 'created_at'
      };
      
      // If both dates are empty, clear the date range
      if (!from && !to) {
        delete newDateRange.created_at;
        delete newDateRange.column;
      }
      
      return {
        ...prev,
        dateRange: newDateRange,
        pagination: { ...prev.pagination, page: 1 } // Reset to page 1 when date range changes
      };
    });
  };



  const clearAllFilters = () => {
    const clearedFilters = {
      search: '',
      dateRange: {},
      columns: {},
      filterType: {},
      sort: localFilters.sort,
      pagination: localFilters.pagination,
      export: {}
    };
    setLocalFilters(clearedFilters);
    if (onClearAll) {
      onClearAll();
    }
  };

  // Flat list of all filterable columns (no grouping)
  const allFilterColumns = columns.filter(
    col => col.data !== 'selection' && col.data !== 'actions' && !col.isDate
  );
  const hasActiveFilters = activeFilterCount > 0 || localFilters.search || 
    Object.keys(localFilters.columns || {}).length > 0 ||
    Object.keys(localFilters.dateRange || {}).filter(k => k !== 'column').length > 0;

  return (
    <div 
      className="filter-sidebar"
      style={{
        width: '340px',
        minWidth: '340px',
        backgroundColor: '#fff',
        borderRight: '1px solid #E9EDF4',
        height: '100%',
        overflowY: 'auto',
        padding: '0',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)'
      }}
    >
      {/* Modern Header with Gradient */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #9369f3 0%, #7c5cf0 100%)',
          padding: '16px 20px',
          color: '#fff',
          borderBottom: '1px solid rgba(255,255,255,0.15)'
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <CIcon icon={cilFilter} style={{ fontSize: '18px' }} />
            <h5 className="mb-0" style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              letterSpacing: '0.3px'
            }}>
              Filters
            </h5>
            {hasActiveFilters && (
              <CBadge 
                style={{
                  background: 'rgba(255,255,255,0.25)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}
              >
                {activeFilterCount}
              </CBadge>
            )}
          </div>
          {hasActiveFilters && (
            <CButton
              color="link"
              size="sm"
              onClick={clearAllFilters}
              className="p-0"
              style={{
                color: '#fff',
                fontSize: '12px',
                fontWeight: '500',
                textDecoration: 'none',
                opacity: 0.9,
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '1'}
              onMouseLeave={(e) => e.target.style.opacity = '0.9'}
              title="Clear All Filters"
            >
              Clear All
            </CButton>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: '20px' }}>
        {/* Global Search */}
        <div className="mb-4">
          <label 
            className="form-label" 
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}
          >
            <CIcon icon={cilSearch} style={{ fontSize: '12px', marginRight: '6px' }} />
            Search
          </label>
          <CFormInput
            type="search"
            placeholder="Search filters or values..."
            value={localFilters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              fontSize: '13px',
              padding: '8px 12px',
              border: '1px solid #E9EDF4',
              borderRadius: '6px',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#9369f3';
              e.target.style.boxShadow = '0 0 0 3px rgba(147, 105, 243, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E9EDF4';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Date Range */}
        <div className="mb-4">
          <label 
            className="form-label" 
            style={{
              fontSize: '12px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px',
              display: 'block'
            }}
          >
            Date Range
          </label>
          <div className="d-flex gap-2">
            <CFormInput
              type="date"
              size="sm"
              placeholder="From"
              value={localFilters.dateRange?.created_at?.from || ''}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDateRangeChange(
                  e.target.value,
                  localFilters.dateRange?.created_at?.to || ''
                );
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              style={{
                flex: 1,
                fontSize: '12px',
                padding: '6px 10px',
                border: '1px solid #E9EDF4',
                borderRadius: '6px'
              }}
            />
            <CFormInput
              type="date"
              size="sm"
              placeholder="To"
              value={localFilters.dateRange?.created_at?.to || ''}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDateRangeChange(
                  localFilters.dateRange?.created_at?.from || '',
                  e.target.value
                );
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              style={{
                flex: 1,
                fontSize: '12px',
                padding: '6px 10px',
                border: '1px solid #E9EDF4',
                borderRadius: '6px'
              }}
            />
          </div>
        </div>

        {/* Bounce Category Filter — only rendered when status/category column exists */}
        {columns.some(col => col.data === 'status' || col.data === 'category') && (
          <div className="mb-4">
            <label 
              className="form-label" 
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px',
                display: 'block'
              }}
            >
              Bounce Category
            </label>
            <CFormSelect
              size="sm"
              value={
                (localFilters.columns?.status?.search?.value?.[0]) || 
                (localFilters.columns?.category?.search?.value?.[0]) || 
                ''
              }
              onChange={(e) => {
                const val = e.target.value;
                const targetCol = columns.find(c => c.data === 'status') ? 'status' : 'category';
                
                if (val === '') {
                  handleColumnFilter(targetCol, [], 'strict');
                } else if (val === 'other') {
                  handleColumnFilter(targetCol, ['__NULL__', '__UNDEFINED__', 'other'], 'other_status');
                } else {
                  handleColumnFilter(targetCol, [val], 'strict');
                }
              }}
              style={{
                fontSize: '13px',
                padding: '8px 12px',
                border: '1px solid #E9EDF4',
                borderRadius: '6px'
              }}
            >
              <option value="">All Categories</option>
              {BOUNCE_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </CFormSelect>
          </div>
        )}

        {/* All Column Filters — flat list, no groups */}
        {allFilterColumns.map(col => (
          <div key={col.data} className="mb-4">
            <label 
              className="form-label" 
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px',
                display: 'block'
              }}
            >
              {col.title}
            </label>
            <TagInput
              value={Array.isArray(localFilters.columns[col.data]?.search?.value)
                ? localFilters.columns[col.data].search.value
                : (localFilters.columns[col.data]?.search?.value 
                    ? String(localFilters.columns[col.data].search.value).split(',').map(v => v.trim()).filter(v => v)
                    : [])}
              onChange={(values) => {
                const filterType = localFilters.filterType[col.data] || 'strict';
                handleColumnFilter(col.data, values, filterType);
              }}
              placeholder={`Search ${col.title}`}
              id={`filter-${token}-${col.data}`}
              category={col.data}
              onSuggestionSelect={(suggestion) => {
                const filterType = localFilters.filterType[col.data] || 'strict';
                const newValues = Array.isArray(localFilters.columns[col.data]?.search?.value)
                  ? [...localFilters.columns[col.data].search.value, suggestion.value]
                  : [suggestion.value];
                handleColumnFilter(col.data, newValues, filterType);
              }}
            />
            <CFormSelect
              size="sm"
              className="mt-2"
              value={localFilters.filterType?.[col.data] || 'strict'}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const currentValues = Array.isArray(localFilters.columns[col.data]?.search?.value)
                  ? [...localFilters.columns[col.data].search.value]
                  : (localFilters.columns[col.data]?.search?.value 
                      ? String(localFilters.columns[col.data].search.value).split(',').map(v => v.trim()).filter(v => v)
                      : []);
                
                const newFilterType = e.target.value;
                
                console.log(`🔄 FilterSidebar - Changing filterType for "${col.data}":`, {
                  from: localFilters.filterType?.[col.data] || 'strict',
                  to: newFilterType,
                  hasValues: currentValues.length > 0,
                  values: currentValues
                });
                
                setLocalFilters(prev => {
                  const updatedFilterType = { ...(prev.filterType || {}) };
                  updatedFilterType[col.data] = newFilterType;
                  
                  const updatedColumns = { ...prev.columns };
                  if (currentValues.length === 0 && newFilterType) {
                    updatedColumns[col.data] = {
                      search: { value: [] }
                    };
                  } else if (currentValues.length > 0) {
                    updatedColumns[col.data] = {
                      search: { value: currentValues }
                    };
                  }
                  
                  return {
                    ...prev,
                    columns: updatedColumns,
                    filterType: updatedFilterType,
                    pagination: { ...prev.pagination, page: 1 }
                  };
                });
                
                handleColumnFilter(col.data, currentValues, newFilterType);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              style={{
                fontSize: '12px',
                padding: '6px 10px',
                border: '1px solid #E9EDF4',
                borderRadius: '6px',
                backgroundColor: '#F9FAFB'
              }}
            >
              <option value="strict">Strict</option>
              <option value="partial">Partial</option>
              <option value="starts_with">Starts With</option>
              <option value="ends_with">Ends With</option>
              {['id', '_id'].includes(col.data) && (
                <>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                </>
              )}
              <option value="not">Not</option>
            </CFormSelect>
          </div>
        ))}

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div 
            className="mt-4 pt-4" 
            style={{ 
              borderTop: '2px solid #F3F4F6',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <label 
              className="form-label" 
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#6B7280',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block'
              }}
            >
              Active Filters
            </label>
            <div className="d-flex flex-wrap gap-2">
              {localFilters.search && (
                <CBadge 
                  style={{
                    background: 'linear-gradient(135deg, #9369f3 0%, #7c5cf0 100%)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '500',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(147, 105, 243, 0.3)'
                  }}
                >
                  Search: {localFilters.search}
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    style={{
                      background: 'rgba(255,255,255,0.3)',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      padding: '0',
                      fontSize: '14px',
                      lineHeight: '1',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </CBadge>
              )}
              {Object.keys(localFilters.columns || {}).map(col => {
                const filter = localFilters.columns[col];
                const values = Array.isArray(filter?.search?.value)
                  ? filter.search.value
                  : (filter?.search?.value ? String(filter.search.value).split(',') : []);
                return values.map((val, idx) => {
                  const colMeta = columns.find(c => c.data === col);
                  return (
                    <CBadge 
                      key={`${col}-${idx}`} 
                      style={{
                        background: 'linear-gradient(135deg, #9369f3 0%, #7c5cf0 100%)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '500',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(147, 105, 243, 0.3)'
                      }}
                    >
                      {colMeta?.title || col}: {val}
                      <button
                        type="button"
                        onClick={() => {
                          const newValues = values.filter((v, i) => i !== idx);
                          const filterType = localFilters.filterType[col] || 'strict';
                          handleColumnFilter(col, newValues, filterType);
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.3)',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          padding: '0',
                          fontSize: '14px',
                          lineHeight: '1',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </CBadge>
                  );
                });
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .filter-sidebar::-webkit-scrollbar {
          width: 6px;
        }
        .filter-sidebar::-webkit-scrollbar-track {
          background: #F9FAFB;
        }
        .filter-sidebar::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 3px;
        }
        .filter-sidebar::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>
    </div>
  );
};

export default FilterSidebar;
