/**
 * Validates a form based on data-validate attributes and required fields.
 * Supports predefined and dynamic validation rules, real-time input cleaning, and error tooltips.
 * Uses window.general for logging, toasts, and server requests without external libraries.
 *
 * @requires window.general
 * @requires jQuery
 * @requires bootstrap
 * @param {Object} options - Validation options.
 * @param {boolean} [options.isSubmit=false] - Whether the validation is triggered by form submission.
 * @returns {boolean} - True if the form is valid, false otherwise.
 */
export function validateForm({ isSubmit = false } = {}) {
  // Validate form availability
  const form = this.currentForm;
  if (!form) {
    window.general.error('No form found for validation');
    window.general.showToast({
      icon: 'error',
      title: 'Validation Error',
      message: 'No form selected',
      duration: 5000
    });
    return false;
  }

  // Validate jQuery dependency
  if (!window.jQuery) {
    window.general.error('jQuery is required but not loaded');
    window.general.showToast({
      icon: 'error',
      title: 'Validation Error',
      message: 'jQuery is required',
      duration: 5000
    });
    return false;
  }

  const $ = window.jQuery;

  // Predefined validation rules
  const validationRules = [
    { key: 'username', regex: /^(?=.*[A-Z])(?=.*[\s\W]).{1,15}$/, error: 'Username must be up to 15 characters, include at least one uppercase letter, and one symbol or space', allowedChars: /[A-Za-z0-9!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~\s]/ },
    { key: 'email', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, error: 'Must be a valid email (e.g., user@domain.com)', allowedChars: /[A-Za-z0-9@._-]/ },
    { key: 'creditcard', regex: /^\d{16}$/, error: 'Must be a 16-digit credit card number', cleave: { creditCard: true, delimiter: ' ', blocks: [4, 4, 4, 4] }, allowedChars: /\d/ },
    { key: 'viewbox', regex: /^\d{1,3}(\s\d{1,3})*$/, error: 'Must be numbers with spaces (e.g., 123 456)', cleave: { numericOnly: true, delimiter: ' ', blocks: [3, 3, 3] }, allowedChars: /[\d\s]/ },
    { key: 'zip', regex: /^\d{5}(-\d{4})?$/, error: 'Must be 5 or 9 digits (e.g., 12345 or 12345-6789)', cleave: { blocks: [5, 4], delimiter: '-' }, allowedChars: /[\d-]/ },
    { key: 'date', regex: /^\d{2}\d{2}\d{4}$/, error: 'Must be in MMDDYYYY format', cleave: { date: true, datePattern: ['m', 'd', 'Y'] }, allowedChars: /\d/ },
    { key: 'time', regex: /^\d{2}\d{2}$/, error: 'Must be in HHMM format (24-hour)', cleave: { time: true, timePattern: ['h', 'm'] }, allowedChars: /\d/ },
    { key: 'work-time', regex: /^\d{2}\d{2}$/, error: 'Must be in HHMM format (24-hour)', cleave: { time: true, timePattern: ['h', 'm'], delimiter: ':' }, allowedChars: /[\d:]/ },
    { key: 'currency', regex: /^\d+$/, error: 'Must be a numeric value', cleave: { numeral: true, numeralThousandsGroupStyle: 'thousand' }, allowedChars: /\d/ },
    { key: 'ip', regex: /^\d{1,3}(\.\d{1,3}){3}$/, error: 'Must be a valid IP (e.g., 192.168.1.1)', cleave: { delimiter: '.', blocks: [3, 3, 3, 3], numericOnly: true }, allowedChars: /[\d.]/, extraValidation: (value) => value.split('.').every(n => n <= 255) },
    { key: 'port', regex: /^\d{1,5}$/, error: 'Must be a number between 1 and 65535', allowedChars: /\d/, extraValidation: (value) => value <= 65535 },
    { key: 'pincode', regex: /^\d{6}$/, error: 'Must be a 6-digit PIN code', allowedChars: /\d/ },
    { key: 'indian-phone', regex: /^\d{10}$/, error: 'Must be a 10-digit phone number', cleave: { phone: true, phoneRegionCode: 'IN' }, allowedChars: /\d/ },
    { key: 'ssn', regex: /^\d{9}$/, error: 'Must be a 9-digit SSN', allowedChars: /\d/ },
    { key: 'percentage', regex: /^\d+(\.\d+)?$/, error: 'Must be a numeric percentage (e.g., 75.5)', cleave: { numeral: true, numeralDecimalScale: 2 }, allowedChars: /[\d.]/ },
    { key: 'employee-id', regex: /^[A-Z]{2}\d{4}$/, error: 'Must be 2 letters followed by 4 digits (e.g., AB1234)', allowedChars: /[A-Z\d]/ },
    { key: 'payroll-code', regex: /^\d{6}$/, error: 'Must be a 6-digit payroll code', allowedChars: /\d/ },
    { key: 'tax-id', regex: /^\d{9}$/, error: 'Must be a 9-digit tax ID', allowedChars: /\d/ },
    { key: 'hours-worked', regex: /^\d+(\.\d+)?$/, error: 'Must be a number (e.g., 40 or 40.5)', cleave: { numeral: true, numeralDecimalScale: 1 }, allowedChars: /[\d.]/ },
    { key: 'salary', regex: /^\d+(\.\d+)?$/, error: 'Must be a numeric salary amount', cleave: { numeral: true, numeralDecimalScale: 2 }, allowedChars: /[\d.]/ },
    { key: 'leave-days', regex: /^\d+(\.\d+)?$/, error: 'Must be a number (e.g., 5 or 5.5)', cleave: { numeral: true, numeralDecimalScale: 1 }, allowedChars: /[\d.]/ },
    { key: 'overtime', regex: /^\d{2}\d{2}$/, error: 'Must be in HHMM format (e.g., 0230)', cleave: { time: true, timePattern: ['h', 'm'], delimiter: ':' }, allowedChars: /[\d:]/ },
    { key: 'department-code', regex: /^[A-Z]{3}$/, error: 'Must be 3 uppercase letters (e.g., HRD)', allowedChars: /[A-Z]/ },
    { key: 'aadhaar', regex: /^\d{12}$/, error: 'Must be a 12-digit Aadhaar number', allowedChars: /\d/ },
    { key: 'pan', regex: /^[A-Z]{5}\d{4}[A-Z]$/, error: 'Must be 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)', allowedChars: /[A-Z\d]/ },
    { key: 'biometric-id', regex: /^\d{8}$/, error: 'Must be an 8-digit biometric ID', allowedChars: /\d/ },
    { key: 'crm-ticket', regex: /^[A-Z]{3}\d{5}$/, error: 'Must be 3 letters followed by 5 digits (e.g., CRM12345)', allowedChars: /[A-Z\d]/ },
    { key: 'gstin', regex: /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/, error: 'Must be a valid 15-character GSTIN (e.g., 22ABCDE1234F1Z5)', allowedChars: /[A-Z\d]/ },
    { key: 'text-50', regex: /^[A-Za-z\s]{3,50}$/, error: 'Must be 3-50 letters and spaces only', allowedChars: /[A-Za-z\s]/ },
    { key: 'text-100', regex: /^[A-Za-z\s]{3,100}$/, error: 'Must be 3-100 letters and spaces only', allowedChars: /[A-Za-z\s]/ },
    { key: 'text-150', regex: /^[A-Za-z\s]{3,150}$/, error: 'Must be 3-150 letters and spaces only', allowedChars: /[A-Za-z\s]/ },
    { key: 'text-200', regex: /^[A-Za-z\s]{3,200}$/, error: 'Must be 3-200 letters and spaces only', allowedChars: /[A-Za-z\s]/ },
    { key: 'module', regex: /^[A-Za-z\s]{3,80}$/, error: 'Must be 3-50 letters and spaces only', allowedChars: /[A-Za-z\s]/ },
    { key: 'key', regex: /^[a-z_.\s]{3,100}$/, error: 'Must be 3-100 lowercase letters and underscore only', allowedChars: /[a-z_.\s]/ },
    { key: 'type', regex: /^[a-z-\s]{3,100}$/, error: 'Must be 3-100 lowercase letters and hyphen only', allowedChars: /[a-z-\s]/ },
    { key: 'name', regex: /^[A-Za-z\s]{3,50}$/, error: 'Must be 3-50 letters and spaces only', allowedChars: /[A-Za-z\s]/ },
    { key: 'password', regex: /.{6,}/, error: 'Must be at least 6 characters', allowedChars: /./ },
    { key: 'pswd-mix', regex: /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/, error: 'Must be 6+ chars with uppercase, number, and special char', allowedChars: /[A-Za-z\d!@#$%^&*]/ },
    { key: 'landmark', regex: /^[A-Za-z0-9\s,-]{3,50}$/, error: 'Must be 3-50 letters, numbers, spaces, commas, or hyphens', allowedChars: /[A-Za-z0-9\s,-]/ },
    { key: 'street', regex: /^[A-Za-z0-9\s,-]{3,100}$/, error: 'Must be 3-100 letters, numbers, spaces, commas, or hyphens', allowedChars: /[A-Za-z0-9\s,-]/ },
    { key: 'address', regex: /^[A-Za-z0-9\s,.-]{5,200}$/, error: 'Must be 5-200 letters, numbers, spaces, commas, dots, or hyphens', allowedChars: /[A-Za-z0-9\s,.-]/ },
    { key: 'city', regex: /^[A-Za-z\s]{3,50}$/, error: 'Must be 3-50 letters and spaces only', allowedChars: /[A-Za-z\s]/ },
    { key: 'state', regex: /^[A-Za-z\s]{2,50}$/, error: 'Must be 2-50 letters and spaces only', allowedChars: /[A-Za-z\s]/ },
    { key: 'country', regex: /^[A-Za-z\s]{2,50}$/, error: 'Must be 2-50 letters and spaces only', allowedChars: /[A-Za-z\s]/ },
    { key: 'company-name', regex: /^[A-Za-z0-9\s&.,-]{3,100}$/, error: 'Must be 3-100 letters, numbers, spaces, &, ., or -', allowedChars: /[A-Za-z0-9\s&.,-]/ },
    { key: 'job-title', regex: /^[A-Za-z\s-]{3,50}$/, error: 'Must be 3-50 letters, spaces, or hyphens', allowedChars: /[A-Za-z\s-]/ },
    { key: 'designation', regex: /^[A-Za-z\s-]{3,50}$/, error: 'Must be 3-50 letters, spaces, or hyphens', allowedChars: /[A-Za-z\s-]/ },
    { key: 'shift-code', regex: /^[A-Z]{2}\d{2}$/, error: 'Must be 2 letters followed by 2 digits (e.g., SH01)', allowedChars: /[A-Z\d]/ },
    { key: 'attendance-id', regex: /^\d{10}$/, error: 'Must be a 10-digit attendance ID', allowedChars: /\d/ },
    { key: 'leave-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., LEV123456)', allowedChars: /[A-Z\d]/ },
    { key: 'project-code', regex: /^[A-Z]{3}\d{4}$/, error: 'Must be 3 letters followed by 4 digits (e.g., PRJ1234)', allowedChars: /[A-Z\d]/ },
    { key: 'task-id', regex: /^[A-Z]{2}\d{5}$/, error: 'Must be 2 letters followed by 5 digits (e.g., TS12345)', allowedChars: /[A-Z\d]/ },
    { key: 'invoice-number', regex: /^[A-Z]{3}-\d{6}$/, error: 'Must be 3 letters, hyphen, 6 digits (e.g., INV-123456)', allowedChars: /[A-Z\d-]/ },
    { key: 'po-number', regex: /^[A-Z]{2}-\d{8}$/, error: 'Must be 2 letters, hyphen, 8 digits (e.g., PO-12345678)', allowedChars: /[A-Z\d-]/ },
    { key: 'bank-account', regex: /^\d{9,18}$/, error: 'Must be 9-18 digits', allowedChars: /\d/ },
    { key: 'ifsc', regex: /^[A-Z]{4}0[A-Z0-9]{6}$/, error: 'Must be 4 letters, 0, 6 alphanumeric (e.g., SBIN0001234)', allowedChars: /[A-Z0-9]/ },
    { key: 'micr', regex: /^\d{9}$/, error: 'Must be a 9-digit MICR code', allowedChars: /\d/ },
    { key: 'uan', regex: /^\d{12}$/, error: 'Must be a 12-digit UAN', allowedChars: /\d/ },
    { key: 'epf', regex: /^[A-Z]{5}\d{7}$/, error: 'Must be 5 letters followed by 7 digits (e.g., ABCDE1234567)', allowedChars: /[A-Z\d]/ },
    { key: 'esi', regex: /^\d{10}$/, error: 'Must be a 10-digit ESI number', allowedChars: /\d/ },
    { key: 'vehicle-number', regex: /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/, error: 'Must be 2 letters, 2 digits, 1-2 letters, 4 digits (e.g., MH12AB1234)', allowedChars: /[A-Z\d]/ },
    { key: 'license-number', regex: /^[A-Z]{2}-\d{13}$/, error: 'Must be 2 letters, hyphen, 13 digits (e.g., DL-1234567890123)', allowedChars: /[A-Z\d-]/ },
    { key: 'passport', regex: /^[A-Z]{1}\d{7}$/, error: 'Must be 1 letter followed by 7 digits (e.g., A1234567)', allowedChars: /[A-Z\d]/ },
    { key: 'voter-id', regex: /^[A-Z]{3}\d{7}$/, error: 'Must be 3 letters followed by 7 digits (e.g., ABC1234567)', allowedChars: /[A-Z\d]/ },
    { key: 'ration-card', regex: /^[A-Z]{2}\d{10}$/, error: 'Must be 2 letters followed by 10 digits (e.g., AB1234567890)', allowedChars: /[A-Z\d]/ },
    { key: 'blood-group', regex: /^(A|B|AB|O)[+-]$/, error: 'Must be A, B, AB, or O with + or - (e.g., A+)', allowedChars: /[A-Z+-]/ },
    { key: 'emergency-contact', regex: /^\d{10}$/, error: 'Must be a 10-digit phone number', cleave: { phone: true, phoneRegionCode: 'IN' }, allowedChars: /\d/ },
    { key: 'qualification', regex: /^[A-Za-z\s.-]{3,50}$/, error: 'Must be 3-50 letters, spaces, dots, or hyphens', allowedChars: /[A-Za-z\s.-]/ },
    { key: 'experience', regex: /^\d{1,2}(\.\d{1})?$/, error: 'Must be 1-2 digits, optional .1 decimal (e.g., 5 or 5.5)', cleave: { numeral: true, numeralDecimalScale: 1 }, allowedChars: /[\d.]/ },
    { key: 'salary-account', regex: /^\d{9,18}$/, error: 'Must be 9-18 digits', allowedChars: /\d/ },
    { key: 'branch-code', regex: /^[A-Z]{3}\d{3}$/, error: 'Must be 3 letters followed by 3 digits (e.g., BOM123)', allowedChars: /[A-Z\d]/ },
    { key: 'client-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., CLI123456)', allowedChars: /[A-Z\d]/ },
    { key: 'vendor-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., VEN123456)', allowedChars: /[A-Z\d]/ },
    { key: 'contract-id', regex: /^[A-Z]{3}-\d{6}$/, error: 'Must be 3 letters, hyphen, 6 digits (e.g., CON-123456)', allowedChars: /[A-Z\d-]/ },
    { key: 'ticket-number', regex: /^[A-Z]{3}-\d{7}$/, error: 'Must be 3 letters, hyphen, 7 digits (e.g., TIC-1234567)', allowedChars: /[A-Z\d-]/ },
    { key: 'device-id', regex: /^[A-Z0-9]{8,12}$/, error: 'Must be 8-12 alphanumeric characters', allowedChars: /[A-Z0-9]/ },
    { key: 'fingerprint-id', regex: /^\d{10}$/, error: 'Must be a 10-digit fingerprint ID', allowedChars: /\d/ },
    { key: 'rfid', regex: /^[A-Z0-9]{10}$/, error: 'Must be a 10-character alphanumeric RFID', allowedChars: /[A-Z0-9]/ },
    { key: 'imei', regex: /^\d{15}$/, error: 'Must be a 15-digit IMEI', allowedChars: /\d/ },
    { key: 'mac-address', regex: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, error: 'Must be 6 pairs of hex digits with : or - (e.g., 00:1A:2B:3C:4D:5E)', cleave: { delimiter: ':', blocks: [2, 2, 2, 2, 2, 2], uppercase: true }, allowedChars: /[0-9A-Fa-f:-]/ },
    { key: 'serial-number', regex: /^[A-Z0-9]{6,20}$/, error: 'Must be 6-20 alphanumeric characters', allowedChars: /[A-Z0-9]/ },
    { key: 'asset-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., AST123456)', allowedChars: /[A-Z\d]/ },
    { key: 'inventory-code', regex: /^[A-Z]{2}\d{8}$/, error: 'Must be 2 letters followed by 8 digits (e.g., IN12345678)', allowedChars: /[A-Z\d]/ },
    { key: 'training-id', regex: /^[A-Z]{3}\d{5}$/, error: 'Must be 3 letters followed by 5 digits (e.g., TRN12345)', allowedChars: /[A-Z\d]/ },
    { key: 'certification-id', regex: /^[A-Z]{3}-\d{6}$/, error: 'Must be 3 letters, hyphen, 6 digits (e.g., CER-123456)', allowedChars: /[A-Z\d-]/ },
    { key: 'insurance-policy', regex: /^[A-Z]{2}\d{10}$/, error: 'Must be 2 letters followed by 10 digits (e.g., IN1234567890)', allowedChars: /[A-Z\d]/ },
    { key: 'health-plan', regex: /^[A-Z]{3}\d{7}$/, error: 'Must be 3 letters followed by 7 digits (e.g., HEA1234567)', allowedChars: /[A-Z\d]/ },
    { key: 'grievance-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., GRV123456)', allowedChars: /[A-Z\d]/ },
    { key: 'survey-id', regex: /^[A-Z]{3}\d{5}$/, error: 'Must be 3 letters followed by 5 digits (e.g., SUR12345)', allowedChars: /[A-Z\d]/ },
    { key: 'feedback-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., FDB123456)', allowedChars: /[A-Z\d]/ },
    { key: 'incident-id', regex: /^[A-Z]{3}-\d{6}$/, error: 'Must be 3 letters, hyphen, 6 digits (e.g., INC-123456)', allowedChars: /[A-Z\d-]/ },
    { key: 'audit-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., AUD123456)', allowedChars: /[A-Z\d]/ },
    { key: 'compliance-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., COM123456)', allowedChars: /[A-Z\d]/ },
    { key: 'kyc-id', regex: /^[A-Z]{3}\d{8}$/, error: 'Must be 3 letters followed by 8 digits (e.g., KYC12345678)', allowedChars: /[A-Z\d]/ },
    { key: 'tin', regex: /^\d{9}$/, error: 'Must be a 9-digit TIN', allowedChars: /\d/ },
    { key: 'cin', regex: /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/, error: 'Must be a valid 21-character CIN (e.g., L12345MH2000PLC123456)', allowedChars: /[A-Z0-9]/ },
    { key: 'din', regex: /^\d{8}$/, error: 'Must be an 8-digit DIN', allowedChars: /\d/ },
    { key: 'tan', regex: /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/, error: 'Must be 4 letters, 5 digits, 1 letter (e.g., ABCD12345E)', allowedChars: /[A-Z0-9]/ },
    { key: 'pf-account', regex: /^[A-Z]{5}\d{17}$/, error: 'Must be 5 letters followed by 17 digits (e.g., ABCDE12345678901234)', allowedChars: /[A-Z\d]/ },
    { key: 'esic', regex: /^\d{17}$/, error: 'Must be a 17-digit ESIC number', allowedChars: /\d/ },
    { key: 'shift-time', regex: /^\d{2}\d{2}$/, error: 'Must be in HHMM format (e.g., 0900)', cleave: { time: true, timePattern: ['h', 'm'], delimiter: ':' }, allowedChars: /[\d:]/ },
    { key: 'work-order', regex: /^[A-Z]{3}-\d{7}$/, error: 'Must be 3 letters, hyphen, 7 digits (e.g., WOR-1234567)', allowedChars: /[A-Z\d-]/ },
    { key: 'requisition-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., REQ123456)', allowedChars: /[A-Z\d]/ },
    { key: 'expense-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., EXP123456)', allowedChars: /[A-Z\d]/ },
    { key: 'travel-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., TRV123456)', allowedChars: /[A-Z\d]/ },
    { key: 'reimbursement-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., REM123456)', allowedChars: /[A-Z\d]/ },
    { key: 'bonus-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., BON123456)', allowedChars: /[A-Z\d]/ },
    { key: 'appraisal-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., APR123456)', allowedChars: /[A-Z\d]/ },
    { key: 'promotion-id', regex: /^[A-Z]{3}\d{6}$/, error: 'Must be 3 letters followed by 6 digits (e.g., PRO123456)', allowedChars: /[A-Z\d]/ },
    { key: 'permission', regex: /^(create|view|edit|delete|import|export):[A-Za-z]+(?:::[A-Za-z\s]+)*$/, error: 'Must be in the format: action:Module, action:Module::Section, or action:Module::Section::Item', allowedChars: /[A-Za-z:\s]/ },
  ];

  /**
   * Validates an input value against its format.
   * @param {string} format - The validation format (e.g., 'travel-id').
   * @param {string} value - The input value to validate.
   * @param {HTMLInputElement|HTMLSelectElement} input - The input element.
   * @returns {boolean} - True if valid, false otherwise.
   */
  const validateInputFormat = (format, value, input) => {
    // Check for dynamic regex and message
    const dynamicRegex = input.dataset.validateReg;
    if (dynamicRegex) {
      try {
        const regex = new RegExp(dynamicRegex);
        return regex.test(value);
      } catch (e) {
        window.general.error('Invalid dynamic regex', { regex: dynamicRegex, error: e.message });
        return !input.required;
      }
    }

    // Fallback to predefined rules
    const rule = validationRules.find(r => r.key === format);
    if (!rule) return !input.required;
    if (!value) return !input.required;
    let isValid = rule.regex.test(value);
    if (rule.extraValidation) {
      isValid = isValid && rule.extraValidation(value);
    }
    return isValid;
  };

  /**
   * Validates an input and updates its UI state.
   * @param {HTMLInputElement|HTMLSelectElement} input - The input element.
   * @param {string} value - The input value to validate.
   * @returns {boolean} - True if valid, false otherwise.
   */
  const validateAndUpdate = (input, value) => {
    const format = input.dataset.validate?.toLowerCase();
    const isValid = validateInputFormat(format, value, input);
    const parent = input.parentElement;
    const errorClass = parent.classList.contains('float-input-control')
      ? 'skl-error-float-input'
      : 'skl-error-normal-input';

    // Remove existing error icon
    const errorIcon = parent.querySelector('.skl-error-icon');
    if (errorIcon) {
      bootstrap.Tooltip.getInstance(errorIcon)?.dispose();
      errorIcon.remove();
    }

    // Update validity classes
    input.classList.remove('is-invalid', 'is-valid');
    input.classList.add(isValid ? 'is-valid' : 'is-invalid');

    // Add error icon if invalid
    if (!isValid) {
      const dynamicMsg = input.dataset.validateMsg;
      const rule = validationRules.find(r => r.key === format);
      const errorIcon = document.createElement('span');
      errorIcon.className = `skl-error-icon ${errorClass}`;
      errorIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
      errorIcon.setAttribute('data-bs-toggle', 'tooltip');
      errorIcon.setAttribute('data-bs-placement', 'top');
      errorIcon.setAttribute('data-bs-title', dynamicMsg || rule?.error || 'Invalid format');
      parent.style.position = 'relative';
      parent.appendChild(errorIcon);
      new bootstrap.Tooltip(errorIcon);
    }

    return isValid;
  };

  /**
   * Initializes validation for all inputs in the form.
   * @param {HTMLFormElement} form - The form element to validate.
   */
  const initializeFormValidation = form => {
    const inputs = form.querySelectorAll('input[data-validate], select[data-validate]');
    inputs.forEach(input => {
      if (input.dataset.validationInitialized) return;

      const format = input.dataset.validate?.toLowerCase();
      const dynamicRegex = input.dataset.validateReg;
      const rule = dynamicRegex
        ? { allowedChars: new RegExp(dynamicRegex) }
        : validationRules.find(r => r.key === format);
      if (!rule && !dynamicRegex) {
        window.general.log('No validation rule found', { input: input.id || input.name });
        return;
      }

      // Initialize Cleave.js if applicable
      let cleaveInstance = null;
      if (rule?.cleave) {
        try {
          cleaveInstance = new Cleave(input, {
            ...rule.cleave,
            onValueChanged: e => validateAndUpdate(input, e.target.rawValue || e.target.value)
          });
          input.cleaveInstance = cleaveInstance;
          window.general.log('Cleave initialized', { format, input: input.id || input.name });
        } catch (e) {
          window.general.error('Error initializing Cleave', { format, error: e.message });
        }
      }

      // Clean invalid characters
      const cleanInput = () => {
        let value = input.value;
        if (rule?.allowedChars) {
          const allowed = new RegExp(`[^${rule.allowedChars.source}]`, 'g');
          value = value.replace(allowed, '');
          if (value !== input.value) {
            input.value = value;
            if (cleaveInstance) cleaveInstance.setRawValue(value);
          }
        }
        validateAndUpdate(input, value);
      };

      // Event listeners for real-time validation
      ['input', 'paste', 'change', 'blur'].forEach(event => {
        input.addEventListener(event, cleanInput);
      });

      // Prevent invalid keypress
      if (rule?.allowedChars) {
        input.addEventListener('keypress', e => {
          if (!rule.allowedChars.test(e.key)) {
            e.preventDefault();
            window.general.log('Invalid keypress prevented', {
              key: e.key,
              input: input.id || input.name
            });
          }
        });
      }

      // Initial validation
      if (input.value) cleanInput();

      // Clean up Cleave on modal close
      const modal = input.closest('.modal');
      if (modal) {
        modal.addEventListener(
          'hidden.bs.modal',
          () => {
            if (cleaveInstance) {
              cleaveInstance.destroy();
              input.cleaveInstance = null;
              window.general.log('Cleave destroyed', { input: input.id || input.name });
            }
          },
          { once: true }
        );
      }

      input.dataset.validationInitialized = 'true';
      window.general.log('Validation initialized', { input: input.id || input.name, format });
    });
  };

  try {
    initializeFormValidation(form);

    // Validate required fields on submit
    const missingFields = [];
    if (isSubmit) {
      form.querySelectorAll('[required]').forEach(input => {
        let isEmpty = false;
        const fieldName = (
          input.labels?.[0]?.textContent ||
          input.name ||
          input.placeholder ||
          'Field'
        )
          .replace(/\*$/, '')
          .trim();

        if (input.type === 'checkbox' || input.type === 'radio') {
          isEmpty = !form.querySelector(`[name="${input.name}"][required]:checked`);
        } else if (input.tagName === 'SELECT') {
          isEmpty = !input.value || input.value === '';
        } else {
          isEmpty = !input.value?.trim();
        }

        if (isEmpty) missingFields.push(fieldName);
      });

      if (missingFields.length) {
        window.general.showToast({
          icon: 'error',
          title: 'Missing Fields',
          message: `Required: ${missingFields.join(', ')}`,
          duration: 5000
        });
      }
    }

    // Validate data-validate fields
    const invalidFormats = [];
    form.querySelectorAll('input[data-validate], select[data-validate]').forEach(input => {
      const format = input.dataset.validate?.toLowerCase();
      const value = input.value;
      if (value && !validateInputFormat(format, value, input)) {
        const fieldName = (
          input.labels?.[0]?.textContent ||
          input.name ||
          input.placeholder ||
          'Field'
        )
          .replace(/\*$/, '')
          .trim();
        const dynamicMsg = input.dataset.validateMsg;
        const rule = validationRules.find(r => r.key === format);
        invalidFormats.push(`${fieldName}: ${dynamicMsg || rule?.error || 'Invalid format'}`);
      }
    });

    if (invalidFormats.length) {
      window.general.showToast({
        icon: 'error',
        title: 'Invalid Formats',
        message: invalidFormats.join('; '),
        duration: 5000
      });
    }

    const isValid = !(missingFields.length && isSubmit) && !invalidFormats.length;
    window.general.log('Form validation completed', {
      form: form.id,
      isValid,
      isSubmit,
      missingFields,
      invalidFormats
    });

    return isValid;
  } catch (e) {
    window.general.error('Form validation error', { form: form.id, error: e.message });
    window.general.showToast({
      icon: 'error',
      title: 'Validation Error',
      message: 'Failed to validate form',
      duration: 5000
    });
    return false;
  }
}

/**
 * Initializes unique input validation for inputs with the [data-unique] attribute.
 * Validates input values against the server via AJAX on blur events.
 * Uses window.general for logging, toasts, and server requests without external libraries.
 *
 * @requires window.general
 * @requires bootstrap
 */
export function unique() {
  try {
    const inputs = document.querySelectorAll('input[data-unique]');
    if (!inputs.length) {
      return;
    }

    inputs.forEach(input => {
      input.addEventListener('blur', async () => {
        const value = input.value.trim();
        const token = input.dataset.unique;
        if (!value || !token) {
          input.classList.remove('is-invalid', 'is-valid');
          window.general.log('No value or token for unique validation', {
            input: input.id || input.name
          });
          return;
        }

        const parent = input.parentElement;
        const dynamicMsg = input.dataset.uniqueMsg || `This value "${value}" is already in use.`;
        const errorClass = parent.classList.contains('float-input-control')
          ? 'skl-error-float-input'
          : 'skl-error-normal-input';

        // Remove existing error icon
        const errorIcon = parent.querySelector('.skl-error-icon');
        if (errorIcon) {
          bootstrap.Tooltip.getInstance(errorIcon)?.dispose();
          errorIcon.remove();
        }

        try {
          const response = await window.general.requestAction(token, {
            skeleton_value: value
          });
          if (!response.data || typeof response.data.isUnique === 'undefined') {
            throw new Error('Invalid response from server');
          }

          const isUnique = response.data.isUnique;
          input.classList.toggle('is-invalid', !isUnique && value !== '');
          input.classList.toggle('is-valid', isUnique);

          if (!isUnique && value !== '') {
            const errorIcon = document.createElement('span');
            errorIcon.className = `skl-error-icon ${errorClass}`;
            errorIcon.innerHTML = '<i class="fa-regular fa-circle-info"></i>';
            errorIcon.setAttribute('data-bs-toggle', 'tooltip');
            errorIcon.setAttribute('data-bs-placement', 'top');
            errorIcon.setAttribute('data-bs-title', dynamicMsg);
            parent.style.position = 'relative';
            parent.appendChild(errorIcon);
            new bootstrap.Tooltip(errorIcon);
          }

          window.general.log('Unique validation completed', {
            input: input.id || input.name,
            value,
            isUnique
          });
        } catch (e) {
          input.classList.add('is-invalid');
          input.classList.remove('is-valid');
          const errorIcon = document.createElement('span');
          errorIcon.className = `skl-error-icon ${errorClass}`;
          errorIcon.innerHTML = '<i class="fa-regular fa-circle-info"></i>';
          errorIcon.setAttribute('data-bs-toggle', 'tooltip');
          errorIcon.setAttribute('data-bs-placement', 'top');
          errorIcon.setAttribute('data-bs-title', 'Unable to validate the input. Please try again later.');
          parent.style.position = 'relative';
          parent.appendChild(errorIcon);
          new bootstrap.Tooltip(errorIcon);

          window.general.error('Error in unique validation', {
            input: input.id || input.name,
            token,
            error: e.message
          });
          window.general.showToast({
            icon: 'error',
            title: 'Validation Error',
            message: 'Unable to validate uniqueness',
            duration: 5000
          });
        }
      });
    });

    window.general.log('Unique input validation initialized', { count: inputs.length });
  } catch (e) {
    window.general.error('Error initializing unique validation', { error: e.message });
    window.general.showToast({
      icon: 'error',
      title: 'Initialization Error',
      message: 'Failed to initialize unique validation',
      duration: 5000
    });
  }
}