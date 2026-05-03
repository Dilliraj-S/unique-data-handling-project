/**
 * Skeleton class for managing application-specific functionality.
 * Relies on window.general for utility functions like logging, toasts, and Axios helpers.
 */
import 'daterangepicker';
import Sortable from 'sortablejs';
import {
    setupEventListeners,
    showPopup,
    savePopup,
    handlePopupSuccess,
    handleSaveSuccess,
    makeDraggable,
    makeResizableModal,
    makeResizableOffcanvas,
    setupFullscreenToggle,
    setupDownloadShareButtons,
    setupFormCookieStorage,
    setupReloadButton
} from './popup.js';
import { select } from './select.js';
import { editor } from './editor.js';
import { pills } from './pills.js';
import { template } from './template.js'; // Added template import
import { formBuilder } from './form-builder.js';
import { generateDataTableLoading, initializeDataTable, reloadTable } from './table.js';
import { generateCardLoading, initializeCardSet, reloadCardSet } from './card.js';
import { validateForm, unique } from './validation.js';
import { stepper, repeater, imagePreview } from './stepper.js';
import { Geofence } from './geofence.js';
import { permissions } from './permissions.js';
import { datePicker } from './date.js';

class Skeleton {
    constructor() {
        // Configuration properties
        this.changedFields = new Set(); // Tracks changed form fields
        this.dataTableMap = new Map(); // Stores DataTable instances
        this.cardSetMap = new Map(); // Stores card set instances
        this.maxRetries = 2; // Max retries for failed requests
        this.retryDelay = 1000; // Delay between retries (ms)
        this.popoverDelay = 2000; // Popover display delay in ms

        // Bind methods to ensure proper context
        this.setupEventListeners = setupEventListeners.bind(this);
        this.showPopup = showPopup.bind(this);
        this.savePopup = savePopup.bind(this);
        this.handlePopupSuccess = handlePopupSuccess.bind(this);
        this.handleSaveSuccess = handleSaveSuccess.bind(this);
        this.makeDraggable = makeDraggable.bind(this);
        this.makeResizableModal = makeResizableModal.bind(this);
        this.makeResizableOffcanvas = makeResizableOffcanvas.bind(this);
        this.setupFullscreenToggle = setupFullscreenToggle.bind(this);
        this.setupDownloadShareButtons = setupDownloadShareButtons.bind(this);
        this.setupFormCookieStorage = setupFormCookieStorage.bind(this);
        this.setupReloadButton = setupReloadButton.bind(this);
        this.select = select.bind(this);
        this.editor = editor.bind(this);
        this.pills = pills.bind(this);
        this.formBuilder = formBuilder.bind(this); // Added template binding
        this.template = template.bind(this); // Added template binding
        this.geofence = Geofence.bind(this);
        this.generateDataTableLoading = generateDataTableLoading.bind(this);
        this.initializeDataTable = initializeDataTable.bind(this);
        this.reloadTable = reloadTable.bind(this);
        this.generateCardLoading = generateCardLoading.bind(this);
        this.initializeCardSet = initializeCardSet.bind(this);
        this.reloadCardSet = reloadCardSet.bind(this);
        this.validateForm = validateForm.bind(this);
        this.datePicker = datePicker.bind(this);
        this.unique = unique.bind(this);
        this.permissions = permissions.bind(this);
        this.stepper = stepper.bind(this);
        this.repeater = repeater.bind(this);
        this.imagePreview = imagePreview.bind(this);
    }

    /**
     * Initializes application-specific components
     */
    async init() {
        try {
            // Dependency checks
            if (!window.axios) throw new Error('Axios is required but not loaded');
            if (!window.jQuery) throw new Error('jQuery is required but not loaded');
            if (!jQuery.fn.DataTable) throw new Error('DataTables is required but not loaded');
            if (!window.Tagify) throw new Error('Tagify is required but not loaded');
            if (!window.bootstrap) throw new Error('Bootstrap is required but not loaded');
            if (!window.Quill) throw new Error('Quill is required but not loaded');
            if (!window.Cleave) throw new Error('Cleave.js is required but not loaded');
            if (!window.general) throw new Error('General class is required but not loaded');
            if (!Sortable) throw new Error('Sortable.js is required but not loaded');
            // if (!window.grapesjs) throw new Error('GrapesJS is required but not loaded');

            // Initialize components
            await Promise.all([
                this.setupEventListeners(),
                this.pills(),
                this.select(),
                this.initializeDataTable(),
                this.initializeCardSet(),
                this.stepper(),
                this.repeater(),
                this.imagePreview(),
                this.unique(),
                window.general.initAddons()
            ]);
            window.general.log('Skeleton initialized successfully');
        } catch (e) {
            (window.general?.error || console.error)('Skeleton initialization error:', e);
        }
    }

    /**
     * Reloads the Skeleton application
     */
    async reloadSkeleton() {
        const btn = document.querySelector('.reload-skeleton');
        const icon = btn?.querySelector('i');
        if (!btn || !icon) {
            window.general?.error('Reload button or icon not found');
            return;
        }
        try {
            icon.classList.add('ti-reload', 'fa-spin');
            btn.disabled = true;
            const response = await window.general.axiosRequest({
                method: 'get',
                url: '/reload-skeleton'
            });
            const { data } = response;
            window.general.showToast({
                icon: data?.status ? 'success' : 'error',
                title: data?.title || (data?.status ? 'Success' : 'Error'),
                message: data?.message || 'Reload response incomplete.',
                duration: 5000
            });
            if (data?.status) {
                setTimeout(() => {
                    location.reload();
                }, 1000);
            }
        } catch (error) {
            const errorMessage = error?.response?.data?.message || 'An unexpected error occurred during reload.';
            const errorTitle = error?.response?.data?.title || 'Reload Failed';
            window.general.showToast({
                icon: 'error',
                title: errorTitle,
                message: errorMessage,
                duration: 5000
            });
            window.general?.error?.('Reload failed:', error);
        } finally {
            icon.classList.remove('fa-spin');
            btn.disabled = false;
        }
    }

    /**
     * Reloads a specific card set by token
     * @param {string} token - The unique token for the card set
     */
    async reloadCardSet(token) {
        if (!token) {
            window.general?.errorToast?.('No token provided for card reload');
            window.general?.log?.('No token provided for card reload', { token });
            return;
        }
        try {
            const escapedToken = $.escapeSelector(token);
            const $element = jQuery(`.skeleton-card-container-${escapedToken}`);
            if (!$element.length) {
                window.general?.errorToast?.('Card container not found for the provided token');
                window.general?.log?.('Card container not found', { token });
                return;
            }
            const btn = $element.find('.skl-filter-btn.btn-outline-secondary[title="Refresh Cards"]')[0];
            const icon = btn?.querySelector('i');
            if (!btn || !icon) {
                window.general?.errorToast?.('Refresh button or icon not found');
                window.general?.log?.('Refresh button or icon not found', { token });
                return;
            }
            icon.classList.add('fa-spin');
            btn.disabled = true;
            await this.reloadCardSet(token);
            window.general.showToast({
                icon: 'success',
                title: 'Success',
                message: 'Card set reloaded successfully.',
                duration: 3000
            });
            window.general?.log?.('Card set reloaded successfully', { token });
        } catch (error) {
            window.general?.errorToast?.('Failed to reload card set');
            window.general?.log?.('Card set reload failed', { token, error: error.message });
        } finally {
            const escapedToken = $.escapeSelector(token);
            const btn = jQuery(`.skeleton-card-container-${escapedToken} .skl-filter-btn.btn-outline-secondary[title="Refresh Cards"]`)[0];
            const icon = btn?.querySelector('i');
            if (icon) icon.classList.remove('fa-spin');
            if (btn) btn.disabled = false;
        }
    }
}

// Instantiate Skeleton on DOM load with fallback
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (!window.general) {
            console.error('General class not loaded, cannot initialize Skeleton');
            return;
        }
        window.skeleton = new Skeleton();
        window.skeleton.init();
    } catch (e) {
        (window.general?.error || console.error)('Failed to initialize Skeleton:', e);
    }
});

// Event listeners for reload actions
document.addEventListener('click', (e) => {
    if (e.target.closest('.reload-skeleton')) {
        e.preventDefault();
        window.skeleton.reloadSkeleton();
    }
    if (e.target.closest('.reload-card')) {
        e.preventDefault();
        const token = e.target.closest('.reload-card').dataset.cardToken;
        if (token) {
            window.skeleton.reloadCardSet(token);
        } else {
            window.general?.errorToast?.('No card token provided for reload');
            window.general?.log?.('No card token provided for reload');
        }
    }
});

export default Skeleton;