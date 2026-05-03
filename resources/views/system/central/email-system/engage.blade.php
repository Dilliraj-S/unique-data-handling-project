{{-- Template: Engage Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Engage')
@section('top-style')
    <style>
        /* Core Layout */
        .email-app-wrapper {
            height: 100vh;
            overflow: hidden;
            background: #f4f6f8;
            color: #202124;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            transition: background 0.3s, color 0.3s;
        }

        .container-fluid {
            height: 100%;
            padding: 0;
        }

        .email-container {
            height: 100%;
            display: flex;
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            flex-direction: row;
        }

        /* Sidebar */
        .email-sidebar {
            width: 260px;
            background: #fafafa;
            padding: 2px;
            overflow-y: auto;
            border-right: 1px solid #e9ecef;
            flex-shrink: 0;
            transition: width 0.3s ease;
        }

        .sidebar-header {
            margin-bottom: 15px;
            display: flex;
            justify-content: flex-start;
            align-items: center;
            gap: 8px;
            padding: 8px 0;
        }

        .sidebar-header .btn {
            flex-shrink: 0;
        }

        .sidebar-header h5 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
            color: var(--text-color);
        }

        .account-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .account-item {
            margin-bottom: 5px;
            border-radius: 6px;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .account-toggle {
            width: 100%;
            padding: 10px 12px;
            background: none;
            border: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.9rem;
            color: var(--text-color);
            cursor: pointer;
            text-align: left;
            transition: all 0.3s ease;
        }

        .account-toggle:hover {
            background: #e9ecef;
        }

        .account-toggle .ri-arrow-down-s-line {
            transition: transform 0.3s ease;
        }

        .account-toggle:not(.collapsed) .ri-arrow-down-s-line {
            transform: rotate(0deg);
        }

        .account-toggle.collapsed .ri-arrow-down-s-line {
            transform: rotate(-90deg);
        }

        .account-toggle .ri-mail-line {
            margin-right: 8px;
            font-size: 1rem;
            color: #7f8c8d;
        }

        .category-list {
            padding: 10px;
            margin: 0;
            list-style: none;
            background: #f8f9fa;
            border-radius: 0 0 6px 6px;
        }

        .category-item {
            padding: 8px 9px;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .category-item+.category-item {
            margin-top: 4px;
        }

        .category-item:hover,
        .category-item.active {
            background: rgb(211 227 253);
            color: #001d35;
        }

        /* Category item styling - clean and professional */
        .category-item {
            border-radius: 6px;
            margin-bottom: 2px;
        }

        .text-success {
            color: #28a745;
        }

        /* Email List */
        .email-list-container {
            width: 380px;
            background: #ffffff;
            border-right: 1px solid #e9ecef;
            flex-shrink: 0;
            position: relative;
            transition: width 0.3s ease;
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .email-list-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
            margin: 15px 15px 15px 15px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .email-search-input {
            border: none;
            background: transparent;
            box-shadow: none;
            font-size: 0.9rem;
            width: 100%;
        }

        .email-search-input:focus {
            outline: none;
            box-shadow: none;
        }

        .email-refresh {
            background: #3498db;
            color: #ffffff;
            border-radius: 50%;
            padding: 6px;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s ease;
        }

        .email-refresh:hover {
            transform: rotate(360deg);
            background: #2980b9;
        }

        .email-list {
            padding: 15px 15px 0 15px;
            position: relative;
            flex: 1;
            overflow-y: auto;
        }

        .email-item {
            padding: 12px;
            border-radius: 6px;
            background: #ffffff;
            margin-bottom: 8px;
            cursor: pointer;
            position: relative;
            z-index: 1;
            overflow: hidden;
        }

        .email-item:hover,
        .email-item.active {
            background: #f1f3f5;
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
        }

        .email-item.read {
            color: #7f8c8d;
        }

        .email-item .email-from {
            font-weight: 500;
            font-size: 0.9rem;
        }

        .email-item .email-subject {
            font-size: 0.85rem;
            color: #555;
        }

        .email-item .email-time {
            font-size: 0.8rem;
            color: #95a5a6;
        }

        .load-more-btn {
            display: block;
            width: 100%;
            padding: 10px;
            text-align: center;
            background: #3498db;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            margin-top: 10px;
            transition: background 0.3s ease;
        }

        .load-more-btn:hover {
            background: #2980b9;
        }

        .load-more-btn:disabled {
            background: #95a5a6;
            cursor: not-allowed;
        }

        .email-view {
            flex: 1;
            background: #f8f9fa;
            padding: 24px;
            overflow-y: auto;
            position: relative;
            transition: width 0.3s ease;
            max-height: 100vh;
            min-width: 0;
        }

            {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        .email-view-header {
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
            border: 1px solid #e9ecef;
            position: sticky;
            top: 0;
            z-index: 5;
        }

        .email-view-header h5 {
            margin: 0;
            font-size: 1.3rem;
            color: #2c3e50;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .toggle-fullscreen-btn {
            background: none !important;
            border: none !important;
            padding: 8px !important;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .toggle-fullscreen-btn:hover {
            background: #e3f2fd !important;
            transform: scale(1.1);
        }

        .toggle-fullscreen-btn i {
            font-size: 1.5rem !important;
            color: #3498db;
        }

        .email-container.fullscreen .email-sidebar {
            width: 50px;
            overflow: hidden;
        }

        .email-container.fullscreen .email-list-container {
            width: 50px;
            overflow: hidden;
        }

        .email-container.fullscreen .email-view {
            width: calc(100% - 100px);
        }

        .email-container.fullscreen .email-sidebar .sidebar-header,
        .email-container.fullscreen .email-sidebar .account-list,
        .email-container.fullscreen .email-list-container .email-list-header,
        .email-container.fullscreen .email-list-container .email-list {
            display: none;
        }

        .email-content-card {
            background: #ffffff;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            border: 1px solid #f0f2f5;
            margin-bottom: 16px;
            position: relative;
            overflow: hidden;
        }

        .email-content-card h6 {
            font-size: 1.1rem;
            color: #2c3e50;
            margin-bottom: 8px;
            font-weight: 600;
        }

        .email-content-card .text-muted {
            font-size: 0.9rem;
            color: #6c757d;
            margin-bottom: 16px;
        }

        .email-content-card p {
            font-size: 1rem;
            color: #495057;
            line-height: 1.6;
            margin-bottom: 16px;
        }

        /* Email Body Container - Gmail-like clean display */
        .email-body-container {
            background: transparent;
            border: none;
            padding: 0;
            margin: 0;
            overflow: visible;
            max-height: none;
            position: relative;
            font-family: 'Google Sans', 'Roboto', 'Arial', sans-serif !important;
            font-size: 14px;
            line-height: 1.6;
            color: #202124;
        }

        /* Reset all email styles to prevent conflicts */
        .email-body-container * {
            max-width: 100% !important;
            box-sizing: border-box !important;
        }

        .email-body-container table {
            width: auto !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            margin: 8px 0 !important;
            border: none !important;
        }

        .email-body-container table td,
        .email-body-container table th {
            padding: 8px !important;
            border: none !important;
            vertical-align: top !important;
        }

        .email-body-container img {
            max-width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 8px auto !important;
            border-radius: 4px !important;
        }

        .email-body-container a {
            color: #0066cc !important;
            text-decoration: underline !important;
            word-break: break-word !important;
        }

        .email-body-container p {
            margin: 12px 0 !important;
            line-height: 1.6 !important;
            font-size: 14px !important;
            color: #202124 !important;
        }

        .email-body-container h1,
        .email-body-container h2,
        .email-body-container h3,
        .email-body-container h4,
        .email-body-container h5,
        .email-body-container h6 {
            margin: 20px 0 12px 0 !important;
            color: #202124 !important;
            font-weight: 500 !important;
            font-family: 'Google Sans', 'Roboto', sans-serif !important;
        }

        .email-body-container div {
            max-width: 100% !important;
        }

        /* Override any absolute positioning that might break layout */
        .email-body-container * {
            position: static !important;
            float: none !important;
        }

        /* Handle email-specific elements */
        .email-body-container .spacer,
        .email-body-container .empty {
            display: none !important;
        }

        /* Gmail-like font rendering */
        .email-body-container * {
            font-size: 14px !important;
            line-height: 1.6 !important;
            font-family: inherit !important;
        }

        /* Ensure buttons and links look native */
        .email-body-container a,
        .email-body-container button {
            color: #1a73e8 !important;
            text-decoration: none !important;
            font-weight: 500 !important;
        }

        .email-body-container a:hover {
            text-decoration: underline !important;
        }

        /* Email content wrapper - cleaner isolation */
        .email-body-wrapper {
            isolation: isolate;
            contain: layout;
            background: transparent;
        }

        /* Mobile responsive for email content */
        @media (max-width: 768px) {
            .email-body-container {
                padding: 0;
                max-height: none;
            }

            .email-body-container * {
                font-size: 13px !important;
            }
        }

        /* Responsive pagination */
        @media (max-width: 1200px) {
            .pagination-container {
                flex-direction: column;
                gap: 8px;
                padding: 8px 16px;
            }

            .pagination-controls {
                justify-content: center;
            }

            .pagination-btn {
                min-width: 80px;
                padding: 6px 12px;
                font-size: 12px;
            }
        }

        /* Responsive sidebar header */
        @media (max-width: 768px) {
            .sidebar-header {
                flex-direction: column;
                gap: 6px;
                align-items: stretch;
            }

            .sidebar-header .btn {
                width: 100%;
                justify-content: center;
            }
        }

        /* Gmail-like view toggle controls */
        .email-view-controls {
            display: flex;
            justify-content: flex-end;
            gap: 4px;
            margin-bottom: 12px;
            padding: 0;
            border: none;
        }

        .view-toggle-btn {
            background: transparent;
            border: none;
            border-radius: 20px;
            padding: 6px 12px;
            font-size: 0.75rem;
            color: #5f6368;
            cursor: pointer;
            transition: all 0.2s ease;
            font-weight: 500;
            outline: none;
        }

        .view-toggle-btn:hover {
            background: #f1f3f4;
            color: #202124;
        }

        .view-toggle-btn.active {
            background: #e8f0fe;
            color: #1a73e8;
        }

        /* Gmail-like original email source view */
        .email-source-container {
            background: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 16px;
            margin: 12px 0;
            font-family: 'Roboto Mono', 'Courier New', monospace;
            font-size: 0.75rem;
            white-space: pre-wrap;
            overflow: auto;
            max-height: 400px;
            display: none;
            color: #5f6368;
            line-height: 1.4;
        }

        .email-content-card pre {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            overflow-x: auto;
            font-size: 0.9rem;
            line-height: 1.4;
        }

        .email-content-card blockquote {
            border-left: 4px solid #3498db;
            margin: 16px 0;
            padding: 16px 20px;
            background: #f8f9fa;
            border-radius: 0 8px 8px 0;
            font-style: italic;
            color: #495057;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-thumb {
            background: #bdc3c7;
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: #95a5a6;
        }

        /* Context Menu */
        .context-menu {
            position: absolute;
            background: #fff;
            border: 1px solid #e9ecef;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            border-radius: 4px;
        }

        .context-menu-item {
            padding: 8px 12px;
            cursor: pointer;
        }

        .context-menu-item:hover {
            background: #f1f3f5;
        }

        /* Accessibility */
        .email-item:focus,
        .category-item:focus {
            outline: 2px solid #3498db;
        }

        .collapse:not(.show) {
            display: none !important;
        }

        .collapse.show {
            display: block !important;
        }

        .category-list {
            display: none !important;
        }

        .category-list.show {
            display: block !important;
        }

        /* Enhanced Thread UI */
        .message-card {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 15px;
            transition: all 0.3s ease;
        }

        .message-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .message-header {
            padding: 12px 15px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            border-radius: 8px 8px 0 0;
        }

        .message-header:hover {
            background: #e9ecef;
        }

        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 600;
            margin-right: 12px;
        }

        .sender-info {
            display: flex;
            flex-direction: column;
        }

        .sender-name {
            font-weight: 500;
            font-size: 1rem;
        }

        .sender-email {
            font-size: 0.85rem;
        }

        .message-meta {
            min-width: 150px;
            text-align: right;
        }

        .message-body {
            padding: 15px;
            background: #fff;
            border-radius: 0 0 8px 8px;
        }

        .message-content {
            font-size: 0.95rem;
            line-height: 1.6;
            word-wrap: break-word;
        }

        .message-actions {
            display: flex;
            gap: 10px;
        }

        .ri-arrow-down-s-line {
            transition: transform 0.3s ease;
        }

        .message-card.collapsed .message-body {
            display: none;
        }

        /* Toast Notification Styles */
        .toast-container {
            position: fixed;
            top: 50px;
            right: 20px;
            z-index: 1055;
        }

        .toast {
            max-width: 350px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .toast-header {
            background: #e8f0fe;
            color: #202124;
        }

        .toast-body {
            font-size: 14px;
            color: #202124;
        }

        /* Filter Dropdown */
        .filter-dropdown {
            min-width: 150px;
        }

        .badge {
            font-size: 0.75rem;
            padding: 0.25em 0.5em;
            vertical-align: middle;
        }

        .bg-danger {
            background-color: #dc3545 !important;
            color: #fff !important;
        }

        .bg-warning {
            background-color: #ffc107 !important;
            color: #212529 !important;
        }

        .bg-success {
            background-color: #28a745 !important;
            color: #fff !important;
        }

        .bg-secondary {
            background-color: #6c757d !important;
            color: #fff !important;
        }

        .keywords-modal .modal-content {
            border-radius: 8px;
        }

        .keywords-modal .modal-header {
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }

        .keywords-modal .form-label {
            font-weight: 500;
            color: #2c3e50;
        }

        .keywords-modal .form-control,
        .keywords-modal .form-select {
            border-radius: 6px;
        }

        .keywords-table {
            font-size: 0.9rem;
        }

        .keywords-table th,
        .keywords-table td {
            padding: 12px;
            vertical-align: middle;
        }

        .keywords-table .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.8rem;
        }

        .tagify {
            width: 100%;
            border-radius: 6px;
        }



        /* New Styles for Table Controls */
        .table-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 15px;
            align-items: center;
        }

        .table-controls .form-control,
        .table-controls .form-select {
            max-width: 200px;
        }

        .pagination-controls {
            display: flex;
            align-items: center;
            gap: 10px;
            justify-content: flex-end;
        }

        .pagination-controls .btn {
            padding: 0.25rem 0.75rem;
            font-size: 0.85rem;
        }

        .pagination-controls .page-info {
            font-size: 0.85rem;
            color: #5f6368;
        }

        /* Professional Email Pagination Container */
        .email-pagination {
            position: sticky;
            bottom: 0;
            background: #ffffff;
            border-top: 1px solid #e9ecef;
            z-index: 100;
            margin-top: auto;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
            width: 100%;
            flex-shrink: 0;
        }

        .pagination-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 20px;
            background: #ffffff;
            border-top: 1px solid #f0f2f5;
            min-height: 60px;
        }

        .pagination-info {
            flex: 1;
        }

        .pagination-text {
            font-size: 14px;
            color: #6c757d;
            font-weight: 500;
        }

        .pagination-text strong {
            color: #3498db;
            font-weight: 600;
        }

        .pagination-controls {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
            justify-content: flex-end;
        }

        .pagination-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border: 1px solid #d1d5db;
            background: #ffffff;
            color: #374151;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 90px;
            justify-content: center;
            white-space: nowrap;
        }

        .pagination-btn:hover:not(:disabled) {
            border-color: #3498db;
            color: #3498db;
            background: #f8f9ff;
            box-shadow: 0 2px 4px rgba(52, 152, 219, 0.1);
        }

        .pagination-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            background: #f9fafb;
            color: #9ca3af;
        }

        .pagination-btn i {
            font-size: 16px;
        }

        .page-indicator {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            background: #f9fafb;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
            min-width: 70px;
            justify-content: center;
            font-size: 13px;
        }

        .current-page {
            font-weight: 600;
            color: #3498db;
            font-size: 14px;
        }

        .page-separator {
            color: #6b7280;
            font-size: 13px;
        }

        .total-pages {
            font-weight: 500;
            color: #495057;
            font-size: 14px;
        }

        /* Responsive Design for Mobile */
        @media (max-width: 768px) {
            .pagination-container {
                flex-direction: column;
                gap: 12px;
                padding: 12px 16px;
            }

            .pagination-controls {
                width: 100%;
                justify-content: center;
            }

            .pagination-btn {
                min-width: 80px;
                padding: 6px 12px;
                font-size: 13px;
            }

            .pagination-btn span {
                display: none;
            }

            .page-indicator {
                min-width: 60px;
                padding: 6px 12px;
            }

            .pagination-text {
                text-align: center;
                font-size: 13px;
            }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .email-pagination {
                background: #2c3e50;
                border-top-color: #34495e;
            }

            .pagination-container {
                background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
            }

            .pagination-text {
                color: #bdc3c7;
            }

            .pagination-btn {
                background: #34495e;
                border-color: #4a5f7a;
                color: #ecf0f1;
            }

            .pagination-btn:hover:not(:disabled) {
                background: #3498db;
                border-color: #3498db;
                color: #ffffff;
            }

            .page-indicator {
                background: #34495e;
                border-color: #4a5f7a;
            }
        }

        /* Email List Container */
        .email-list-container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .email-list {
            flex: 1;
            overflow-y: auto;
            transition: opacity 0.3s ease;
        }

        /* Smooth pagination transitions */
        .email-list.paginating {
            opacity: 0.7;
        }

        .email-list.paginating .email-item {
            animation: slideInUp 0.3s ease-out;
        }

        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Enhanced Content Styles */
        .embedded-images-section,
        .attachments-section,
        .plain-text-fallback {
            margin: 15px 0;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 3px solid #3498db;
        }

        .embedded-images-section h6,
        .attachments-section h6,
        .plain-text-fallback h6 {
            margin: 0 0 8px 0;
            font-size: 0.9rem;
            font-weight: 600;
            color: #2c3e50;
        }

        .image-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 8px;
        }

        .image-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            background: #ffffff;
            border-radius: 4px;
            border: 1px solid #e9ecef;
        }

        .image-name {
            font-size: 0.85rem;
            color: #495057;
            font-weight: 500;
        }

        .image-type {
            font-size: 0.8rem;
            color: #6c757d;
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 3px;
        }

        .attachment-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .attachment-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            background: #ffffff;
            border-radius: 4px;
            border: 1px solid #e9ecef;
        }

        .attachment-name {
            font-size: 0.85rem;
            color: #495057;
            font-weight: 500;
            flex: 1;
        }

        .attachment-type {
            font-size: 0.8rem;
            color: #6c757d;
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 3px;
            margin: 0 8px;
        }

        .attachment-size {
            font-size: 0.8rem;
            color: #6c757d;
        }

        .plain-text-fallback pre {
            background: #ffffff;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 12px;
            margin: 8px 0 0 0;
            font-size: 0.85rem;
            line-height: 1.4;
            white-space: pre-wrap;
            word-wrap: break-word;
            max-height: 200px;
            overflow-y: auto;
        }

        /* Loading States */
        .category-item.loading {
            pointer-events: none;
            opacity: 0.7;
        }

        .email-list-loading-placeholder {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        /* Instant Loading Animation */
        .email-item {
            animation: fadeInUp 0.3s ease-out;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Loading Spinner Styles */
        .spinner-border-sm {
            width: 12px !important;
            height: 12px !important;
        }

        /* Skeleton Loading Animation */
        .skeleton-item {
            padding: 12px;
            border-radius: 6px;
            background: #ffffff;
            margin-bottom: 8px;
            animation: skeleton-pulse 1.5s ease-in-out infinite;
        }

        .skeleton-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #e9ecef;
            margin-right: 12px;
            float: left;
        }

        .skeleton-content {
            overflow: hidden;
        }

        .skeleton-line {
            height: 12px;
            background: #e9ecef;
            border-radius: 3px;
            margin-bottom: 8px;
            animation: skeleton-pulse 1.5s ease-in-out infinite;
        }

        .skeleton-line.short {
            width: 60%;
        }

        .skeleton-line.medium {
            width: 80%;
        }

        @keyframes skeleton-pulse {
            0% {
                opacity: 1;
            }

            50% {
                opacity: 0.5;
            }

            100% {
                opacity: 1;
            }
        }

        /* Virtual Scrolling Styles */
        .virtual-scroll-container {
            height: calc(100vh - 200px);
            overflow-y: auto;
            position: relative;
        }

        .virtual-scroll-item {
            position: absolute;
            width: 100%;
            left: 0;
        }

        /* Instant Loading States */
        .instant-loading {
            opacity: 0.7;
            pointer-events: none;
        }

        .instant-loading .email-item {
            animation: fadeInUp 0.2s ease-out;
        }

        /* Optimized Email Item */
        .email-item {
            will-change: transform, opacity;
            transform: translateZ(0);
            backface-visibility: hidden;
        }

        /* Quick Actions */
        .quick-actions {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
        }

        .quick-action-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #3498db;
            color: white;
            border: none;
            box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
            transition: all 0.3s ease;
            margin-bottom: 10px;
        }

        .quick-action-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(52, 152, 219, 0.4);
        }

        /* Smart Search */
        .smart-search {
            position: relative;
        }

        .search-suggestions {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            max-height: 200px;
            overflow-y: auto;
        }

        .search-suggestion-item {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #f8f9fa;
        }

        .search-suggestion-item:hover {
            background: #f8f9fa;
        }

        .search-suggestion-item:last-child {
            border-bottom: none;
        }

        /* Spinning Animation */
        .spinning {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from {
                transform: rotate(0deg);
            }

            to {
                transform: rotate(360deg);
            }
        }

        /* Optimized Email Rendering */
        .email-item {
            contain: layout style paint;
            will-change: transform, opacity;
        }

        /* Smooth Transitions */
        .email-list {
            transition: opacity 0.2s ease;
        }

        .email-list.instant-loading {
            opacity: 0.7;
        }

        /* Professional Email List Styling */
        .email-list {
            min-height: 400px;
            padding: 0;
        }

        .email-item {
            border-radius: 12px;
            margin-bottom: 10px;
            transition: all 0.3s ease;
            border: 1px solid #f0f2f5;
            background: #ffffff;
            padding: 16px;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .email-item:hover {
            border-color: #e3f2fd;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transform: translateY(-1px);
        }

        .email-item.selected {
            border-color: #2196f3;
            background: #f8fdff;
            box-shadow: 0 4px 16px rgba(33, 150, 243, 0.15);
        }

        .email-item-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }

        .email-item-sender {
            font-weight: 600;
            color: #2c3e50;
            font-size: 0.95rem;
            margin-bottom: 4px;
        }

        .email-item-subject {
            font-weight: 500;
            color: #495057;
            font-size: 0.9rem;
            margin-bottom: 8px;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .email-item-preview {
            color: #6c757d;
            font-size: 0.85rem;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            margin-bottom: 8px;
        }

        .email-item-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.8rem;
            color: #868e96;
        }

        .email-item-date {
            font-weight: 500;
        }

        .email-item-labels {
            display: flex;
            gap: 4px;
        }

        .email-item-label {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 500;
        }

        .email-item-label.unread {
            background: #e3f2fd;
            color: #1976d2;
        }

        .email-item-label.important {
            background: #fff3e0;
            color: #f57c00;
        }

        .spinning {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from {
                transform: rotate(0deg);
            }

            to {
                transform: rotate(360deg);
            }
        }
    </style>
    {{-- <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.2.0/remixicon.css"
        integrity="sha512-OQDNdI5rpnZ0BRhhJc+btbbtnxaj+LdQFeh0V9/igiEPDiWE2fG+ZsXl0JEH+bjXKPJ3zcXqNyP4/F/NegVdZg=="
        crossorigin="anonymous" referrerpolicy="no-referrer">
    <link href="https://cdn.jsdelivr.net/npm/@yaireo/tagify/dist/tagify.css" rel="stylesheet"> --}}
@endsection
@section('content')


    <div class="container-xxl flex-grow-1 container-p-y">
        <div class="row gy-2">

            <meta name="csrf-token" content="{{ csrf_token() }}">
            <div class="email-app-wrapper" id="email-app">
                <div class="container-fluid">
                    <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-3 shadow-sm px-4 py-3 rounded-top"
                        style="background:#1db4cd; border-bottom:2px solid #e0e7ef; border-radius: 0.5rem 0.5rem 0 0;">
                        <div class="d-flex align-items-center">
                            <span style="font-size:1.5rem; font-weight:700; color:#fff; letter-spacing:0.5px;">Email
                                Engage</span>
                        </div>
                    </div>
                    <div class="email-container">

                        <!-- Sidebar -->
                        <div class="email-sidebar" id="email-sidebar">
                            <div class="sidebar-header">
                                <button class="btn btn-primary btn-sm" data-bs-toggle="modal"
                                    data-bs-target="#keywordsModal" title="Add Keywords">
                                    <i class="ri-add-line"></i>
                                </button>
                                <button class="btn btn-outline-primary btn-sm" id="start-live-fetch"
                                    title="Start Live Email Fetching">
                                    <i class="ri-play-circle-line me-1"></i>
                                    Start Live Fetch
                                </button>
                            </div>
                            <ul class="account-list" id="email-account-list" role="listbox"></ul>
                        </div>

                        <!-- Email List -->
                        <div class="email-list-container" tabindex="0" role="region" aria-label="Email list">
                            <div class="loading-overlay" id="email-list-loading">
                                <div class="spinner"></div>
                            </div>
                            <div class="email-list-header d-flex align-items-center gap-2">
                                <div class="d-flex w-100">
                                    <div class="input-group smart-search" style="flex: 0 0 85%;">
                                        <span class="input-group-text bg-transparent border-0">
                                            <i class="ri-search-line"></i>
                                        </span>
                                        <input type="text" class="form-control email-search-input"
                                            placeholder="Search emails (type to see suggestions)"
                                            aria-label="Search emails">
                                        <div class="search-suggestions" id="search-suggestions" style="display: none;">
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: center; padding-left: 5px;">
                                        <i class="ri-filter-line" style="margin-right: -22px;"></i>
                                        <select class="form-select" id="status-filter" aria-label="Filter by status">
                                            <option value="all">All</option>
                                            <option value="unsubscribe">Unsubscribe</option>
                                            <option value="automatic_reply">Automatic Reply</option>
                                            <option value="no_longer">No Longer</option>
                                            <option value="hard_bounce">Hard Bounce</option>
                                            <option value="soft_bounce">Soft Bounce</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Clean Email List Container -->
                            <div class="email-list">
                                <ul class="list-unstyled" id="email-list" role="listbox"></ul>
                            </div>

                            <!-- Modern Pagination Controls -->
                            <div class="email-pagination" id="email-pagination">
                                <div class="pagination-container">
                                    <div class="pagination-info">
                                        <span class="pagination-text">
                                            Showing <strong id="showing-start">0</strong> - <strong
                                                id="showing-end">0</strong>
                                            of <strong id="total-emails">0</strong> emails
                                        </span>
                                    </div>
                                    <div class="pagination-controls">
                                        <button class="pagination-btn" id="prev-page-btn" disabled>
                                            <i class="ri-arrow-left-s-line"></i>
                                            <span>Previous</span>
                                        </button>
                                        <div class="page-indicator">
                                            <span class="current-page" id="current-page">1</span>
                                            <span class="page-separator">of</span>
                                            <span class="total-pages" id="total-pages">1</span>
                                        </div>
                                        <button class="pagination-btn" id="next-page-btn" disabled>
                                            <span>Next</span>
                                            <i class="ri-arrow-right-s-line"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Email View -->
                        <div class="email-view" id="email-view" tabindex="0" role="region" aria-label="Email content"
                            style="position: relative;">
                            <div style="display: flex; align-items: center;" class="email-view-header">
                                <button class="toggle-fullscreen-btn"
                                    style="background: none; border: none; padding: 0; cursor: pointer; margin-right:20px;"
                                    aria-label="Toggle fullscreen">
                                    <i class="ri-fullscreen-line" style="font-size: 2.2rem; color: #3498db;"></i>
                                </button>
                                <h5>Select an email to view</h5>
                            </div>
                            <div class="email-content-card">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <div>
                                        <h6>Sender Name</h6>
                                        <small class="text-muted">sender@email.com</small>
                                    </div>
                                    <small class="text-muted">Date</small>
                                </div>
                                <p>Select an email to view its content.</p>
                            </div>
                            <div class="loading-overlay" id="email-view-loading" style="display: none;">
                                <div class="spinner"></div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            <div class="context-menu" id="context-menu" style="display: none;" role="menu"></div>

            <!-- Quick Actions -->
            <div class="quick-actions" id="quick-actions" style="display: none;">
                <button class="quick-action-btn" id="refresh-btn" title="Refresh Emails">
                    <i class="ri-refresh-line"></i>
                </button>
                <button class="quick-action-btn" id="compose-btn" title="Compose Email">
                    <i class="ri-mail-add-line"></i>
                </button>

            </div>

            <!-- Modal for Message Box -->
            {{-- <div class="modal fade" id="messageModal" tabindex="-1" aria-labelledby="messageModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="messageModalLabel">Email Content</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" id="messageModalBody">
                            <!-- Email content will be inserted here -->
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div> --}}

            <!-- Modal for Keywords Management -->
            <div class="modal fade keywords-modal" id="keywordsModal" tabindex="-1"
                aria-labelledby="keywordsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="keywordsModalLabel">Manage Keywords</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"
                                aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Form for adding keywords -->
                            <form id="keywordForm">
                                <div class="mb-3">
                                    <label for="keywordText" class="form-label">Keywords (comma-separated)</label>
                                    <input type="text" class="" id="keywordText" name="keywords">
                                    <small id="keyword-warning" class="text-danger d-none"></small>
                                </div>
                                <div class="mb-3">
                                    <label for="keywordType" class="form-label">Type</label>
                                    <select class="form-select" id="keywordType" name="type" required>
                                        <option value="unsubscribe">Unsubscribe</option>
                                        <option value="automatic_reply">Automatic Reply</option>
                                        <option value="no_longer">No Longer</option>
                                        <option value="hard_bounce">Hard Bounce</option>
                                        <option value="soft_bounce">Soft Bounce</option>
                                    </select>
                                </div>
                                <button type="submit" class="btn btn-primary">Add Keywords</button>
                            </form>
                            <!-- Keyword Testing -->

                            <!-- Table for displaying keywords -->
                            <div class="mt-4">
                                <h6>Existing Keywords</h6>
                                <div class="table-controls">
                                    <input type="text" class="form-control" id="keyword-search"
                                        placeholder="Search keywords..." aria-label="Search keywords">
                                    <select class="form-select" id="rows-per-page" aria-label="Rows per page">
                                        <option value="10">10 rows</option>
                                        <option value="25">25 rows</option>
                                        <option value="50">50 rows</option>
                                        <option value="100">100 rows</option>
                                    </select>
                                    <select class="form-select" id="type-filter" aria-label="Filter by type">
                                        <option value="all">All Types</option>
                                        <option value="unsubscribe">Unsubscribe</option>
                                        <option value="automatic_reply">Automatic Reply</option>
                                        <option value="no_longer">No Longer</option>
                                        <option value="hard_bounce">Hard Bounce</option>
                                        <option value="soft_bounce">Soft Bounce</option>
                                    </select>
                                </div>
                                <table class="table table-striped keywords-table">
                                    <thead>
                                        <tr>
                                            <th>Keyword</th>
                                            <th>Type</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="keywordsTableBody"></tbody>
                                </table>
                                <div class="pagination-controls">
                                    <button class="btn btn-outline-primary" id="prev-page" disabled>Previous</button>
                                    <select class="form-select" id="page-select" aria-label="Select page"
                                        style="width: auto;"></select>
                                    <button class="btn btn-outline-primary" id="next-page" disabled>Next</button>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>


            <div class="toast-container"></div>
        </div>
    </div>
@endsection
@section('bottom-script')
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://unpkg.com/dexie/dist/dexie.js"></script>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/laravel-echo@1.15.3/dist/echo.iife.js"></script>
    <script>
        // Global Echo initialization
        window.Echo = null;
        try {
            if (typeof Echo !== 'undefined') {
                window.Echo = new Echo({
                    broadcaster: 'socket.io',
                    host: '{{ config('broadcasting.connections.reverb.options.host') }}:{{ config('broadcasting.connections.reverb.options.port') }}',
                    transports: ['websocket', 'polling']
                });
                console.log('✅ Echo initialized globally');
            }
        } catch (error) {
            console.warn('⚠️ Echo initialization failed, using fallback');
        }
    </script>
    <script src="{{ asset('treasury/panel/js/engage.js') }}"></script>
    <script>
        $(document).ready(function() {
            // Verify Bootstrap loading
            if (typeof bootstrap === 'undefined') {
                console.error('Bootstrap JS is not loaded!');
            } else {
                console.log('Bootstrap JS loaded successfully.');
            }

            // Initialize Dexie database
            const db = new Dexie('EmailClientDB');
            db.version(1).stores({
                emails: 'id,account,category,data'
            });

            // Echo is already initialized globally
            console.log('📡 Echo status:', window.Echo ? 'Available' : 'Not available');

            // Setup real-time new email notifications
            if (window.Echo) {
                window.Echo.channel('new-emails')
                    .listen('NewEmailReceived', (e) => {
                        console.log('📡 New email received:', e);

                        // Refresh email list if it matches current account/category
                        if (e.email === currentAccount && e.category === currentCategory) {
                            showNotification('New Email', `New email from ${e.from}`, 'info');
                            loadEmails(true);
                        }
                    });
            }

            // State variables
            let currentAccount = '{{ $activeEmail ?? '' }}';
            // Simple Email System State
            let currentCategory = 'Inbox';
            let nextPageToken = null;
            let isFetching = false;
            let isFetchingContent = false;

            // Simple cache for instant loading
            const emailCache = new Map();
            const lastEmailIds = new Map();

            // State management
            let currentStatusFilter = 'all';
            let isUserActive = true;
            let lastUserActivity = Date.now();
            let syncInProgress = false;
            let keywordsData = [];
            let currentPage = 1;
            let rowsPerPage = 10;
            let searchQuery = '';
            let typeFilter = 'all';

            // Performance optimization variables
            let emailListPage = 1;
            let emailsPerPage = 20;
            let totalEmails = 0;
            let allEmails = [];
            let searchSuggestions = [];
            let lastSearchTime = 0;
            const searchDebounceDelay = 300;
            const suggestionCache = {};

            // Simple Cache Management
            function getCacheKey(account, category, status = 'all') {
                return `${account}:${category}:${status}`;
            }

            function setCache(cacheKey, data) {
                emailCache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
            }

            function getCache(cacheKey) {
                const cached = emailCache.get(cacheKey);
                if (!cached) return null;

                // Cache valid for 5 minutes
                if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
                    emailCache.delete(cacheKey);
                    return null;
                }

                return cached.data;
            }

            // Simple User Activity Detection
            function updateUserActivity() {
                lastUserActivity = Date.now();
                if (!isUserActive) {
                    isUserActive = true;
                    console.log('User became active');
                }
            }

            function checkUserInactivity() {
                const inactiveTime = Date.now() - lastUserActivity;
                if (inactiveTime > 5 * 60 * 1000 && isUserActive) { // 5 minutes
                    isUserActive = false;
                    console.log('User inactive');
                }
            }

            // Debounce function
            function debounce(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            }

            // Initialize Tagify
            const keywordInput = document.querySelector('#keywordText');
            if (!keywordInput) {
                console.error('Keyword input (#keywordText) not found!');
            } else {
                const tagify = new Tagify(keywordInput, {
                    delimiters: ',',
                    enforceWhitelist: false
                });

                // Handle keyword form submission
                const keywordForm = $('#keywordForm');
                if (!keywordForm.length) {
                    console.error('Keyword form (#keywordForm) not found!');
                } else {
                    keywordForm.on('submit', async function(e) {
                        e.preventDefault();
                        console.log('Add Keyword form submitted');

                        let keywords;
                        try {
                            keywords = tagify.value.map(tag => tag.value.trim()).filter(v => v);
                            console.log('Keywords:', keywords);
                        } catch (error) {
                            console.error('Error processing Tagify values:', error);
                            showNotification('Error', 'Invalid keyword input', 'danger');
                            return;
                        }

                        const type = $('#keywordType').val();
                        console.log('Selected type:', type);

                        if (!keywords.length) {
                            console.warn('No keywords provided');
                            showNotification('Error', 'Please enter at least one keyword', 'danger');
                            return;
                        }
                        if (!type) {
                            console.warn('No type selected');
                            showNotification('Error', 'Please select a keyword type', 'danger');
                            return;
                        }

                        try {
                            for (const keyword of keywords) {
                                console.log(`Sending keyword: ${keyword}, type: ${type}`);
                                const formData = new FormData();
                                formData.append('keyword', keyword);
                                formData.append('type', type);
                                const response = await fetch('/keywords', {
                                    method: 'POST',
                                    body: formData,
                                    headers: {
                                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr(
                                            'content'),
                                        'Accept': 'application/json'
                                    }
                                });

                                const result = await response.json();
                                console.log('Server response:', result);

                                if (!response.ok || !result.success) {
                                    throw new Error(result.error || 'Failed to add keyword');
                                }
                            }

                            console.log('All keywords added successfully');
                            keywordForm[0].reset();
                            tagify.removeAllTags();
                            loadKeywords();
                            showNotification('Success',
                                `${keywords.length} keyword${keywords.length > 1 ? 's' : ''} added successfully`,
                                'success');
                        } catch (error) {
                            console.error('Failed to add keywords:', error.message);
                            showNotification('Error', `Failed to add keywords: ${error.message}`,
                                'danger');
                        }
                    });
                }
            }

            // Load keywords
            function loadKeywords() {
                console.log('Loading keywords...');
                $.ajax({
                    url: '/keywords',
                    method: 'GET',
                    success: function(response) {
                        console.log('Keywords loaded:', response);
                        keywordsData = response || [];
                        renderKeywordsTable();
                        if (keywordsData.length === 0) {
                            showNotification('Warning',
                                'No keywords defined. Add keywords for better classification.',
                                'warning');
                        }
                    },
                    error: function(xhr) {
                        console.error('Failed to load keywords:', xhr);
                        keywordsData = [];
                        renderKeywordsTable();
                        let message = 'Failed to load keywords';
                        if (xhr.responseJSON && xhr.responseJSON.error) {
                            message = xhr.responseJSON.error;
                        }
                        showNotification('Error', message, 'danger');
                    }
                });
            }

            // Render keywords table
            function renderKeywordsTable() {
                console.log('Rendering keywords table:', {
                    searchQuery,
                    typeFilter,
                    currentPage,
                    rowsPerPage
                });
                const tbody = $('#keywordsTableBody');
                tbody.empty();

                const filteredKeywords = keywordsData.filter(keyword => {
                    const search = searchQuery.toLowerCase().trim();
                    const keywordText = (keyword.keyword || '').toLowerCase();
                    const typeText = (keyword.type || '').toLowerCase();
                    const matchesSearch = !search || keywordText.includes(search) || typeText.includes(
                        search);
                    const matchesType = typeFilter === 'all' || keyword.type === typeFilter;
                    return matchesSearch && matchesType;
                });

                console.log('Filtered keywords:', filteredKeywords.length);

                if (filteredKeywords.length === 0) {
                    tbody.append('<tr><td colspan="3" class="text-center">No keywords found</td></tr>');
                    updatePagination(0);
                    return;
                }

                const totalRows = filteredKeywords.length;
                const totalPages = Math.ceil(totalRows / rowsPerPage);
                currentPage = Math.min(currentPage, totalPages) || 1;
                const startIndex = (currentPage - 1) * rowsPerPage;
                const endIndex = startIndex + rowsPerPage;
                const paginatedKeywords = filteredKeywords.slice(startIndex, endIndex);

                paginatedKeywords.forEach(keyword => {
                    tbody.append(`
                        <tr data-id="${keyword.id}">
                            <td>${keyword.keyword || 'N/A'}</td>
                            <td>${formatStatus(keyword.type)}</td>
                            <td>
                                <button class="btn btn-danger btn-sm delete-keyword" data-id="${keyword.id}">
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            </td>
                        </tr>
                    `);
                });

                updatePagination(totalRows);
            }

            // Update pagination controls
            function updatePagination(totalRows) {
                const totalPages = Math.ceil(totalRows / rowsPerPage);
                const $pageSelect = $('#page-select');

                $pageSelect.empty();
                for (let i = 1; i <= totalPages; i++) {
                    $pageSelect.append(
                        `<option value="${i}" ${i === currentPage ? 'selected' : ''}>Page ${i} of ${totalPages}</option>`
                    );
                }

                $pageSelect.prop('disabled', totalPages <= 1);
                $('#prev-page').prop('disabled', currentPage === 1);
                $('#next-page').prop('disabled', currentPage >= totalPages);
            }

            // Handle keyword deletion
            $(document).on('click', '.delete-keyword', async function() {
                const id = $(this).data('id');
                console.log('Delete keyword clicked:', id);
                if (confirm('Are you sure you want to delete this keyword?')) {
                    try {
                        const response = await fetch(`/keywords/${id}`, {
                            method: 'DELETE',
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('Keyword deleted successfully');
                            loadKeywords();
                            showNotification('Success', 'Keyword deleted successfully', 'success');
                        } else {
                            showNotification('Error', result.error || 'Failed to delete keyword',
                                'danger');
                        }
                    } catch (error) {
                        console.error('Failed to delete keyword:', error);
                        showNotification('Error', 'Failed to delete keyword', 'danger');
                    }
                }
            });

            // Handle table controls
            const searchHandler = debounce(function() {
                searchQuery = $('#keyword-search').val().trim();
                console.log('Search query updated:', searchQuery);
                currentPage = 1;
                renderKeywordsTable();
            }, 300);

            $('#keyword-search').off('input').on('input', searchHandler);

            $('#rows-per-page').off('change').on('change', function() {
                rowsPerPage = parseInt($(this).val());
                currentPage = 1;
                renderKeywordsTable();
            });

            $('#type-filter').off('change').on('change', function() {
                typeFilter = $(this).val();
                currentPage = 1;
                renderKeywordsTable();
            });

            $('#prev-page').off('click').on('click', function() {
                if (currentPage > 1) {
                    currentPage--;
                    renderKeywordsTable();
                }
            });

            $('#next-page').off('click').on('click', function() {
                const totalRows = keywordsData.filter(keyword => {
                    const matchesSearch = !searchQuery ||
                        keyword.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        keyword.type.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesType = typeFilter === 'all' || keyword.type === typeFilter;
                    return matchesSearch && matchesType;
                }).length;
                const totalPages = Math.ceil(totalRows / rowsPerPage);
                if (currentPage < totalPages) {
                    currentPage++;
                    renderKeywordsTable();
                }
            });

            $('#page-select').off('change').on('change', function() {
                currentPage = parseInt($(this).val());
                renderKeywordsTable();
            });

            // Load keywords when modal opens
            $('#keywordsModal').on('shown.bs.modal', function() {
                console.log('Keywords modal opened');
                loadKeywords();
            });

            // Format status for display
            function formatStatus(status) {
                return status
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            }

            // Notification function
            function showNotification(title, message, type) {
                console.log('Showing notification:', {
                    title,
                    message,
                    type
                });
                const toastHtml = `
                    <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                        <div class="d-flex">
                            <div class="toast-body">
                                ${title ? `<strong>${title}:</strong> ` : ''}${message}
                            </div>
                            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                        </div>
                    </div>
                `;
                $('.toast-container').append(toastHtml);
                const toastElement = $('.toast').last();
                const toast = new bootstrap.Toast(toastElement);
                toast.show();
                toastElement.on('hidden.bs.toast', function() {
                    $(this).remove();
                });
            }

            // Loading Helpers
            function showLoading(section) {
                if (section === 'email-list') {
                    if ($('#email-list').is(':empty') || $('#email-list .email-item').length === 0) {
                        showSkeletonLoading();
                    } else {
                        // Only add instant-loading if there are no emails currently displayed
                        const currentEmails = $('#email-list .email-item').length;
                        if (currentEmails === 0) {
                            $('#email-list').addClass('instant-loading');
                        } else {
                            console.log(`Skipping instant-loading - ${currentEmails} emails already displayed`);
                        }
                    }
                } else if (section === 'email-view') {
                    const spinnerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center" style="min-height: 120px;">
            <div class="spinner-border text-primary" role="status" style="width: 24px; height: 24px;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 mb-0 text-muted">Loading email content...</p>
        </div>
    `;
                    $(`#${section}-loading`).html(spinnerHTML).show();
                } else if (section === 'account-switch') {
                    showSkeletonLoading();
                }
            }

            // Optimized Skeleton Loading - fewer items for faster rendering
            function showSkeletonLoading() {
                const skeletonHTML = Array(5).fill(`
                    <li class="skeleton-item">
                        <div class="skeleton-avatar"></div>
                        <div class="skeleton-content">
                            <div class="skeleton-line medium"></div>
                            <div class="skeleton-line short"></div>
                            <div class="skeleton-line" style="width: 40%;"></div>
                            </div>
                        </li>
                `).join('');

                $('#email-list').html(skeletonHTML);
            }

            // Smart Search Suggestions
            function showSearchSuggestions(query) {
                if (!query || query.length < 2) {
                    $('#search-suggestions').hide();
                    return;
                }

                const suggestions = generateSearchSuggestions(query);
                if (suggestions.length === 0) {
                    $('#search-suggestions').hide();
                    return;
                }

                const suggestionsHTML = suggestions.map(suggestion =>
                    `<div class="search-suggestion-item" data-suggestion="${suggestion}">
                        <i class="ri-search-line me-2"></i>${suggestion}
                    </div>`
                ).join('');

                $('#search-suggestions').html(suggestionsHTML).show();
            }

            function generateSearchSuggestions(query) {
                const suggestions = [];
                const lowerQuery = query.toLowerCase();

                // Common email patterns
                if (lowerQuery.includes('@')) {
                    suggestions.push(`from:${query}`);
                    suggestions.push(`to:${query}`);
                }

                // Status suggestions
                if (lowerQuery.includes('unsub')) {
                    suggestions.push('status:unsubscribe');
                }
                if (lowerQuery.includes('bounce')) {
                    suggestions.push('status:hard_bounce');
                    suggestions.push('status:soft_bounce');
                }

                // Date suggestions
                if (lowerQuery.includes('today')) {
                    suggestions.push('date:today');
                }
                if (lowerQuery.includes('week')) {
                    suggestions.push('date:this_week');
                }

                return suggestions.slice(0, 5); // Limit to 5 suggestions
            }

            function hideLoading(section) {
                if (section === 'email-list') {
                    $('#email-list .email-list-loading-placeholder').remove();
                    $('#email-list').removeClass('instant-loading');
                    console.log('hideLoading: Removed instant-loading class from email list');
                } else if (section === 'email-view') {
                    $(`#${section}-loading`).hide();
                } else if (section === 'account-switch') {
                    // Clear loading states from category items
                    $('.category-item.loading').removeClass('loading').each(function() {
                        const category = $(this).data('category');
                        $(this).html(category);
                    });
                }
            }

            // Sanitize HTML
            function sanitizeHtml(html) {
                if (!html || typeof html !== 'string') return '<p>No content available</p>';
                html = html.replace(/<!DOCTYPE[^>]*>/gi, '');
                const div = document.createElement('div');
                div.innerHTML = html;
                const scripts = div.getElementsByTagName('script');
                while (scripts.length) scripts[0].remove();
                const cleanHtml = div.innerHTML
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+="[^"]*"/gi, '');
                return cleanHtml || '<p>No content available</p>';
            }

            // Fetch Authenticated Accounts
            function fetchAuthenticatedAccounts() {
                console.log('Fetching authenticated accounts');
                showLoading('email-list');
                fetch('/authenticated-accounts', {
                        method: 'GET',
                        timeout: 5000
                    })
                    .then(response => {
                        if (!response.ok) throw new Error(`Failed to fetch accounts: ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        console.log('Authenticated accounts:', data);
                        const accountList = $('#email-account-list');
                        accountList.empty();
                        if (!data.accounts || data.accounts.length === 0) {
                            accountList.append(
                                '<li class="text-center text-muted">No accounts found. <a href="/google/auth">Add Account</a></li>'
                            );
                            $('#email-list').html('<li class="text-center text-muted">No accounts found.</li>');
                            hideLoading('email-list');
                            return;
                        }
                        data.accounts.forEach(email => {
                            const accountId = email.replace(/[^a-zA-Z0-9]/g, '');
                            accountList.append(`
                            <li class="account-item" data-email="${email}">
                                <button class="account-toggle collapsed" type="button" data-target="#${accountId}-categories" 
                                    style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                                    <span style="display: inline-flex; align-items: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%;">
                                        <i class="ri-mail-line" style="margin-right: 5px;"></i> 
                                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${email}">
                                            ${email}
                                        </span>
                                    </span>
                                    <i class="ri-arrow-down-s-line"></i>
                                </button>
                                <ul class="category-list" id="${accountId}-categories" role="listbox">
                                    <li class="category-item" data-category="Inbox" tabindex="0" role="option" aria-label="Inbox">Inbox</li>
                                    <li class="category-item" data-category="Spam" tabindex="0" role="option" aria-label="Spam">Spam</li>
                                </ul>
                            </li>
                        `);
                            updateSidebarCounts(email);
                            // Initialize cache for each account
                            if (lastEmailIds && typeof lastEmailIds.set === 'function') {
                                lastEmailIds.set(`${email}:inbox`, null);
                                lastEmailIds.set(`${email}:spam`, null);
                            }
                        });
                        currentAccount = data.active || data.accounts[0] || currentAccount;
                        if (currentAccount) {
                            console.log(`Setting initial account: ${currentAccount}`);
                            currentCategory = 'Inbox';

                            // Ensure the account is properly switched on the server side
                            if (!data.active && data.accounts.length > 0) {
                                console.log('No active account found, switching to first account:',
                                    currentAccount);
                                switchAccount(currentAccount, currentCategory);
                            } else {
                                // Load emails instantly from database first, then sync in background
                                loadEmailsFromDatabase(currentAccount, currentCategory);
                            }
                            const activeAccountId = currentAccount.replace(/[^a-zA-Z0-9]/g, '');
                            const $activeToggle = $(
                                `.account-item[data-email="${currentAccount}"] .account-toggle`);
                            const $activeCategories = $(`#${activeAccountId}-categories`);
                            $activeToggle.removeClass('collapsed').data('expanded', true);
                            $activeCategories.addClass('show').css('display', 'block');
                            startPolling();
                        } else {
                            console.warn('No accounts available');
                            $('#email-list').html(
                                '<li class="text-center text-muted">Please select an email account.</li>');
                            hideLoading('email-list');
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching accounts:', error);
                        $('#email-list').html(
                            '<li class="text-center text-muted">Failed to load accounts.</li>');
                        hideLoading('email-list');
                    });
            }

            // Load emails from database only (no automatic sync)
            function loadEmailsFromDatabase(account, category) {
                console.log(`Loading emails from database only: ${account}, ${category}`);
                showLoading('email-list');

                fetch(`/fetch-emails?email=${encodeURIComponent(account)}&category=${encodeURIComponent(category)}&search=${encodeURIComponent($('.email-search-input').val() || '')}&pageToken=&status=${encodeURIComponent(currentStatusFilter)}&from_database=true&no_sync=true`, {
                        method: 'GET',
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        }
                    })
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        console.log(`Loaded ${data.emails.length} emails from database`);
                        displayEmails(data.emails || [], false);
                        hideLoading('email-list');

                        // Show sync status info
                        if (data.emails.length > 0) {
                            showNotification('Info',
                                `Loaded ${data.emails.length} emails from database. Click "Sync Now" to fetch latest emails from Gmail.`,
                                'info');
                        } else {
                            showNotification('Info',
                                'No emails found in database. Click "Sync Now" to fetch emails from Gmail.',
                                'info');
                        }
                    })
                    .catch(error => {
                        console.error('Failed to load from database:', error);
                        hideLoading('email-list');
                        $('#email-list').html(
                            '<li class="text-center text-muted">Failed to load emails from database.</li>');
                    });
            }

            // Switch Account
            function switchAccount(email, category) {
                if (!email || !category) {
                    console.error('Invalid switch params:', {
                        email,
                        category
                    });
                    $('#email-list').html('<li class="text-center text-muted">Invalid account or category.</li>');
                    hideLoading('email-list');
                    return;
                }
                console.log(`Switching to: account=${email}, category=${category}`);
                showLoading('account-switch');

                fetch('/switch-account', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        body: JSON.stringify({
                            email
                        })
                    })
                    .then(res => {
                        if (!res.ok) throw new Error(`Switch account failed: ${res.status}`);
                        return res.json();
                    })
                    .then(data => {
                        if (data.success) {
                            console.log(`Switch confirmed: ${email}, ${category}`);
                            currentAccount = email;
                            currentCategory = category;
                            nextPageToken = null;
                            $('.category-item').removeClass('active');
                            const accountId = email.replace(/[^a-zA-Z0-9]/g, '');
                            const $toggle = $(`.account-item[data-email="${email}"] .account-toggle`);
                            const $categoryList = $(`#${accountId}-categories`);
                            $toggle.removeClass('collapsed').data('expanded', true);
                            $categoryList.addClass('show').css('display', 'block');
                            $(`.account-item[data-email="${email}"] .category-item[data-category="${category}"]`)
                                .addClass('active');
                            // Clear simple cache
                            emailCache.clear();
                            if (lastEmailIds && typeof lastEmailIds.clear === 'function') {
                                lastEmailIds.clear();
                            }

                            // Load emails instantly from cache first
                            const cacheKey = getCacheKey(email, category, currentStatusFilter);
                            const cached = getCache(cacheKey);

                            if (cached && cached.emails && cached.emails.length > 0) {
                                console.log('Loading from cache for instant display');
                                displayEmails(cached.emails, false);
                            }

                            // Then fetch fresh data
                            loadEmailsFromDatabase(email, category);
                            updateSidebarCounts(email);
                            hideLoading('account-switch');
                        } else {
                            console.error('Switch account error:', data.error);
                            $('#email-list').html(
                                '<li class="text-center text-muted">Failed to switch account.</li>');
                            hideLoading('account-switch');
                        }
                    })
                    .catch(error => {
                        console.error('Switch account failed:', error.message);
                        $('#email-list').html(
                            '<li class="text-center text-muted">Failed to switch account.</li>');
                        hideLoading('account-switch');
                    });
            }

            // Enhanced Polling Control (No Auto Sync)
            function startPolling() {
                stopPolling();
                console.log('🔄 Starting enhanced polling (no auto sync)');

                // Sync status check every 30 seconds (only for current account)
                const syncStatusInterval = setInterval(() => {
                    if (currentAccount && currentCategory) {
                        checkSyncStatus();
                    }
                }, 30 * 1000); // 30 seconds

                // Store intervals for cleanup
                window.syncStatusInterval = syncStatusInterval;
            }

            // Trigger Email Sync for Real-time Updates
            function triggerEmailSync(email, category) {
                console.log(`Triggering sync for ${email}:${category}`);

                fetch('/fetch-emails', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        params: {
                            email: email,
                            category: category,
                            trigger_sync: true
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            console.log('Sync triggered successfully');
                        }
                    })
                    .catch(error => {
                        console.error('Failed to trigger sync:', error);
                    });
            }

            // Live Email System - Clean and Simple







            // Get status class for styling
            function getStatusClass(status) {
                switch (status) {
                    case 'syncing':
                        return 'bg-primary';
                    case 'complete':
                        return 'bg-success';
                    case 'failed':
                        return 'bg-danger';
                    case 'pending':
                        return 'bg-warning';
                    case 'not_started':
                        return 'bg-secondary';
                    default:
                        return 'bg-secondary';
                }
            }

            // Get status icon
            function getStatusIcon(status) {
                switch (status) {
                    case 'syncing':
                        return 'ri-loader-4-line spinning';
                    case 'complete':
                        return 'ri-check-line';
                    case 'failed':
                        return 'ri-error-warning-line';
                    case 'pending':
                        return 'ri-time-line';
                    case 'not_started':
                        return 'ri-time-line';
                    default:
                        return 'ri-question-line';
                }
            }



            // Start Live Fetch Function
            function startLiveFetch() {
                console.log('Starting live email fetch for all accounts...');

                // Show loading state
                $('#start-live-fetch')
                    .prop('disabled', true)
                    .html('<i class="ri-loader-4-line spinning me-1"></i>Starting...');

                fetch('/start-live-fetch', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            console.log('Live fetch started successfully');
                            showNotification('Success',
                                'Live email fetching started! Run: php artisan queue:work --queue=email-sync',
                                'success');

                            // Update button to show it's running
                            $('#start-live-fetch')
                                .removeClass('btn-outline-light')
                                .addClass('btn-success')
                                .html('<i class="ri-check-line me-1"></i>Live Fetch Running');
                        } else {
                            showNotification('Error', data.error || 'Failed to start live fetch', 'danger');
                            // Reset button state
                            $('#start-live-fetch')
                                .prop('disabled', false)
                                .html('<i class="ri-play-circle-line me-1"></i>Start Live Fetch');
                        }
                    })
                    .catch(error => {
                        console.error('Live fetch failed:', error);
                        showNotification('Error', 'Failed to start live fetch', 'danger');
                        // Reset button state
                        $('#start-live-fetch')
                            .prop('disabled', false)
                            .html('<i class="ri-play-circle-line me-1"></i>Start Live Fetch');
                    });
            }

            // Clean polling system
            function stopPolling() {
                // Clean shutdown - no sync intervals needed
            }

            // Simple polling (fallback only)
            async function pollEmails() {
                if (isFetching) {
                    console.log('Polling skipped: Fetch in progress');
                    return;
                }

                if (!currentAccount || !currentCategory) {
                    console.log('No account selected, skipping polling');
                    return;
                }

                console.log(`Simple polling for: ${currentAccount}:${currentCategory}`);
                loadEmails(true);
            }

            // Category Selection
            $(document).on('click keypress', '.category-item', function(e) {
                if (e.type === 'keypress' && e.key !== 'Enter') return;
                e.stopPropagation();
                const email = $(this).closest('.account-item').data('email');
                const category = $(this).data('category');
                if (currentAccount === email && currentCategory === category) return;

                // Add loading state to the clicked item
                $(this).addClass('loading').html(`
                    <div class="d-flex align-items-center">
                        <div class="spinner-border spinner-border-sm text-primary me-2" role="status" style="width: 12px; height: 12px;">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        ${category}
                    </div>
                `);

                switchAccount(email, category);
            });

            // Manual Collapse Toggle
            $(document).on('click', '.account-toggle', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const $this = $(this);
                const target = $this.data('target');
                const $target = $(target);

                $('.account-toggle').not($this).each(function() {
                    const $otherToggle = $(this);
                    const $otherTarget = $($otherToggle.data('target'));
                    if ($otherToggle.data('expanded')) {
                        $otherTarget.fadeOut(200, function() {
                            $otherTarget.removeClass('show').css('display', 'none');
                            $otherToggle.addClass('collapsed').data('expanded', false);
                        });
                    }
                });

                const isExpanded = $this.data('expanded') === true;
                if (isExpanded) {
                    $target.fadeOut(200, function() {
                        $target.removeClass('show').css('display', 'none');
                        $this.addClass('collapsed').data('expanded', false);
                    });
                } else {
                    $target.addClass('show').css('display', 'none').fadeIn(200);
                    $this.removeClass('collapsed').data('expanded', true);
                }
            });

            // Toggle Fullscreen
            $('.toggle-fullscreen-btn').on('click', function() {
                const $emailContainer = $('.email-container');
                const $icon = $(this).find('i');
                const isFullscreen = $emailContainer.hasClass('fullscreen');

                if (isFullscreen) {
                    $emailContainer.removeClass('fullscreen');
                    $icon.removeClass('ri-fullscreen-exit-line').addClass('ri-fullscreen-line');
                    console.log('Switched to normal view');
                } else {
                    $emailContainer.addClass('fullscreen');
                    $icon.removeClass('ri-fullscreen-line').addClass('ri-fullscreen-exit-line');
                    console.log('Switched to fullscreen view');
                }
            });

            // Simple Email Fetching with Cache
            async function fetchEmails(account, category, search = '', pageToken = null, append = false) {
                if (!account || !['inbox', 'spam'].includes(category.toLowerCase())) {
                    console.error(`Invalid params: account=${account}, category=${category}`);
                    $('#email-list').html(
                        '<li class="text-center text-muted">Invalid account or category.</li>');
                    hideLoading('email-list');
                    return {
                        emails: [],
                        nextPageToken: null
                    };
                }
                category = category.toLowerCase();

                // Simple cache key
                const cacheKey = getCacheKey(account, category, currentStatusFilter);

                // Check cache first
                if (!append && !pageToken) {
                    const cached = getCache(cacheKey);
                    if (cached) {
                        console.log(`Using cached emails for ${cacheKey}`);
                        return cached;
                    }
                }

                console.log(
                    `Fetching emails: account=${account}, category=${category}, pageToken=${pageToken}, status=${currentStatusFilter}`
                );
                showLoading('email-list');
                let retries = 3;
                while (retries > 0) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => {
                            controller.abort();
                            console.warn(`Fetch timeout for ${cacheKey}`);
                        }, 10000); // Reduced timeout for faster error feedback

                        const response = await fetch(
                            `/fetch-emails?email=${encodeURIComponent(account)}&category=${encodeURIComponent(category)}&search=${encodeURIComponent(search)}&pageToken=${encodeURIComponent(pageToken || '')}&status=${encodeURIComponent(currentStatusFilter)}`, {
                                method: 'GET',
                                signal: controller.signal,
                                headers: {
                                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                                }
                            }
                        );
                        clearTimeout(timeoutId);

                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        const data = await response.json();
                        console.log(`Fetch completed for ${cacheKey}: ${data.emails.length} emails`);

                        if (!Array.isArray(data.emails)) {
                            console.error(`Invalid email data for ${cacheKey}:`, data);
                            $('#email-list').html(
                                '<li class="text-center text-muted">Invalid email data received.</li>');
                            return {
                                emails: [],
                                nextPageToken: null
                            };
                        }

                        // Cache the result using simple cache
                        setCache(cacheKey, {
                            emails: data.emails,
                            nextPageToken: data.nextPageToken || null
                        });

                        if (data.emails.length > 0) {
                            data.emails.forEach(email => {
                                if (email && email.id) {
                                    // Cache in IndexedDB for offline access
                                    db.emails.put({
                                        id: email.id,
                                        account: account,
                                        category: category,
                                        data: email
                                    }).catch(err => console.error(
                                        `Failed to cache email ${email.id}:`, err));
                                }
                            });
                        }

                        if (data.emails.length === 0 && !append) {
                            console.log(`No emails fetched for ${category} with status ${currentStatusFilter}`);
                            if (account === currentAccount && category.toLowerCase() === currentCategory
                                .toLowerCase()) {
                                $('#email-list').html(
                                    '<li class="text-center py-4"><i class="ri-mail-open-line" style="font-size: 24px; color: #5f6368;"></i><p class="mt-2 mb-0 text-muted">No emails found</p></li>'
                                );
                            }
                        }

                        return getCache(cacheKey);
                    } catch (error) {
                        console.error(`Fetch failed for ${cacheKey}: ${error.message}`);
                        retries--;
                        if (retries === 0 || error.message.includes('abort')) {
                            if (account === currentAccount && category.toLowerCase() === currentCategory
                                .toLowerCase()) {
                                $('#email-list').html(
                                    '<li class="text-center text-muted">Failed to load emails. <a href="#" class="retry-link">Retry</a></li>'
                                );
                            }
                            try {
                                const cachedEmails = await db.emails.where({
                                    account,
                                    category
                                }).toArray();
                                if (cachedEmails.length > 0) {
                                    console.log(
                                        `Falling back to ${cachedEmails.length} cached emails for ${cacheKey}`
                                    );
                                    const fallbackData = {
                                        emails: cachedEmails.map(e => e.data),
                                        nextPageToken: null
                                    };
                                    setCache(cacheKey, fallbackData);
                                    return fallbackData;
                                }
                            } catch (dbError) {
                                console.error(`Failed to access local cache: ${dbError.error}`);
                            }
                            return {
                                emails: [],
                                nextPageToken: null,
                                error: 'Failed to fetch emails'
                            };
                        }
                        console.log(`Retrying fetch (${retries} attempts left)`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } finally {
                        if (account === currentAccount && category.toLowerCase() === currentCategory
                            .toLowerCase()) {
                            hideLoading('email-list');
                        }
                    }
                }
            }

            // Background Sync Emails (without loading states)
            function backgroundSyncEmails() {
                if (!currentAccount || !currentCategory) {
                    console.log('Background sync: Missing account or category');
                    return;
                }
                if (isFetching) {
                    console.log('Background sync: Fetch in progress, skipping');
                    return;
                }

                console.log('Background sync: Starting silent sync');
                isFetching = true;
                const searchQuery = $('.email-search-input').val() || '';

                // Clear simple cache for fresh data
                const cacheKey = getCacheKey(currentAccount, currentCategory);
                emailCache.delete(cacheKey);

                fetchEmails(currentAccount, currentCategory, searchQuery, null, false)
                    .then(data => {
                        if (!data || typeof data !== 'object') {
                            console.log('Background sync: Invalid response');
                            return;
                        }

                        // Check if data has emails property
                        if (!data.emails) {
                            console.log('Background sync: No emails property in response');
                            return;
                        }

                        console.log(`Background sync: Received ${data.emails.length} emails`);

                        // Update emails without showing loading state
                        if (data.emails.length > 0) {
                            displayEmails(data.emails || [], false);
                            if (lastEmailIds && typeof lastEmailIds.set === 'function') {
                                lastEmailIds.set(`${currentAccount}:${currentCategory.toLowerCase()}`, data
                                    .emails[0].id);
                            }
                        }
                    })
                    .catch(error => {
                        console.log('Background sync error:', error.message);
                    })
                    .finally(() => {
                        isFetching = false;
                    });
            }

            // Load Emails
            function loadEmails(clear = false) {
                if (!currentAccount || !currentCategory) {
                    console.error('Missing account or category:', {
                        currentAccount,
                        currentCategory
                    });
                    $('#email-list').html(
                        '<li class="email-item text-center text-muted">No email account selected.</li>');
                    isFetching = false;
                    hideLoading('email-list');
                    return;
                }
                if (isFetching) {
                    console.log('Fetch in progress, queuing loadEmails');
                    return;
                }
                isFetching = true;
                const searchQuery = $('.email-search-input').val() || '';
                console.log(
                    `Loading emails: clear=${clear}, category=${currentCategory}, search=${searchQuery}, pageToken=${nextPageToken}`
                );

                if (clear) {
                    nextPageToken = null;
                    // Clear simple cache for current account/category
                    const cacheKey = getCacheKey(currentAccount, currentCategory, currentStatusFilter);
                    emailCache.delete(cacheKey);
                    $('#email-list').empty();
                }

                fetchEmails(currentAccount, currentCategory, searchQuery, nextPageToken, !clear)
                    .then(data => {
                        if (!data || typeof data !== 'object') {
                            console.error('Invalid load response:', data);
                            $('#email-list').html(
                                '<li class="text-center text-muted">Failed to load emails. <a href="#" class="retry-link">Retry</a></li>'
                            );
                            return;
                        }

                        // Check if data has emails property
                        if (!data.emails) {
                            console.error('Load response missing emails property:', data);
                            $('#email-list').html(
                                '<li class="text-center text-muted">Invalid email data received. <a href="#" class="retry-link">Retry</a></li>'
                            );
                            return;
                        }

                        console.log(
                            `Received ${data.emails.length} emails, nextPageToken: ${data.nextPageToken}`);
                        displayEmails(data.emails || [], !clear);
                        nextPageToken = data.nextPageToken || null;
                        if (!data.emails.length && clear) {
                            $('#email-list').html(`
                                <li class="text-center py-4">
                                    <i class="ri-mail-open-line" style="font-size: 24px; color: #5f6368;"></i>
                                    <p class="mt-2 mb-0 text-muted">No emails found</p>
                                </li>
                            `);
                        }
                        if (data.emails.length > 0 && lastEmailIds && typeof lastEmailIds.set === 'function') {
                            lastEmailIds.set(`${currentAccount}:${currentCategory.toLowerCase()}`, data.emails[
                                0].id);
                        }
                    })
                    .catch(error => {
                        console.error('Load error:', error.message);
                        $('#email-list').html(
                            '<li class="text-center text-muted">Failed to load emails. <a href="#" class="retry-link">Retry</a></li>'
                        );
                    })
                    .finally(() => {
                        isFetching = false;
                        hideLoading('email-list');
                    });
            }

            // Display Emails with Pagination
            function displayEmails(emails, append = false) {
                const emailList = $('#email-list');
                emailList.find('.email-list-loading-placeholder').remove();
                emailList.removeClass('instant-loading');
                console.log('Removed instant-loading class from email list');

                if (!append) {
                    emailList.empty();
                    allEmails = emails;
                    emailListPage = 1;
                } else {
                    // When appending, remove any stale email items that are no longer in the new data
                    const currentEmailIds = emails.map(email => email.id);
                    emailList.find('.email-item').each(function() {
                        const emailId = $(this).data('email-id');
                        if (!currentEmailIds.includes(emailId)) {
                            console.log(`Removing stale email item: ${emailId}`);
                            $(this).remove();
                        }
                    });
                    allEmails = emails;
                }

                if (!emails.length && !append) {
                    emailList.append(`
                        <li class="text-center py-4">
                            <i class="ri-mail-open-line" style="font-size: 24px; color: #5f6368;"></i>
                            <p class="mt-2 mb-0 text-muted">No emails found</p>
                        </li>
                    `);
                    $('#email-pagination').hide();
                    return;
                }

                // Apply pagination
                totalEmails = emails.length;
                const totalPages = Math.ceil(totalEmails / emailsPerPage);
                const startIndex = (emailListPage - 1) * emailsPerPage;
                const endIndex = startIndex + emailsPerPage;
                const paginatedEmails = emails.slice(startIndex, endIndex);

                // Update pagination controls
                updatePaginationControls(totalPages, startIndex, endIndex);

                // Display paginated emails
                console.log(`Displaying ${paginatedEmails.length} emails out of ${totalEmails} total`);
                displayPaginatedEmails(paginatedEmails);

                // Show pagination if there are multiple pages
                if (totalPages > 1) {
                    $('#email-pagination').show();
                    console.log(`Showing pagination controls - ${totalPages} pages`);
                } else {
                    $('#email-pagination').hide();
                    console.log(`Hiding pagination controls - only ${totalPages} page`);
                }
            }

            // Update pagination controls
            function updatePaginationControls(totalPages, startIndex, endIndex) {
                $('#showing-start').text(startIndex + 1);
                $('#showing-end').text(Math.min(endIndex, totalEmails));
                $('#total-emails').text(totalEmails);
                $('#current-page').text(emailListPage);
                $('#total-pages').text(totalPages);

                $('#prev-page-btn').prop('disabled', emailListPage === 1);
                $('#next-page-btn').prop('disabled', emailListPage >= totalPages);

                // Always show pagination controls when there are emails
                if (totalEmails > 0) {
                    $('#email-pagination').show();
                } else {
                    $('#email-pagination').hide();
                }
            }

            // Display paginated emails
            function displayPaginatedEmails(emails) {
                const emailList = $('#email-list');
                emailList.empty();

                // Sort emails by received_at
                emails.sort((a, b) => {
                    const dateA = a.received_at ? new Date(a.received_at) : new Date(0);
                    const dateB = b.received_at ? new Date(b.received_at) : new Date(0);
                    return dateB - dateA;
                });

                // Group emails by date
                const groupedEmails = groupEmailsByDate(emails);

                // Render grouped emails
                renderGroupedEmails(groupedEmails);
            }

            // Group emails by date (like Gmail) - ensure newest first
            function groupEmailsByDate(emails) {
                // Sort emails by received_at DESC to ensure newest first (like Gmail)
                emails.sort((a, b) => {
                    const dateA = new Date(a.received_at || 0);
                    const dateB = new Date(b.received_at || 0);
                    return dateB - dateA; // Newest first
                });

                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const today = new Date(now);
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                const thisWeekStart = new Date(now);
                thisWeekStart.setDate(now.getDate() - now.getDay());
                const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

                const groupedEmails = {
                    today: [],
                    yesterday: [],
                    thisWeek: [],
                    monday: [],
                    thisMonth: [],
                    lastMonth: [],
                    older: []
                };

                emails.forEach(email => {
                    let receivedDate;
                    try {
                        receivedDate = email.received_at ? new Date(email.received_at) : null;
                        if (isNaN(receivedDate)) throw new Error('Invalid date');
                    } catch (e) {
                        console.warn(`Invalid received_at for email ${email.id}: ${email.received_at}`);
                        groupedEmails.older.push(email);
                        return;
                    }

                    const dateStart = new Date(receivedDate);
                    dateStart.setHours(0, 0, 0, 0);

                    if (dateStart.getTime() === today.getTime()) {
                        groupedEmails.today.push(email);
                    } else if (dateStart.getTime() === yesterday.getTime()) {
                        groupedEmails.yesterday.push(email);
                    } else if (dateStart >= thisWeekStart && dateStart < yesterday) {
                        if (dateStart.getDay() === 1) {
                            groupedEmails.monday.push(email);
                        } else {
                            groupedEmails.thisWeek.push(email);
                        }
                    } else if (dateStart >= thisMonthStart && dateStart < thisWeekStart) {
                        groupedEmails.thisMonth.push(email);
                    } else if (dateStart >= lastMonthStart && dateStart <= lastMonthEnd) {
                        groupedEmails.lastMonth.push(email);
                    } else {
                        groupedEmails.older.push(email);
                    }
                });

                return groupedEmails;
            }

            // Render grouped emails
            function renderGroupedEmails(groupedEmails) {
                const emailList = $('#email-list');
                // Ensure instant-loading class is removed
                emailList.removeClass('instant-loading');

                // Render emails with headers
                const renderGroup = (group, header) => {
                    if (group.length > 0) {
                        emailList.append(`<li class="email-date-header">${header}</li>`);
                        group.forEach(email => {
                            const status = email.status || 'unknown';
                            const statusBadge = status && status !== 'unknown' ?
                                `<span class="badge bg-${getStatusColor(status)} ms-2">${formatStatus(status)}</span>` :
                                '';
                            emailList.append(`
                                    <li class="email-item ${email.read ? 'read' : ''}" data-email-id="${email.id}" 
                                        data-thread-id="${email.threadId}" tabindex="0" role="option" 
                                        aria-label="${email.subject || 'No subject'}">
                                        <div class="d-flex justify-content-between align-items-center p-3">
                                            <div class="flex-grow-1">
                                                <div class="email-from" style="font-weight: ${email.read ? 'normal' : '500'}; font-size: 14px;">${email.from || 'Unknown Sender'}${statusBadge}</div>
                                                <div class="email-subject" style="font-size: 14px;">${email.subject || 'No subject'}</div>
                                                <div class="email-snippet text-muted" style="font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${email.snippet || ''}</div>
                                            </div>
                                            <div class="email-time text-muted" style="font-size: 12px; min-width: 100px; text-align: right;" title="${email.received_at || 'No date'}">${formatEmailTime(email.received_at)}</div>
                                        </div>
                                    </li>
                                `);
                        });
                    }
                };

                // Render groups
                renderGroup(groupedEmails.today, 'Today');
                renderGroup(groupedEmails.yesterday, 'Yesterday');
                renderGroup(groupedEmails.thisWeek, 'This Week');
                renderGroup(groupedEmails.monday, 'Monday');
                renderGroup(groupedEmails.thisMonth, 'This Month');
                renderGroup(groupedEmails.lastMonth, 'Last Month');
                renderGroup(groupedEmails.older, 'Older');

                // Animate email items
                emailList.find('.email-item').css('opacity', '0').animate({
                    opacity: 1
                }, 200);

                // Set up interactions - pass all emails for proper data lookup
                const allGroupedEmails = groupedEmails.today.concat(groupedEmails.yesterday, groupedEmails.thisWeek,
                    groupedEmails.monday, groupedEmails.thisMonth, groupedEmails.lastMonth, groupedEmails.older);
                setupEmailInteractions(allGroupedEmails);

                console.log(
                    `Rendered ${groupedEmails.today.concat(groupedEmails.yesterday, groupedEmails.thisWeek, groupedEmails.monday, groupedEmails.thisMonth, groupedEmails.lastMonth, groupedEmails.older).length} emails`
                );

                // Show quick actions if emails are loaded
                const totalEmails = groupedEmails.today.concat(groupedEmails.yesterday, groupedEmails.thisWeek,
                        groupedEmails.monday, groupedEmails.thisMonth, groupedEmails.lastMonth, groupedEmails.older)
                    .length;
                if (totalEmails > 0) {
                    showQuickActions();
                }
            }

            // Format email time
            function formatEmailTime(received_at) {
                if (!received_at || received_at === 'No date' || received_at === '') return '';

                try {
                    // Handle different date formats and timezone conversion
                    let date;
                    if (typeof received_at === 'string') {
                        // Try to parse the date string - assume it's in UTC if it's a standard format
                        if (received_at.includes('T') || received_at.includes('Z')) {
                            // ISO format - parse directly
                            date = new Date(received_at);
                        } else {
                            // MySQL datetime format - assume UTC and convert to local
                            const utcDate = new Date(received_at + ' UTC');
                            date = new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000));
                        }

                        if (isNaN(date.getTime())) {
                            // Fallback: try parsing as is
                            date = new Date(received_at);
                        }
                    } else {
                        date = new Date(received_at);
                    }

                    if (isNaN(date.getTime())) {
                        console.warn('Invalid date format:', received_at);
                        return '';
                    }

                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const emailDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

                    // If it's today, show time
                    if (emailDate.getTime() === today.getTime()) {
                        return date.toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        });
                    }

                    // If it's this year, show month and day
                    if (date.getFullYear() === now.getFullYear()) {
                        return date.toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric'
                        });
                    }

                    // If it's older, show month, day, and year
                    return date.toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                } catch (error) {
                    console.error('Error formatting email time:', error, 'received_at:', received_at);
                    return '';
                }
            }

            function getStatusColor(status) {
                switch (status.toLowerCase()) {
                    case 'unsubscribe':
                        return 'danger';
                    case 'automatic_reply':
                        return 'warning';
                    case 'no_longer':
                        return 'danger';
                    case 'hard_bounce':
                        return 'danger';
                    case 'soft_bounce':
                        return 'warning';
                    default:
                        return '';
                }
            }

            // Email Interactions
            function setupEmailInteractions(emails) {
                $('.email-item').off('click contextmenu keypress')
                    .on('click keypress', function(e) {
                        if (e.type === 'keypress' && e.key !== 'Enter') return;
                        $('.email-item').removeClass('active');
                        $(this).addClass('active');
                        const emailId = $(this).data('email-id');
                        const email = emails.find(e => e.id === emailId) || {
                            id: emailId,
                            subject: 'No Subject',
                            from: 'Unknown Sender',
                            received_at: 'No date'
                        };
                        console.log(`Email item clicked: emailId=${emailId}, email=`, email);

                        // Debug: Check if emailId is valid
                        if (!emailId || emailId === 'undefined' || emailId === 'null') {
                            console.error('Invalid emailId:', emailId);
                            showNotification('Error', 'Invalid email ID. Please refresh the page.', 'danger');
                            return;
                        }

                        fetchEmailContent(emailId, email);
                    })
                    .on('contextmenu', function(e) {
                        e.preventDefault();
                        showContextMenu(e, $(this).data('email-id'));
                    });
            }

            // Context Menu
            function showContextMenu(e, emailId) {
                const menu = $('#context-menu');
                const isInbox = currentCategory.toLowerCase() === 'inbox';
                menu.html(`
                    <div class="context-menu-item" data-action="read" role="menuitem">Mark as Read</div>
                    <div class="context-menu-item" data-action="unread" role="menuitem">Mark as Unread</div>
                    <div class="context-menu-item" data-action="delete" role="menuitem">Delete</div>
                    ${isInbox ? `<div class="context-menu-item" data-action="move_to_spam" role="menuitem">Move to Spam</div>` : ''}
                `).css({
                    top: e.pageY,
                    left: e.pageX
                }).show();

                menu.off('click').on('click', '.context-menu-item', function() {
                    const action = $(this).data('action');
                    handleEmailAction(emailId, action);
                    menu.hide();
                });

                $(document).one('click', () => menu.hide());
            }

            // Handle Email Action
            function handleEmailAction(emailId, action) {
                console.log(`Handling action: ${action} for emailId: ${emailId}`);
                if (action === 'move_to_spam') {
                    const $emailId = $(`.email-item[data-email-id="${emailId}"]`);
                    $emailId.find('.d-flex').append(`
                        <div class="spinner-border spinner-border-sm text-primary ms-2 moving-spinner" role="status">
                            <span class="visually-hidden">Moving...</span>
                        </div>
                    `);
                }

                fetch('/email-action', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        },
                        body: JSON.stringify({
                            email_id: emailId,
                            action
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            console.log(`Action ${action} successful for ${emailId}`);
                            if (action === 'move_to_spam') {
                                setTimeout(() => {
                                    $(`.email-item[data-email-id="${emailId}"]`).remove();
                                    loadEmails(true);
                                    showNotification('Success', `Email moved to Spam`, 'success');
                                }, 2000);
                            } else {
                                loadEmails(true);
                            }
                        } else {
                            console.error(`Action ${action} failed:`, data.error);
                            $(`.email-item[data-email-id="${emailId}"] .moving-spinner`).remove();
                            showNotification('Error', `Failed to move email to Spam`, 'danger');
                        }
                    })
                    .catch(error => {
                        console.error(`Action ${action} failed:`, error);
                        $(`.email-item[data-email-id="${emailId}"] .moving-spinner`).remove();
                        showNotification('Error', `Failed to move email to Spam`, 'danger');
                    });
            }

            // Fetch Email Content
            function fetchEmailContent(emailId, email) {
                if (isFetchingContent) {
                    console.log(`Fetch in progress for another email, skipping ${emailId}`);
                    return;
                }
                isFetchingContent = true;
                console.log(`Fetching email content: emailId=${emailId}`);

                // Show loading immediately
                showLoading('email-view');
                const $emailView = $('#email-view');
                const $contentCard = $emailView.find('.email-content-card');

                // Clear existing content to avoid overlap
                $contentCard.empty().html('<div class="p-3 text-muted">Loading email content...</div>');

                // Check if this email still exists in the current list
                const emailExists = $(`#email-list .email-item[data-email-id="${emailId}"]`).length > 0;
                if (!emailExists) {
                    console.warn(`Email ${emailId} not found in current list, refreshing emails`);
                    loadEmails(true);
                    isFetchingContent = false;
                    hideLoading('email-view');
                    return;
                }

                // Enforce minimum loading duration (300ms)
                const minLoadingTime = new Promise(resolve => setTimeout(resolve, 300));

                // Check cache first
                const cacheKey = `email-content:${emailId}`;
                if (emailCache[cacheKey]) {
                    console.log(`Using cached content for ${emailId}`);
                    Promise.all([minLoadingTime]).then(() => {
                        displayEmailContent(emailId, emailCache[cacheKey].messages);
                        isFetchingContent = false;
                        hideLoading('email-view');
                    });
                    return;
                }

                console.log(`Making fetch request for emailId: ${emailId}`);
                fetch(`/fetch-email-content?email_id=${encodeURIComponent(emailId)}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        }
                    })
                    .then(res => {
                        if (!res.ok) {
                            if (res.status === 400) {
                                throw new Error(
                                    `Session issue: The active email session may have expired. Please refresh the page or switch accounts.`
                                    );
                            }
                            throw new Error(`HTTP error! Status: ${res.status}`);
                        }
                        return res.json();
                    })
                    .then(data => {
                        // Cache the fetched content
                        emailCache[cacheKey] = {
                            messages: data.messages || [{
                                id: emailId,
                                from: email.from || 'Unknown Sender',
                                subject: email.subject || 'No Subject',
                                date: email.received_at || 'No date',
                                body: data?.body || 'No content available'
                            }],
                            thread_id: data.thread_id || emailId
                        };
                        return Promise.all([minLoadingTime]).then(() => {
                            if (data && data.messages && data.thread_id) {
                                displayEmailContent(data.thread_id, data.messages);
                            } else {
                                displayEmailContent(emailId, emailCache[cacheKey].messages);
                            }
                        });
                    })
                    .catch(error => {
                        console.error(`Fetch failed for ${emailId}:`, error);
                        return Promise.all([minLoadingTime]).then(() => {
                            let errorMessage = 'Failed to load email content';
                            if (error.message) {
                                errorMessage += `: ${error.message}`;
                            }

                            // Try to debug the issue
                            fetch(`/debug-email?email_id=${emailId}`)
                                .then(res => res.json())
                                .then(debugInfo => {
                                    console.log('Debug info:', debugInfo);
                                    if (debugInfo.found_by_message_id === 0 && debugInfo
                                        .found_by_id === 0) {
                                        errorMessage += ' (Email not found in database)';

                                        // Show a refresh button to reload emails
                                        const refreshButton =
                                            '<button class="btn btn-sm btn-primary mt-2" onclick="loadEmails(true)">Refresh Email List</button>';
                                        errorMessage += '<br>' + refreshButton;

                                        // Also show a message about the email being stale
                                        errorMessage +=
                                            '<br><small class="text-muted">This email may have been deleted or is no longer available. Try refreshing the email list.</small>';
                                    }
                                })
                                .catch(debugError => {
                                    console.error('Debug request failed:', debugError);
                                });

                            displayEmailContent(emailId, [{
                                id: emailId,
                                from: email.from || 'Unknown Sender',
                                subject: email.subject || 'No Subject',
                                date: email.received_at || 'No date',
                                body: `
                                    <div class="alert alert-warning">
                                        <h6><i class="ri-error-warning-line"></i> Email Not Found</h6>
                                        <p>${errorMessage}</p>
                                        <div class="mt-3">
                                            <button class="btn btn-primary btn-sm" onclick="loadEmails(true)">
                                                <i class="ri-refresh-line"></i> Refresh Email List
                                            </button>
                                            <button class="btn btn-outline-secondary btn-sm ms-2" onclick="fetchAuthenticatedAccounts()">
                                                <i class="ri-mail-line"></i> Reload Accounts
                                            </button>
                                        </div>
                                    </div>
                                `
                            }]);
                        });
                    })
                    .finally(() => {
                        isFetchingContent = false;
                        hideLoading('email-view');
                    });
            }

            // Display Email Content
            function displayEmailContent(threadId, messages) {
                console.log(`Rendering email content: threadId=${threadId}, messages=`, messages);
                const emailView = $('#email-view');
                const contentCard = emailView.find('.email-content-card');

                const subject = messages.length > 0 ? messages[messages.length - 1].subject || 'No Subject' :
                    'No Subject';

                emailView.find('.email-view-header h5').text(subject);

                contentCard.empty(); // Ensure content is cleared before rendering

                if (!messages || !Array.isArray(messages) || messages.length === 0) {
                    contentCard.html('<div class="p-3 text-muted">No messages available</div>');
                    return;
                }

                messages.forEach((msg, index) => {
                    const senderName = msg.from ? msg.from.split('<')[0].trim() : 'Unknown Sender';
                    const senderEmail = msg.from && msg.from.includes('<') ? msg.from.split('<')[1].replace(
                        '>', '') : msg.from || '';

                    // Enhanced content processing with consistent layout
                    let messageBody = msg.body && typeof msg.body === 'string' ? msg.body :
                        '<p>No content available</p>';

                    // Process the content to handle embedded images and attachments
                    const processedContent = processEmailContent(messageBody);

                    const messageHtml = `
                        <div class="message-card" data-message-id="${msg.id || 'unknown'}">
                            <div class="message-header" role="button" aria-expanded="true">
                                <div class="avatar" style="background-color: ${stringToColor(senderName)}">
                                    ${senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div class="flex-grow-1">
                                    <div class="sender-info">
                                        <span class="sender-name">${senderName}</span>
                                        ${senderEmail ? `<span class="sender-email"><${senderEmail}></span>` : ''}
                                    </div>
                                    <div class="message-meta">
                                        <span>${msg.date || 'No date'}</span>
                                        <span class="arrow">▼</span>
                                    </div>
                                </div>
                            </div>
                            <div class="message-body">
                                <div class="email-view-controls">
                                    <button class="view-toggle-btn active" data-view="clean">Clean View</button>
                                    <button class="view-toggle-btn" data-view="original">Original</button>
                                </div>
                                <div class="message-content-wrapper" style="margin-top: 16px;">
                                    <div class="email-body-wrapper">
                                        <div class="email-body-container" data-view="clean" style="font-size: 14px; line-height: 1.6; color: #202124;">
                                            ${cleanEmailContent(processedContent.mainContent)}
                                        </div>
                                        <div class="email-source-container" data-view="original">
                                            ${escapeHtml(messageBody)}
                                        </div>
                                    </div>
                                    ${processedContent.attachments ? `<div class="message-attachments">${processedContent.attachments}</div>` : ''}
                                    ${processedContent.images ? `<div class="message-images">${processedContent.images}</div>` : ''}
                                    ${processedContent.plainText ? `<div class="message-plain-text">${processedContent.plainText}</div>` : ''}
                                </div>

                            </div>
                        </div>
                    `;
                    contentCard.append(messageHtml);
                });

                // Apply styles for message display
                applyMessageStyles();

                // Setup interactions for message cards
                setupMessageInteractions();

                // Setup view toggle functionality
                setupViewToggle();
            }

            // Clean email content for consistent display
            function cleanEmailContent(content) {
                if (!content || typeof content !== 'string') {
                    return '<p style="color: #666; font-style: italic;">No content available</p>';
                }

                // Gmail-like content cleaning - preserve readability while removing problematic elements
                let cleaned = content
                    // Remove DOCTYPE and HTML declarations
                    .replace(/<!doctype[^>]*>/gi, '')
                    .replace(/<html[^>]*>/gi, '')
                    .replace(/<\/html>/gi, '')
                    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
                    .replace(/<body[^>]*>/gi, '')
                    .replace(/<\/body>/gi, '')

                    // Remove problematic CSS and scripts but preserve inline formatting
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/style\s*=\s*["'][^"']*["']/gi, '')

                    // Remove email tracking elements
                    .replace(/<img[^>]*width\s*=\s*["']?[01]?["']?[^>]*height\s*=\s*["']?[01]?["']?[^>]*>/gi, '')
                    .replace(/<img[^>]*src\s*=\s*["'][^"']*tracking[^"']*["'][^>]*>/gi, '')

                    // Clean up excessive spacing elements but preserve content structure
                    .replace(/<td[^>]*class\s*=\s*["']?empty["']?[^>]*>[\s&nbsp;]*<\/td>/gi, '')
                    .replace(/<div[^>]*class\s*=\s*["']?spacer["']?[^>]*>[\s&nbsp;]*<\/div>/gi, '')
                    .replace(/<table[^>]*class\s*=\s*["']?spacer["']?[^>]*>[\s\S]*?<\/table>/gi, '')

                    // Convert common email elements to readable format
                    .replace(/<table[^>]*role\s*=\s*["']?presentation["']?[^>]*>/gi, '<div>')
                    .replace(/<\/table>/gi, '</div>')
                    .replace(/<tr[^>]*>/gi, '<div>')
                    .replace(/<\/tr>/gi, '</div>')
                    .replace(/<td[^>]*>/gi, '<span>')
                    .replace(/<\/td>/gi, '</span>')

                    // Clean up whitespace and empty elements
                    .replace(/&nbsp;/g, ' ')
                    .replace(/\s+/g, ' ')
                    .replace(/<p>\s*<\/p>/gi, '')
                    .replace(/<div>\s*<\/div>/gi, '')
                    .replace(/<span>\s*<\/span>/gi, '')

                    // Fix image sources and ensure proper display
                    .replace(/src\s*=\s*["']\/\//g, 'src="https://')
                    .replace(/<img([^>]*)>/gi,
                        '<img$1 style="max-width: 100%; height: auto; display: block; margin: 8px 0;">')

                    // Remove dangerous attributes but preserve links
                    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
                    .replace(/javascript:/gi, '')

                    // Ensure proper line breaks and spacing
                    .replace(/<br\s*\/?>/gi, '<br>')
                    .replace(/(<\/p>|<\/div>|<\/h[1-6]>)/gi, '$1<br>');

                return cleaned ||
                    '<p style="color: #666; font-style: italic;">Email content could not be displayed properly</p>';
            }

            // Escape HTML for safe display in source view
            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            // Process email content to handle embedded images and attachments
            function processEmailContent(content) {
                if (!content || typeof content !== 'string') {
                    return {
                        mainContent: '<p>No content available</p>',
                        attachments: null,
                        images: null,
                        plainText: null
                    };
                }

                const result = {
                    mainContent: content,
                    attachments: null,
                    images: null,
                    plainText: null
                };

                // Extract embedded images section
                const imagesMatch = content.match(/--- Embedded Images ---\n([\s\S]*?)(?=\n\n---|$)/);
                if (imagesMatch) {
                    const images = imagesMatch[1].trim().split('\n').filter(line => line.trim());
                    let imagesHtml =
                        '<div class="embedded-images-section"><h6>Embedded Images:</h6><div class="image-grid">';
                    images.forEach(image => {
                        const match = image.match(/\[Image: (.*?) - (.*?)\]/);
                        if (match) {
                            imagesHtml +=
                                `<div class="image-item"><span class="image-name">${match[1]}</span><span class="image-type">${match[2]}</span></div>`;
                        }
                    });
                    imagesHtml += '</div></div>';
                    result.images = imagesHtml;

                    // Remove images section from main content
                    result.mainContent = result.mainContent.replace(
                        /--- Embedded Images ---\n[\s\S]*?(?=\n\n---|$)/, '');
                }

                // Extract attachments section
                const attachmentsMatch = content.match(/--- Attachments ---\n([\s\S]*?)(?=\n\n---|$)/);
                if (attachmentsMatch) {
                    const attachments = attachmentsMatch[1].trim().split('\n').filter(line => line.trim());
                    let attachmentsHtml =
                        '<div class="attachments-section"><h6>Attachments:</h6><div class="attachment-list">';
                    attachments.forEach(attachment => {
                        const match = attachment.match(/\[Attachment: (.*?) - (.*?) - (.*?) bytes\]/);
                        if (match) {
                            attachmentsHtml +=
                                `<div class="attachment-item"><span class="attachment-name">${match[1]}</span><span class="attachment-type">${match[2]}</span><span class="attachment-size">${match[3]} bytes</span></div>`;
                        }
                    });
                    attachmentsHtml += '</div></div>';
                    result.attachments = attachmentsHtml;

                    // Remove attachments section from main content
                    result.mainContent = result.mainContent.replace(/--- Attachments ---\n[\s\S]*?(?=\n\n---|$)/,
                        '');
                }

                // Extract plain text fallback
                const plainTextMatch = content.match(/--- Plain Text Version ---\n([\s\S]*?)(?=\n\n---|$)/);
                if (plainTextMatch) {
                    const plainTextHtml =
                        `<div class="plain-text-fallback"><h6>Plain Text Version:</h6><pre>${plainTextMatch[1]}</pre></div>`;
                    result.plainText = plainTextHtml;

                    // Remove plain text section from main content
                    result.mainContent = result.mainContent.replace(
                        /--- Plain Text Version ---\n[\s\S]*?(?=\n\n---|$)/, '');
                }

                // Clean up main content
                result.mainContent = result.mainContent.trim();
                if (!result.mainContent) {
                    result.mainContent = '<p>No content available</p>';
                }

                return result;
            }

            // Apply Message Styles
            function applyMessageStyles() {
                const style = `
                    .message-card { margin: 0 0 8px; border: 1px solid #e8eaed; border-radius: 8px; background: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.05); overflow: hidden; }
                    .message-card.collapsed .message-body { display: none; }
                    .message-header { display: flex; align-items: center; padding: 12px 16px; background: #ffffff; border-bottom: 1px solid #e8eaed; cursor: pointer; }
                    .message-header:hover { background: #f8f9fa; }
                    .avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 500; margin-right: 12px; }
                    .sender-info { display: flex; flex-direction: column; flex-grow: 1; min-width: 0; }
                    .sender-name { font-size: 14px; font-weight: 500; color: #202124; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .sender-email { font-size: 12px; color: #5f6368; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .message-meta { font-size: 12px; color: #5f6368; min-width: 120px; text-align: right; display: flex; align-items: center; justify-content: flex-end; }
                    .message-meta .arrow { margin-left: 8px; }
                    .message-body { font-size: 14px; color: #202124; line-height: 1.5; }
                    .message-content { padding: 16px; word-break: break-word; overflow: auto; isolation: isolate; }
                    .message-content p { margin: 0 0 8px; }
                    .message-content img { max-width: 100%; height: auto; }
                    .message-content a { color: #1a0dab; text-decoration: none; }
                    .message-content a:hover { text-decoration: underline; }
                    .message-content .gmail_quote, .message-content blockquote.gmail_quote { margin: 16px 0; padding-left: 16px; border-left: 2px solid #dadce0; color: #5f6368; }
                    .gmail-quoted-content { margin: 16px 0; }
                    .gmail-quote-header { cursor: pointer; padding: 8px; background: #f1f3f4; border-radius: 4px; text-align: center; }
                    .gmail-quote-body { margin-top: 8px; padding-left: 16px; border-left: 2px solid #dadce0; }
                    .email-date-header { font-size: 14px; font-weight: 500; color: #5f6368; padding: 12px 16px; background: #f8f9fa; border-bottom: 1px solid #e8eaed; }
                `;
                const styleSheet = document.createElement('style');
                styleSheet.innerText = style;
                document.head.appendChild(styleSheet);
            }

            // Setup Message Interactions
            function setupMessageInteractions() {
                // Toggle Message Card
                $(document).on('click keypress', '.message-header', function(e) {
                    if (e.type === 'keypress' && e.key !== 'Enter') return;
                    e.preventDefault();

                    const $messageCard = $(this).closest('.message-card');
                    const isCollapsed = $messageCard.hasClass('collapsed');
                    const $arrow = $(this).find('.arrow');

                    if (isCollapsed) {
                        // Expand
                        $messageCard.removeClass('collapsed');
                        $messageCard.find('.message-body').slideDown(300);
                        $(this).attr('aria-expanded', 'true');
                        $arrow.text('▼'); // Change to down arrow
                    } else {
                        // Collapse
                        $messageCard.addClass('collapsed');
                        $messageCard.find('.message-body').slideUp(300);
                        $(this).attr('aria-expanded', 'false');
                        $arrow.text('▶'); // Change to right arrow
                    }
                });

                // Reply/Forward Button Handlers
                $('.reply-btn, .forward-btn').off('click').on('click', function() {
                    const action = $(this).text();
                    const messageId = $(this).closest('.message-card').data('message-id');
                    console.log(`Clicked ${action} for message ID: ${messageId}`);
                    // Add reply/forward logic here if needed
                });
            }

            // String to Color
            function stringToColor(str) {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    hash = str.charCodeAt(i) + ((hash << 5) - hash);
                }
                const hue = Math.abs(hash % 360);
                return `hsl(${hue}, 50%, 60%)`;
            }

            // Update Sidebar Counts with Sync Status
            function updateSidebarCounts(email) {
                console.log(`Updating sidebar counts for ${email}`);

                // Fetch email counts
                fetch(`/email-counts?email=${encodeURIComponent(email)}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        }
                    })
                    .then(res => {
                        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                        return res.json();
                    })
                    .then(data => {
                        console.log(`Received counts for ${email}:`, data);
                        const accountId = email.replace(/[^a-zA-Z0-9]/g, '');
                        const $inboxItem = $(`#${accountId}-categories .category-item[data-category="Inbox"]`);
                        const $spamItem = $(`#${accountId}-categories .category-item[data-category="Spam"]`);

                        if (data.inbox !== undefined) {
                            $inboxItem.find('.badge').remove();
                            if (data.inbox > 0) {
                                $inboxItem.append(`<span class="badge bg-primary ms-2">${data.inbox}</span>`);
                            }
                        }
                        if (data.spam !== undefined) {
                            $spamItem.find('.badge').remove();
                            if (data.spam > 0) {
                                $spamItem.append(`<span class="badge bg-primary ms-2">${data.spam}</span>`);
                            }
                        }
                    })
                    .catch(error => {
                        console.error(`Failed to fetch counts for ${email}:`, error);
                    });

                // Also fetch sync status for this email
                fetch('/all-sync-status')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.success && data.sync_statuses) {
                            const emailStatuses = data.sync_statuses.filter(s => s.email === email);

                            emailStatuses.forEach(status => {
                                const accountId = email.replace(/[^a-zA-Z0-9]/g, '');
                                const categoryItem = $(
                                    `.account-item[data-email="${email}"] .category-item[data-category="${status.category}"]`
                                );

                                if (categoryItem.length > 0) {
                                    const statusClass = getStatusClass(status.status);
                                    const statusIcon = getStatusIcon(status.status);

                                    // Add sync status indicator
                                    categoryItem.find('.sync-indicator').remove();
                                    if (status.status === 'syncing') {
                                        categoryItem.append(`
                                        <div class="sync-indicator">
                                            <i class="${statusIcon} me-1" style="font-size: 0.8rem; color: #007bff;"></i>
                                            <small class="text-muted">${status.synced_count}/${status.total_count}</small>
                                        </div>
                                    `);
                                        categoryItem.addClass('syncing');
                                    } else {
                                        categoryItem.removeClass('syncing');
                                    }
                                }
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Failed to update sync status in sidebar:', error);
                    });
            }

            // Status Filter
            $('#status-filter').on('change', function() {
                const newStatusFilter = $(this).val();
                console.log(`Status filter changed from ${currentStatusFilter} to ${newStatusFilter}`);

                // Clear cache for the previous status filter
                if (currentAccount && currentCategory) {
                    const oldCacheKey = getCacheKey(currentAccount, currentCategory, currentStatusFilter);
                    emailCache.delete(oldCacheKey);
                    console.log(`Cleared cache for old filter: ${oldCacheKey}`);
                }

                currentStatusFilter = newStatusFilter;
                console.log(`Current status filter set to: ${currentStatusFilter}`);
                loadEmails(true);
            });

            // Initialize status filter to "all"
            $('#status-filter').val('all');
            currentStatusFilter = 'all';

            // Search Handler with Smart Suggestions
            const searchEmails = debounce(function() {
                loadEmails(true);
            }, 500);

            $('.email-search-input').on('input', function() {
                const query = $(this).val();
                showSearchSuggestions(query);
                searchEmails();
            });

            // Handle search suggestion clicks
            $(document).on('click', '.search-suggestion-item', function() {
                const suggestion = $(this).data('suggestion');
                $('.email-search-input').val(suggestion);
                $('#search-suggestions').hide();
                loadEmails(true);
            });

            // Hide suggestions when clicking outside
            $(document).on('click', function(e) {
                if (!$(e.target).closest('.smart-search').length) {
                    $('#search-suggestions').hide();
                }
            });

            // Pagination handlers with smooth transitions
            $('#prev-page-btn').on('click', function() {
                if (emailListPage > 1) {
                    emailListPage--;
                    const startIndex = (emailListPage - 1) * emailsPerPage;
                    const endIndex = startIndex + emailsPerPage;
                    const paginatedEmails = allEmails.slice(startIndex, endIndex);

                    // Add smooth transition
                    $('#email-list').addClass('paginating');
                    setTimeout(() => {
                        displayPaginatedEmails(paginatedEmails);
                        updatePaginationControls(Math.ceil(totalEmails / emailsPerPage), startIndex,
                            endIndex);
                        $('#email-list').removeClass('paginating');
                    }, 150);
                }
            });

            $('#next-page-btn').on('click', function() {
                const totalPages = Math.ceil(totalEmails / emailsPerPage);
                if (emailListPage < totalPages) {
                    emailListPage++;
                    const startIndex = (emailListPage - 1) * emailsPerPage;
                    const endIndex = startIndex + emailsPerPage;
                    const paginatedEmails = allEmails.slice(startIndex, endIndex);

                    // Add smooth transition
                    $('#email-list').addClass('paginating');
                    setTimeout(() => {
                        displayPaginatedEmails(paginatedEmails);
                        updatePaginationControls(totalPages, startIndex, endIndex);
                        $('#email-list').removeClass('paginating');
                    }, 150);
                }
            });

            // Quick action handlers
            $('#refresh-btn').on('click', function() {
                $(this).addClass('spinning');
                loadEmails(true);
                setTimeout(() => $(this).removeClass('spinning'), 1000);
            });

            // Clean interface - no sync buttons needed

            // Start live fetch button handler
            $('#start-live-fetch').on('click', function() {
                if (confirm(
                        'Start live email fetching for all accounts? This will continuously monitor for new emails.'
                    )) {
                    startLiveFetch();
                }
            });

            // Show quick actions when emails are loaded
            function showQuickActions() {
                $('#quick-actions').fadeIn(300);
            }

            // Retry Link
            $(document).on('click', '.retry-link', function(e) {
                e.preventDefault();
                console.log('Retry clicked');
                loadEmails(true);
            });

            // Infinite Scroll
            $('.email-list-container').on('scroll', function() {
                const container = this;
                if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50 &&
                    !isFetching && nextPageToken) {
                    console.log('Reached bottom, loading more emails');
                    loadEmails();
                }
            });

            // Thunderbird-style User Activity Detection
            function setupUserActivityDetection() {
                // Track user activity
                const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
                activityEvents.forEach(event => {
                    document.addEventListener(event, updateUserActivity, {
                        passive: true
                    });
                });

                // Check inactivity every minute
                setInterval(checkUserInactivity, 60 * 1000);

                // Page visibility API (like Thunderbird)
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        console.log('Page hidden, switching to background mode');
                        isUserActive = false;
                        pollingInterval = POLLING_INTERVALS.BACKGROUND;
                    } else {
                        console.log('Page visible, switching to active mode');
                        updateUserActivity();
                    }
                });
            }

            // Simple Notification System
            function showNotification(title, message, type = 'info') {
                const toast = `
                    <div class="toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                        <div class="d-flex">
                            <div class="toast-body">
                                <strong>${title}</strong><br>
                                ${message}
                            </div>
                            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                        </div>
                    </div>
                `;

                $('.toast-container').append(toast);
                const toastElement = $('.toast-container .toast').last();
                const bsToast = new bootstrap.Toast(toastElement[0]);
                bsToast.show();

                // Auto remove after 5 seconds
                setTimeout(() => {
                    toastElement.remove();
                }, 5000);
            }

            // Initialize Broadcasting for Real-time Updates
            function initializeBroadcasting() {
                // Set user ID for broadcasting
                window.userId = '{{ auth()->id() }}';

                // Check if Echo is available
                if (!window.Echo) {
                    console.warn('⚠️ Laravel Echo not available, using fallback polling');
                    showNotification('Info', 'Using fallback polling (no real-time updates)', 'info');
                    return;
                }

                try {
                    // Listen for real-time email updates
                    window.Echo.private(`email-sync.${window.userId}`)
                        .listen('.email.sync.completed', (e) => {
                            console.log('📧 Email sync completed:', e);
                            if (e.email === currentAccount && e.category === currentCategory) {
                                // Refresh emails when sync completes
                                loadEmails(true);
                                showNotification('Success', `Sync completed: ${e.newEmailsCount} new emails`,
                                    'success');
                            }
                        })
                        .listen('.email.new.received', (e) => {
                            console.log('📨 New emails received:', e);
                            if (e.email === currentAccount && e.category === currentCategory) {
                                // Show notification for new emails
                                showNotification('New Email', `${e.count} new emails in ${e.category}`, 'info');
                                // Refresh emails
                                loadEmails(true);
                            }
                        });

                    console.log('✅ Broadcasting initialized successfully with Reverb');

                    // Add connection status indicator
                    if (window.Echo.connector && window.Echo.connector.socket) {
                        window.Echo.connector.socket.on('connect', () => {
                            console.log('🟢 Reverb connected');
                            showNotification('Connected', 'Real-time updates enabled', 'success');
                        });

                        window.Echo.connector.socket.on('disconnect', () => {
                            console.log('🔴 Reverb disconnected');
                            showNotification('Disconnected', 'Real-time updates disabled', 'warning');
                        });
                    }

                } catch (error) {
                    console.error('❌ Broadcasting initialization failed:', error);
                    showNotification('Error', 'Real-time updates not available', 'error');
                }
            }

            // Setup view toggle functionality
            function setupViewToggle() {
                $(document).on('click', '.view-toggle-btn', function() {
                    const $btn = $(this);
                    const view = $btn.data('view');
                    const $messageCard = $btn.closest('.message-card');

                    // Update button states
                    $messageCard.find('.view-toggle-btn').removeClass('active');
                    $btn.addClass('active');

                    // Toggle view containers
                    if (view === 'clean') {
                        $messageCard.find('.email-body-container').show();
                        $messageCard.find('.email-source-container').hide();
                    } else if (view === 'original') {
                        $messageCard.find('.email-body-container').hide();
                        $messageCard.find('.email-source-container').show();
                    }
                });
            }

            // Initialize
            fetchAuthenticatedAccounts();
            setupUserActivityDetection();
            initializeBroadcasting();

            // Start fallback polling if broadcasting is not available
            setTimeout(() => {
                if (!window.Echo) {
                    console.log('🔄 Starting fallback polling system');
                    startPolling();
                    showNotification('Info', 'Using polling mode (30s updates)', 'info');
                } else {
                    showNotification('Success', 'Real-time updates enabled', 'success');
                }
            }, 2000);

            // Thunderbird-style Performance Monitoring
            function startPerformanceMonitoring() {
                // Monitor memory usage
                setInterval(() => {
                    if (performance.memory) {
                        const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
                        if (memoryUsage > 100) { // 100MB threshold
                            console.warn(`High memory usage: ${memoryUsage.toFixed(2)}MB`);
                            clearExpiredCache();
                        }
                    }
                }, 60 * 1000); // Every minute

                // Monitor cache efficiency
                setInterval(() => {
                    const cacheStats = {
                        content: emailCache.size,
                        accounts: 0
                    };
                    console.log('Simple cache stats:', cacheStats);
                }, 5 * 60 * 1000); // Every 5 minutes
            }

            // Start performance monitoring
            startPerformanceMonitoring();

            // Thunderbird-style periodic refresh (adaptive)
            setInterval(function() {
                if (currentAccount && currentCategory && isUserActive) {
                    console.log('Thunderbird-style adaptive refresh');
                    backgroundSyncEmails();
                }
            }, 300000); // 5 minutes
        });
    </script>

@endsection
