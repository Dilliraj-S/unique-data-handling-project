import { authMiddleware } from '../../src/server/Http/Middleware/auth';

/**
 * Email Auto-Detect Settings API
 * Attempts to auto-detect IMAP/SMTP settings for an email domain
 * 
 * POST /api/email-autodetect
 * Body: { email: string }
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

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: false,
        message: 'Email is required'
      });
    }

    // Extract domain from email
    const domain = email.split('@')[1];
    if (!domain) {
      return res.status(400).json({
        status: false,
        message: 'Invalid email format'
      });
    }

    // Common email provider settings
    const providerSettings = {
      'gmail.com': {
        imap_host: 'imap.gmail.com',
        imap_port: 993,
        imap_encryption: 'ssl',
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_encryption: 'starttls'
      },
      'yahoo.com': {
        imap_host: 'imap.mail.yahoo.com',
        imap_port: 993,
        imap_encryption: 'ssl',
        smtp_host: 'smtp.mail.yahoo.com',
        smtp_port: 587,
        smtp_encryption: 'starttls'
      },
      'outlook.com': {
        imap_host: 'outlook.office365.com',
        imap_port: 993,
        imap_encryption: 'ssl',
        smtp_host: 'smtp.office365.com',
        smtp_port: 587,
        smtp_encryption: 'starttls'
      },
      'hotmail.com': {
        imap_host: 'outlook.office365.com',
        imap_port: 993,
        imap_encryption: 'ssl',
        smtp_host: 'smtp.office365.com',
        smtp_port: 587,
        smtp_encryption: 'starttls'
      }
    };

    // Check if we have settings for this domain
    if (providerSettings[domain.toLowerCase()]) {
      return res.status(200).json({
        status: true,
        message: 'Settings auto-detected successfully',
        settings: providerSettings[domain.toLowerCase()]
      });
    }

    // For custom domains (like datamailtech.com), try common patterns
    // Most mail servers use mail.domain.com or smtp.domain.com
    const commonPatterns = [
      {
        imap_host: `mail.${domain}`,
        imap_port: 993,
        imap_encryption: 'ssl',
        smtp_host: `mail.${domain}`,
        smtp_port: 587,
        smtp_encryption: 'starttls'
      },
      {
        imap_host: `imap.${domain}`,
        imap_port: 993,
        imap_encryption: 'ssl',
        smtp_host: `smtp.${domain}`,
        smtp_port: 587,
        smtp_encryption: 'starttls'
      },
      {
        imap_host: `mail.${domain}`,
        imap_port: 143,
        imap_encryption: 'starttls',
        smtp_host: `mail.${domain}`,
        smtp_port: 587,
        smtp_encryption: 'starttls'
      }
    ];

    // Return first pattern as suggestion (user can test it)
    return res.status(200).json({
      status: true,
      message: `Suggested settings for ${domain} (please test connection)`,
      settings: commonPatterns[0] // Return most common pattern
    });

  } catch (error) {
    console.error('❌ Email autodetect error:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to auto-detect email settings'
    });
  }
}

