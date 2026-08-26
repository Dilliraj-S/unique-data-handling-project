import { authMiddleware } from '../../src/server/Http/Middleware/auth';
import nodemailer from 'nodemailer';

// IMAP is optional - only test if package is available
let Imap = null;
try {
  Imap = require('imap');
} catch (e) {
  console.log('⚠️ IMAP package not installed. IMAP testing will be skipped.');
}

/**
 * Email Test Connection API
 * Tests SMTP and IMAP connections for email account configuration
 * 
 * POST /api/email-test-connection
 * Body: {
 *   email: string,
 *   password: string,
 *   incoming_host: string,
 *   incoming_port: number,
 *   incoming_encryption: 'ssl' | 'tls' | 'starttls' | 'none',
 *   outgoing_host: string,
 *   outgoing_port: number,
 *   outgoing_encryption: 'ssl' | 'tls' | 'starttls' | 'none'
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Authenticate user
    let user;
    try {
      user = await authMiddleware(req);
    } catch (error) {
      return res.status(401).json({
        status: false,
        message: error.message || 'Authentication required'
      });
    }

    const {
      email,
      password,
      incoming_host,
      incoming_port,
      incoming_encryption,
      outgoing_host,
      outgoing_port,
      outgoing_encryption
    } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: 'Email and password are required'
      });
    }

    if (!outgoing_host || !outgoing_port) {
      return res.status(400).json({
        status: false,
        message: 'Outgoing host and port are required'
      });
    }

    const results = {
      smtp: { success: false, message: '' },
      imap: { success: false, message: '' }
    };

    // Test SMTP Connection
    try {
      console.log(`🔍 Testing SMTP connection: ${outgoing_host}:${outgoing_port} (${outgoing_encryption})`);
      
      const isSSL = outgoing_encryption === 'ssl' || outgoing_port === 465;
      const isSTARTTLS = outgoing_encryption === 'starttls' || 
                        outgoing_encryption === 'tls' || 
                        (outgoing_port === 587 && !isSSL);

      // For mailcow and STARTTLS, we need specific configuration
      const transporterConfig = {
        host: outgoing_host,
        port: outgoing_port,
        secure: isSSL, // true for SSL (port 465), false for STARTTLS (port 587)
        auth: {
          user: email,
          pass: password
        },
        // Connection timeout
        connectionTimeout: 15000, // 15 seconds
        greetingTimeout: 15000,
        socketTimeout: 15000,
        // Additional options for better compatibility
        tls: {
          rejectUnauthorized: false // Don't fail on invalid certificates
        }
      };

      // For STARTTLS (port 587), we need to explicitly require TLS
      if (isSTARTTLS) {
        transporterConfig.requireTLS = true;
        transporterConfig.secure = false; // STARTTLS requires secure: false
        // Don't restrict ciphers for STARTTLS - let the server negotiate
      } else {
        // For SSL, allow older ciphers for compatibility
        transporterConfig.tls.ciphers = 'SSLv3';
      }

      const transporter = nodemailer.createTransport(transporterConfig);

      // Verify connection
      await transporter.verify();
      
      results.smtp = {
        success: true,
        message: `SMTP connection successful (${outgoing_host}:${outgoing_port} with ${outgoing_encryption || 'default encryption'})`
      };
      
      console.log(`✅ SMTP test passed: ${email}`);
      
    } catch (smtpError) {
      console.error('❌ SMTP test failed:', smtpError);
      results.smtp = {
        success: false,
        message: smtpError.message || 'SMTP connection failed. Please check your settings.'
      };
    }

    // Test IMAP Connection (optional, only if incoming settings provided and IMAP package available)
    if (incoming_host && incoming_port && Imap) {
      try {
        console.log(`🔍 Testing IMAP connection: ${incoming_host}:${incoming_port} (${incoming_encryption})`);
        
        const imapConfig = {
          user: email,
          password: password,
          host: incoming_host,
          port: incoming_port,
          tls: incoming_encryption === 'ssl' || incoming_port === 993,
          tlsOptions: {
            rejectUnauthorized: false
          }
        };

        // For STARTTLS, we need to handle it differently
        if (incoming_encryption === 'starttls' || incoming_encryption === 'tls') {
          imapConfig.tls = false;
          imapConfig.autotls = 'always'; // Enable STARTTLS
        }

        await new Promise((resolve, reject) => {
          const imap = new Imap(imapConfig);
          
          const timeout = setTimeout(() => {
            imap.end();
            reject(new Error('IMAP connection timeout'));
          }, 10000); // 10 second timeout
          
          imap.once('ready', () => {
            clearTimeout(timeout);
            imap.end();
            resolve();
          });
          
          imap.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
          
          imap.connect();
        });
        
        results.imap = {
          success: true,
          message: `IMAP connection successful (${incoming_host}:${incoming_port} with ${incoming_encryption || 'default encryption'})`
        };
        
        console.log(`✅ IMAP test passed: ${email}`);
        
      } catch (imapError) {
        console.error('❌ IMAP test failed:', imapError);
        results.imap = {
          success: false,
          message: imapError.message || 'IMAP connection failed. Please check your settings.'
        };
      }
    } else {
      if (!Imap) {
        results.imap = {
          success: true,
          message: 'IMAP test skipped (IMAP package not installed)'
        };
      } else {
        results.imap = {
          success: true,
          message: 'IMAP test skipped (incoming settings not provided)'
        };
      }
    }

    // Determine overall status
    // SMTP is required, IMAP is optional
    const overallSuccess = results.smtp.success;
    
    if (overallSuccess) {
      let message = 'SMTP connection successful!';
      if (results.smtp.success && results.imap.success && incoming_host) {
        message = 'Both SMTP and IMAP connections successful!';
      } else if (results.smtp.success && incoming_host && !Imap) {
        message = 'SMTP connection successful! (IMAP testing not available - package not installed)';
      } else if (results.smtp.success && incoming_host) {
        message = `SMTP connection successful! ${results.imap.message || ''}`;
      }
      
      return res.status(200).json({
        status: true,
        message: message,
        details: {
          smtp: results.smtp,
          imap: results.imap
        }
      });
    } else {
      let errorMessage = 'Connection test failed. ';
      if (!results.smtp.success) {
        errorMessage += `SMTP: ${results.smtp.message}. `;
      }
      if (!results.imap.success && incoming_host && Imap) {
        errorMessage += `IMAP: ${results.imap.message}. `;
      }
      
      return res.status(200).json({
        status: false,
        message: errorMessage.trim(),
        details: {
          smtp: results.smtp,
          imap: results.imap
        }
      });
    }

  } catch (error) {
    console.error('❌ Email test connection error:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to test email connection'
    });
  }
}

