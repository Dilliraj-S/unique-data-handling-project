/**
 * General class for managing global utilities, addon initializations, and advanced Axios helper functions.
 * Provides utility functions (logging, toasts, cookies, etc.), addon setups (SlimScroll, etc.), and
 * enhanced Axios functionalities (progress tracking, polling, retries, cancellation).
 * Globally accessible via window.general.
 */
import $ from 'jquery';
import axios from 'axios';
import moment from 'moment';
import * as bootstrap from 'bootstrap';
import '@popperjs/core';
import select2 from 'select2';
import 'datatables.net';
import 'datatables.net-bs5';
import Tagify from '@yaireo/tagify';
import Sortable from 'sortablejs';
import Cleave from 'cleave.js';
import 'cleave.js/dist/addons/cleave-phone.in';
import Quill from 'quill';
import confetti from 'canvas-confetti';
import '../../libs/alerts/css-toast/css-toast.min.js';
import '../../libs/alerts/sweetalert2/sweetalert2.all.min.js';
import '../system/broadcast/mapping.js';
import Swal from 'sweetalert2';
import '../system/broadcast/import.js';

class General {
  constructor() {
    // Configuration properties
    this.developerMode = true; // Enables debug logging
    this.baseUrl = window.location.origin; // Base URL for API requests
    this.csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || ''; // CSRF token
    this.lastClickTime = 0; // Tracks last click time for rate limiting
    this.clickDelay = 3000; // Delay between clicks (ms)
    this.maxConcurrentRequests = 5; // Max concurrent Axios requests
    this.activeRequests = 0; // Current active requests
    this.requestQueue = []; // Queue for pending requests
    this.cancelTokens = new Map(); // Map of Axios cancel tokens
    this.toastCache = new Map(); // Cache to prevent duplicate toasts
    this.toastTimeout = 10000; // Toast cache duration (ms)
    this.requestTimeout = 60000; // Axios request timeout (ms)
    this.debounceDelay = 300; // Debounce delay for functions (ms)
    this.emptyValue = '-'; // Default value for empty inputs
    this.retryAttempts = 3; // Number of retry attempts for failed requests
    this.retryDelay = 1000; // Delay between retries (ms)
    this.pollingInterval = 5000; // Default polling interval (ms)
    this.cacheDurationMinutes = 5; // Cache duration for data
    // Attach dependencies to window for global access
    try {
      select2(window.jQuery);
      window.Quill = Quill;
      window.Cleave = Cleave;
      window.Tagify = Tagify;
      window.$ = window.jQuery = $;
      window.axios = axios;
      window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
      window.bootstrap = bootstrap;
      window.moment = moment;
    } catch (e) { }
    // Bind methods to ensure proper context
    this.bindMethods();
    // Initialize utilities and addons
    this.init();
  }
  /**
   * Binds all methods to ensure correct `this` context
   */
  bindMethods() {
    this.init = this.init.bind(this);
    this.initAddons = this.initAddons.bind(this);
    this.log = this.log.bind(this);
    this.error = this.error.bind(this);
    this.updateLiveClock = this.updateLiveClock.bind(this);
    this.manageCookie = this.manageCookie.bind(this);
    this.sanitizeInput = this.sanitizeInput.bind(this);
    this.isEmpty = this.isEmpty.bind(this);
    this.debounce = this.debounce.bind(this);
    this.canProceed = this.canProceed.bind(this);
    this.modifyToken = this.modifyToken.bind(this);
    this.requestAction = this.requestAction.bind(this);
    this.setupAxiosInterceptors = this.setupAxiosInterceptors.bind(this);
    this.processQueue = this.processQueue.bind(this);
    this.generateFormClass = this.generateFormClass.bind(this);
    this.detectUserInteraction = this.detectUserInteraction.bind(this);
    this.tooltip = this.tooltip.bind(this);
    this.popover = this.popover.bind(this);
    this.actions = this.actions.bind(this);
    this.configureToast = this.configureToast.bind(this);
    this.showToast = this.showToast.bind(this);
    this.getToastStyles = this.getToastStyles.bind(this);
    this.successToast = this.successToast.bind(this);
    this.errorToast = this.errorToast.bind(this);
    this.warningToast = this.warningToast.bind(this);
    this.axiosRequest = this.axiosRequest.bind(this);
    this.uploadFile = this.uploadFile.bind(this);
    this.downloadFile = this.downloadFile.bind(this);
    this.startPolling = this.startPolling.bind(this);
    this.stopPolling = this.stopPolling.bind(this);
  }
  /**
   * Initializes core utilities and addons
   */
  init() {
    try {
      // Dependency checks
      if (!window.axios) throw new Error('Axios is required but not loaded');
      if (!window.jQuery) throw new Error('jQuery is required but not loaded');
      if (!window.bootstrap) throw new Error('Bootstrap is required but not loaded');
      this.setupAxiosInterceptors();
      this.configureToast();
      this.updateLiveClock();
      this.detectUserInteraction();
      this.tooltip();
      this.popover();
      this.actions();
      this.initAddons();
    } catch (e) {
      this.log('General initialization error:', e);
    }
  }
  /**
   * Initializes addons: SlimScroll, Canvas Confetti, SweetAlert2
   */
  initAddons() {
    if (!window.jQuery) {
      this.error('jQuery is required but not loaded for addons');
      this.errorToast('Addon Error', 'jQuery is required for addons');
      return;
    }
    // Initialize Canvas Confetti
    try {
      if (!confetti) {
        this.error('Canvas Confetti is required but not loaded');
        this.errorToast('Addon Error', 'Canvas Confetti is required');
      } else {
        const confettiTriggers = document.querySelectorAll('[data-confetti]');
        if (confettiTriggers.length) {
          confettiTriggers.forEach((el) => {
            el.addEventListener('click', () => {
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
              });
            });
          });
        }
        $(document).on('submit', 'form[data-confetti-on-submit]', (e) => {
          e.preventDefault();
          const form = e.target;
          setTimeout(() => {
            confetti({
              particleCount: 150,
              spread: 90,
              origin: { y: 0.5 },
            });
            this.successToast('Form Submitted!', 'Confetti celebration!');
          }, 1000);
        });
      }
    } catch (e) {
      console.error('Error initializing Canvas Confetti:', e);
    }
    // Initialize SweetAlert2
    try {
      if (!Swal) {
        this.error('SweetAlert2 is required but not loaded');
        this.errorToast('Addon Error', 'SweetAlert2 is required');
      } else {
        window.Swal = Swal;
        const confirmButtons = document.querySelectorAll('[data-sweetalert-confirm]');
        if (confirmButtons.length) {
          confirmButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              const message = btn.getAttribute('data-sweetalert-confirm') || 'Are you sure?';
              Swal.fire({
                title: 'Confirm Action',
                text: message,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, proceed!',
                cancelButtonText: 'Cancel',
              }).then((result) => {
                if (result.isConfirmed) {
                  this.successToast('Confirmed!', 'Action confirmed');
                }
              });
            });
          });
        }
      }
    } catch (e) { }
  }
  /**
   * Logs messages to console when developerMode is enabled
   * @param {...any} args - Arguments to log
   */
  log(...args) {
    if (this.developerMode) console.log('[General Log]', ...args);
  }
  /**
   * Logs error messages to console when developerMode is enabled
   * @param {...any} args - Error arguments to log
   */
  error(...args) {
    if (this.developerMode) console.error('[General Error]', ...args);
  }
  /**
   * Updates all elements with class .live-time with current time
   */
  updateLiveClock() {
    try {
      const update = () => {
        const elements = document.querySelectorAll('.live-time');
        if (!elements.length) return;
        const now = new Date();
        const time = [
          now.getHours().toString().padStart(2, '0'),
          now.getMinutes().toString().padStart(2, '0'),
          now.getSeconds().toString().padStart(2, '0')
        ].join(':');
        elements.forEach(el => el.textContent = time);
      };
      update();
      setInterval(update, 1000);
    } catch (e) {
      this.error('Error updating live clock:', e);
    }
  }
  /**
   * Manages cookies (set, get, delete)
   * @param {Object} options - Cookie options {action, name, value, hours}
   * @returns {any|null} Cookie value or null
   */
  manageCookie({ action, name, value, hours }) {
    try {
      switch (action) {
        case 'set':
          const date = new Date(Date.now() + hours * 3600000);
          document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))};expires=${date.toUTCString()};path=/`;
          break;
        case 'get':
          const parts = `; ${document.cookie}`.split(`; ${name}=`);
          return parts.length === 2 ? JSON.parse(decodeURIComponent(parts.pop().split(';').shift())) : null;
        case 'delete':
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
          break;
        default:
          throw new Error(`Invalid cookie action: ${action}`);
      }
    } catch (e) {
      this.error('Cookie management error:', e);
      return null;
    }
  }
  /**
   * Sanitizes input to prevent XSS
   * @param {any} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  sanitizeInput(input) {
    try {
      const div = document.createElement('div');
      div.textContent = input ?? this.emptyValue;
      return div.innerHTML;
    } catch (e) {
      this.error('Input sanitization error:', e);
      return this.emptyValue;
    }
  }
  /**
   * Checks if a value is empty
   * @param {any} value - Value to check
   * @returns {boolean} True if empty
   */
  isEmpty(value) {
    try {
      return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    } catch (e) {
      this.error('Error checking empty value:', e);
      return true;
    }
  }
  /**
   * Debounces a function
   * @param {Function} func - Function to debounce
   * @param {number} delay - Debounce delay in ms
   * @returns {Function} Debounced function
   */
  debounce(func, delay = this.debounceDelay) {
    try {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
      };
    } catch (e) {
      this.error('Debounce function error:', e);
      return func;
    }
  }
  /**
   * Prevents rapid successive clicks
   * @returns {boolean} True if can proceed
   */
  canProceed() {
    try {
      const now = Date.now();
      if (now - this.lastClickTime < this.clickDelay) {
        this.warningToast('Slow Down', 'Please wait a few seconds before trying again', 2000);
        return false;
      }
      this.lastClickTime = now;
      return true;
    } catch (e) {
      this.error('Click rate limiting error:', e);
      return false;
    }
  }
  /**
   * Modifies a token by appending a string
   * @param {string} token - Original token
   * @param {string} string - String to append
   * @returns {string} Modified token
   */
  modifyToken(token, string) {
    try {
      let parts = token.split('_');
      while (parts.length < 5) parts.push('');
      parts[4] = parts[4] + string;
      return parts.join('_');
    } catch (e) {
      this.error('Token modification error:', e);
      return token;
    }
  }
  /**
   * Sends an action request to the server
   * @param {string} token - Action token
   * @param {Object} additionalData - Additional data to send
   * @returns {Promise} Axios response
   */
  async requestAction(token, additionalData = {}) {
    try {
      return await this.axiosRequest({
        method: 'post',
        url: `${this.baseUrl}/skeleton-action/${token}`,
        data: { skeleton_token: token, ...additionalData },
        headers: { 'X-CSRF-TOKEN': this.csrfToken },
        requestId: `action-${token}`
      });
    } catch (e) {
      this.error('Request action error:', e);
      throw e;
    }
  }
  /**
   * Sets up Axios interceptors for request queuing and cancellation
   */
  setupAxiosInterceptors() {
    try {
      if (!window.axios) {
        this.error('Axios not loaded');
        return;
      }
      axios.interceptors.request.use(
        (config) => {
          if (this.activeRequests >= this.maxConcurrentRequests) {
            return new Promise((resolve) => this.requestQueue.push({ config, resolve }));
          }
          this.activeRequests++;
          config.cancelToken = new axios.CancelToken((cancel) => this.cancelTokens.set(config.url, cancel));
          config.timeout = this.requestTimeout;
          return config;
        },
        (error) => Promise.reject(error)
      );
      axios.interceptors.response.use(
        (response) => {
          this.activeRequests--;
          this.cancelTokens.delete(response.config.url);
          this.processQueue();
          return response;
        },
        (error) => {
          this.activeRequests--;
          if (error.config) this.cancelTokens.delete(error.config.url);
          this.processQueue();
          return Promise.reject(error);
        }
      );
    } catch (e) {
      this.error('Error setting up Axios interceptors:', e);
    }
  }
  /**
   * Processes the request queue
   */
  processQueue() {
    try {
      if (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
        const { config, resolve } = this.requestQueue.shift();
        resolve(config);
      }
    } catch (e) {
      this.error('Error processing request queue:', e);
    }
  }
  /**
   * Generates a form class based on token or key
   * @param {string} tokenOrKey - Token or key
   * @returns {string} Form class
   */
  generateFormClass(tokenOrKey) {
    try {
      return tokenOrKey ? `skeleton-form-${tokenOrKey.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : 'default-form';
    } catch (e) {
      this.error('Error generating form class:', e);
      return 'default-form';
    }
  }
  /**
   * Detects user interaction and sets flag
   */
  detectUserInteraction() {
    try {
      const events = ['click', 'mousemove', 'keypress', 'touchstart'];
      const handler = () => {
        document.body.dataset.userInteracted = 'true';
        events.forEach((event) => document.removeEventListener(event, handler));
      };
      events.forEach((event) => document.addEventListener(event, handler, { once: true }));
    } catch (e) {
      this.error('Error detecting user interaction:', e);
    }
  }
  /**
   * Initializes tooltips
   */
  tooltip() {
    try {
      const elements = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      if (!elements.length) return;
      if (!bootstrap?.Tooltip) {
        this.error('Bootstrap Tooltip not available');
        return;
      }
      elements.forEach((element) => new bootstrap.Tooltip(element));
    } catch (e) {
      this.error('Error initializing tooltips:', e);
    }
  }
  /**
   * Initializes popovers
   */
  popover() {
    try {
      const elements = document.querySelectorAll('[data-bs-toggle="popover"]');
      if (!elements.length) return;
      if (!bootstrap?.Popover) {
        this.error('Bootstrap Popover not available');
        return;
      }
      elements.forEach((element) => new bootstrap.Popover(element));
    } catch (e) {
      this.error('Error initializing popovers:', e);
    }
  }
  /**
   * Handles action containers and tabs
   */
  actions() {
    try {
      const containers = document.querySelectorAll('.data-skl-action');
      containers.forEach(container => {
        const containerId = container.id;
        if (!containerId) return;
        const tabLinks = container.querySelectorAll('[data-skl-action]');
        tabLinks.forEach(link => {
          link.addEventListener('click', () => {
            const action = link.getAttribute('data-skl-action');
            const token = link.getAttribute('data-token');
            const targetSelector = link.getAttribute('data-target');
            const targetBtn = document.querySelector(targetSelector);
            const updateButton = () => {
              if (!targetBtn) return;
              const type = link.getAttribute('data-type');
              const text = link.getAttribute('data-text');
              const classListFromLink = link.getAttribute('data-class');
              targetBtn.setAttribute('data-type', type);
              targetBtn.setAttribute('data-token', token);
              targetBtn.setAttribute('data-class', token);
              targetBtn.textContent = text;
              if (classListFromLink) {
                const newClasses = classListFromLink.split(/\s+/).filter(Boolean);
                newClasses.forEach(cls => {
                  if (!targetBtn.classList.contains(cls)) {
                    targetBtn.classList.add(cls);
                  }
                  // Handle visibility class conflict
                  if (cls === 'd-none') {
                    targetBtn.classList.remove('d-block');
                  } else if (cls === 'd-block') {
                    targetBtn.classList.remove('d-none');
                  }
                });
              }
            };
            if (action === 'b' || action === 'br') updateButton();
            if (action === 'r' || action === 'br') {
              if (typeof window.reloadTable === 'function') {
                window.reloadTable(token);
              }
            }
            this.manageCookie({ action: 'set', name: containerId, value: link.id, hours: 1 });
          });
        });
        const savedTabId = this.manageCookie({ action: 'get', name: containerId });
        const savedTab = savedTabId ? document.getElementById(savedTabId) : null;
        const fallbackTab = container.querySelector('.nav-link');
        const tabToActivate = savedTab || fallbackTab;
        if (tabToActivate && bootstrap?.Tab) {
          const bsTab = new bootstrap.Tab(tabToActivate);
          bsTab.show();
          tabToActivate.click();
        }
      });
    } catch (e) {
      this.error('Error initializing actions:', e);
    }
  }
  /**
   * Configures toast notifications
   */
  configureToast() {
    try {
      if (typeof window.cssToast === 'undefined') {
        this.error('cssToast library not loaded. Ensure cssToast.min.js is included from skeleton/libs/toasts.');
        return;
      }
      window.cssToast.settings({
        position: 'bottomRight',
        timeout: false,
        close: true,
        pauseOnHover: true,
        transitionIn: 'fadeInUp',
        transitionOut: 'fadeOutDown',
        theme: 'light',
      });
    } catch (e) {
      this.error('Error configuring toasts:', e);
    }
  }
  /**
   * Shows a toast notification
   * @param {Object} options - Toast options {icon, title, message, duration}
   */
  showToast({ icon, title = '', message = '', duration = 5000 }) {
    try {
      const toastKey = `${icon}:${title}:${message}`;
      if (this.toastCache.has(toastKey)) {
        if (this.developerMode) {
          this.showToast({
            icon: 'dark',
            title: 'Developer Warning',
            message: `Duplicate toast suppressed: ${title} - ${message}`,
            duration: 5000
          });
        }
        return;
      }
      if (typeof window.cssToast === 'undefined') {
        return;
      }
      const options = {
        title,
        message,
        timeout: duration,
        theme: 'light',
        ...this.getToastStyles(icon),
      };
      window.cssToast.show(options);
      this.toastCache.set(toastKey, true);
      setTimeout(() => this.toastCache.delete(toastKey), this.toastTimeout);
    } catch (e) {
      this.error('Error showing toast:', e);
    }
  }
  /**
   * Gets toast styles based on icon type
   * @param {string} icon - Toast icon type
   * @returns {Object} Toast styles
   */
  getToastStyles(icon) {
    try {
      const styles = {
        success: { titleColor: '#ffffff', messageColor: '#ffffff', icon: 'fa fa-check-circle', backgroundColor: '#00ee36', iconColor: '#ffffff' },
        error: { titleColor: '#ffffff', messageColor: '#ffffff', icon: 'fa fa-times-circle', backgroundColor: '#ff0018', iconColor: '#ffffff' },
        warning: { icon: 'fa fa-exclamation-triangle', backgroundColor: '#ffd000', iconColor: '#212529' },
        info: { icon: 'fa fa-info-circle', backgroundColor: '#00d5ff', iconColor: '#ffffff' },
        question: { titleColor: '#ffffff', messageColor: '#ffffff', icon: 'fa fa-circle-question', backgroundColor: '#0087ff', iconColor: '#ffffff' },
        light: { icon: 'fa fa-message-lines', backgroundColor: '#dedede', iconColor: '#333333' },
        dark: { titleColor: '#ffffff', messageColor: '#ffffff', icon: 'fa fa-message-lines', backgroundColor: '#002343', iconColor: '#ffffff' },
        default: { icon: 'fa fa-bell', backgroundColor: '#6c757d', iconColor: '#ffffff' },
      };
      return styles[icon] || styles.default;
    } catch (e) {
      this.error('Error getting toast styles:', e);
      return styles.default;
    }
  }
  /**
   * Shows a success toast
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {number} duration - Toast duration
   */
  successToast(title, message, duration = 5000) {
    this.showToast({ icon: 'success', title, message, duration });
  }
  /**
   * Shows an error toast
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {number} duration - Toast duration
   */
  errorToast(title, message, duration = 5000) {
    this.showToast({ icon: 'error', title, message, duration });
  }
  /**
   * Shows a warning toast
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {number} duration - Toast duration
   */
  warningToast(title, message, duration = 5000) {
    this.showToast({ icon: 'warning', title, message, duration });
  }
  /**
   * Performs an Axios request with retries, progress tracking, and cancellation
   * @param {Object} config - Axios config {method, url, data, headers, requestId, onProgress, retry}
   * @returns {Promise} Axios response
   */
  async axiosRequest({
    method = 'get',
    url,
    data = {},
    headers = {},
    requestId = `req-${Date.now()}`,
    onProgress = null,
    retry = this.retryAttempts
  }) {
    try {
      const config = {
        method,
        url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
        data,
        headers: { 'X-CSRF-TOKEN': this.csrfToken, ...headers },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress({ requestId, type: 'upload', percent });
            this.log(`Upload progress for ${requestId}: ${percent}%`);
          }
        },
        onDownloadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress({ requestId, type: 'download', percent });
            this.log(`Download progress for ${requestId}: ${percent}%`);
          }
        }
      };
      let attempts = 0;
      while (attempts <= retry) {
        try {
          const response = await axios(config);
          return response;
        } catch (e) {
          attempts++;
          if (attempts > retry || axios.isCancel(e)) {
            throw e;
          }
          this.log(`Retrying ${method.toUpperCase()} request to ${url} (${attempts}/${retry})`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    } catch (e) {
      this.error('Axios request error:', e);
      throw e;
    }
  }
  /**
   * Uploads a file with progress tracking
   * @param {string} url - Upload endpoint
   * @param {File} file - File to upload
   * @param {Object} options - Options {requestId, onProgress, additionalData}
   * @returns {Promise} Axios response
   */
  async uploadFile({ url, file, requestId = `upload-${Date.now()}`, onProgress = null, additionalData = {} }) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(additionalData).forEach(([key, value]) => formData.append(key, value));
      return await this.axiosRequest({
        method: 'post',
        url,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
        requestId,
        onProgress
      });
    } catch (e) {
      this.error('File upload error:', e);
      throw e;
    }
  }
  /**
   * Downloads a file with progress tracking
   * @param {string} url - Download endpoint
   * @param {Object} options - Options {requestId, onProgress, fileName}
   * @returns {Promise} Blob response
   */
  async downloadFile({ url, requestId = `download-${Date.now()}`, onProgress = null, fileName = 'download' }) {
    try {
      const response = await this.axiosRequest({
        method: 'get',
        url,
        responseType: 'blob',
        requestId,
        onProgress
      });
      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(link.href);
      this.successToast('Download Complete', `File ${fileName} downloaded successfully`);
      return response;
    } catch (e) {
      this.error('Download error:', e);
      throw e;
    }
  }
  /**
   * Starts polling an endpoint for dynamic updates
   * @param {Object} options - Polling options {url, requestId, interval, onUpdate, maxAttempts}
   * @returns {string} Polling ID
   */
  startPolling({
    url,
    requestId = `poll-${Date.now()}`,
    interval = this.pollingInterval,
    onUpdate = () => { },
    maxAttempts = Infinity
  }) {
    try {
      let attempts = 0;
      const poll = async () => {
        try {
          if (attempts >= maxAttempts) {
            this.stopPolling(requestId);
            return;
          }
          const response = await this.axiosRequest({ method: 'get', url, requestId });
          onUpdate(response.data);
          attempts++;
          setTimeout(poll, interval);
        } catch (e) {
          this.error(`Polling error for ${requestId}:`, e);
          this.stopPolling(requestId);
          this.errorToast('Polling Failed', `Stopped polling ${url}: ${e.message}`);
        }
      };
      poll();
      this.cancelTokens.set(requestId, axios.CancelToken.source());
      return requestId;
    } catch (e) {
      this.error('Error starting polling:', e);
      return null;
    }
  }
  /**
   * Stops polling for a given request ID
   * @param {string} requestId - Polling request ID
   */
  stopPolling(requestId) {
    try {
      const source = this.cancelTokens.get(requestId);
      if (source) {
        source.cancel(`Polling stopped for ${requestId}`);
        this.cancelTokens.delete(requestId);
      }
    } catch (e) {
      this.error('Error stopping polling:', e);
    }
  }
}
// Instantiate General immediately with robust error handling
try {
  window.general = new General();
} catch (e) { }
export default General;