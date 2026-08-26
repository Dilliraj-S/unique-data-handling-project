const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * GmailUtility - Service for interacting with Gmail API
 * CommonJS version for Queue Worker compatibility
 */
class GmailUtility {
  /**
   * Setup Google Client (Self-contained logic from GoogleAuthCtrl)
   */
  static setupGoogleClient() {
    const clientSecretPath = process.env.GOOGLE_CLIENT_SECRET_PATH || 
      path.join(process.cwd(), 'storage', 'app', 'client_secret.json');
    
    let credentials;
    let redirectUri;
    
    try {
      if (fs.existsSync(clientSecretPath)) {
        credentials = JSON.parse(fs.readFileSync(clientSecretPath, 'utf8'));
        const nextJsUri = 'http://localhost:3000/api/auth/google/callback';
        const fileUris = credentials.web?.redirect_uris || [];
        redirectUri = process.env.GOOGLE_REDIRECT_URI || 
                     fileUris.find(uri => uri.includes('localhost:3000') || uri.includes('127.0.0.1:3000')) ||
                     fileUris[0] || 
                     nextJsUri;
      } else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
        credentials = {
          web: {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uris: [redirectUri]
          }
        };
      } else {
        throw new Error('Google OAuth credentials not found');
      }

      const oauth2Client = new google.auth.OAuth2(
        credentials.web.client_id,
        credentials.web.client_secret,
        redirectUri
      );

      return oauth2Client;
    } catch (error) {
      console.error('Error setting up Google client:', error);
      throw error;
    }
  }

  /**
   * Get Google Client with credentials
   * @param {Object} account - Email account object
   * @param {Array} scopes - Optional scopes (defaults to readonly + send)
   * @returns {Promise<Object>} Google OAuth2 client
   */
  static async getGoogleClient(account, scopes = null) {
    try {
      const client = this.setupGoogleClient();
      
      const tokenData = {
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        scope: scopes || 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
        token_type: 'Bearer',
        expiry_date: account.token_expiry ? new Date(account.token_expiry).getTime() : null
      };

      client.setCredentials(tokenData);

      // Check if token needs refresh
      const isExpired = tokenData.expiry_date && tokenData.expiry_date <= Date.now();
      if (isExpired && account.refresh_token) {
        console.log(`🔄 Refreshing token for ${account.email}`);
        const { credentials } = await client.refreshAccessToken();
        client.setCredentials(credentials);
      }

      return client;
    } catch (error) {
      console.error('Error getting Google client:', error);
      throw error;
    }
  }

  /**
   * Get message body from Gmail message payload
   * @param {Object} message - Gmail message object
   * @returns {Object} Object containing html and plain text
   */
  static getMessageBody(message) {
    let body = {
      html: '',
      plain: '',
      snippet: message.snippet || ''
    };

    if (!message.payload) {
      return body;
    }

    const content = this.extractAllContent(message.payload);
    body.html = content.html;
    body.plain = content.plain;

    // If no HTML but we have plain text, convert plain to HTML
    if (!body.html && body.plain) {
      body.html = body.plain.replace(/\n/g, '<br>');
    }

    return body;
  }

  /**
   * Extract all content from payload parts
   * @param {Object} payload - Message payload
   * @returns {Object} Extracted content
   */
  static extractAllContent(payload) {
    let content = {
      html: '',
      plain: '',
      attachments: []
    };

    if (payload.parts) {
      this.processParts(payload.parts, content);
    } else {
      // Single part message
      this.processParts([payload], content);
    }

    return content;
  }

  /**
   * Process message parts recursively
   * @param {Array} parts - Message parts
   * @param {Object} content - Content accumulator
   */
  static processParts(parts, content) {
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        content.plain += this.decodeBody(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
        content.html += this.decodeBody(part.body.data);
      } else if (part.mimeType === 'multipart/alternative' || part.mimeType === 'multipart/mixed' || part.mimeType === 'multipart/related') {
        if (part.parts) {
          this.processParts(part.parts, content);
        }
      }
    }
  }

  /**
   * Decode base64url encoded body
   * @param {string} data - Base64url string
   * @returns {string} Decoded string
   */
  static decodeBody(data) {
    if (!data) return '';
    const buff = Buffer.from(data, 'base64url');
    return buff.toString('utf-8');
  }
}

module.exports = GmailUtility;
