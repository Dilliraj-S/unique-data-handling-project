/**
 * Application Configuration
 */
const config = {
  // Application name
  name: process.env.NEXT_PUBLIC_APP_NAME || 'My Application',

  // API Configuration
  api: {
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    timeout: 30000, // 30 seconds
  },

  // Authentication Configuration
  auth: {
    tokenKey: 'token',
    userKey: 'user',
    rememberMeKey: 'remember_me',
  },

  // Pagination Configuration
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
  },

  // Date/Time Configuration
  dateTime: {
    format: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss',
    dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
  },

  // File Upload Configuration
  fileUpload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  },

  // Validation Configuration
  validation: {
    passwordMinLength: 6,
    emailRegex: /\S+@\S+\.\S+/,
  },
};

export default config;

