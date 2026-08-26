/**
 * PM2 ecosystem config – use this to start the Next.js app on Windows and avoid
 * "Script not found" when using: pm2 start npm -- run start
 *
 * Usage:
 *   npx pm2 start ecosystem.config.cjs
 *   npx pm2 stop nextjs-app
 *   npx pm2 logs nextjs-app
 */

const path = require('path');
const appDir = __dirname;

module.exports = {
  apps: [
    {
      name: 'nextjs-app',
      script: path.join(appDir, 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: 'start',
      cwd: appDir,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'sync-action-worker',
      script: path.join(appDir, 'sync-action-worker.js'),
      cwd: appDir,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'gmail-pubsub-worker',
      script: path.join(appDir, 'gmail-pubsub-worker.js'),
      cwd: appDir,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'mailcow-imap-worker',
      script: path.join(appDir, 'mailcow-imap-worker.js'),
      cwd: appDir,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'maintenance-queue-worker',
      script: path.join(appDir, 'maintenance-queue-worker.js'),
      cwd: appDir,
      instances: 1,
      autorestart: false,       // NEVER auto-restart mid-job — no checkpoint/resume logic
      watch: false,             // File saves must NOT restart during 3-crore runs
      max_memory_restart: '3G', // Safety net — chunk strategy uses ~50MB normally
      kill_timeout: 30000,      // 30s grace period for current chunk to finish
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=4096', // 4GB V8 heap safety net
      },
    },
  ],
};
