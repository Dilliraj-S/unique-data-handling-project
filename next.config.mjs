import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  
  // SCSS Configuration - properly configure sass loader
  sassOptions: {
    includePaths: [
      path.join(__dirname, 'node_modules'),
      path.join(__dirname, 'node_modules/@coreui/coreui/scss'),
    ],
    silenceDeprecations: ['legacy-js-api'],
  },
  
  // Disable static optimization for client-side routing
  experimental: {
    optimizeCss: false,
  },
  
  // API Configuration for large file uploads (300MB - 2GB CSV support)
  api: {
    bodyParser: {
      sizeLimit: '2gb',
    },
    responseLimit: false,
  },
};

export default nextConfig;
