import { getCollection } from '../../../../../src/lib/mongodb';
import { google } from 'googleapis';
import { ObjectId, Long } from 'mongodb';
import fs from 'fs';
import path from 'path';

/**
 * GoogleAuthCtrl - Handles Google OAuth flow for email accounts
 * Based on bv project's GoogleAuthController.php
 */
export default class GoogleAuthCtrl {
  /**
   * Setup Google OAuth client
   */
  static setupGoogleClient() {
    // Load client secret from file (matching BV project: storage/app/client_secret.json)
    // BV project uses: $client->setAuthConfig(storage_path('app/client_secret.json'));
    const clientSecretPath = process.env.GOOGLE_CLIENT_SECRET_PATH || 
      path.join(process.cwd(), 'storage', 'app', 'client_secret.json');
    
    let credentials;
    let redirectUri;
    
    try {
      // First, try to load from file (matching BV project's approach - highest priority)
      if (fs.existsSync(clientSecretPath)) {
        console.log('📁 Loading Google OAuth credentials from file (matching BV project):', clientSecretPath);
        credentials = JSON.parse(fs.readFileSync(clientSecretPath, 'utf8'));
        
        // Use redirect URI from file if available, otherwise from env
        // BV project uses: env('GOOGLE_REDIRECT_URI', 'http://127.0.0.1:8000/auth/google/callback-new')
        // For Next.js, we'll use: http://localhost:3000/api/auth/google/callback (or from env)
        // Priority: 1. Env variable, 2. Next.js URI from file array, 3. First URI from file, 4. Default
        const nextJsUri = 'http://localhost:3000/api/auth/google/callback';
        const fileUris = credentials.web?.redirect_uris || [];
        redirectUri = process.env.GOOGLE_REDIRECT_URI || 
                     fileUris.find(uri => uri.includes('localhost:3000') || uri.includes('127.0.0.1:3000')) ||
                     fileUris[0] || 
                     nextJsUri;
        
        console.log('🔗 Using redirect URI from file/env:', redirectUri);
      } 
      // Then, try environment variables (fallback)
      else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        console.log('🔑 Loading Google OAuth credentials from environment variables');
        // Use the redirect URI from env, or default
        redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
        console.log('🔗 Using redirect URI from env:', redirectUri);
        credentials = {
          web: {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uris: [redirectUri]
          }
        };
      } 
      // If neither exists, provide helpful error message
      else {
        const errorMessage = `Google OAuth credentials not configured. Please do one of the following:

⚠️ IMPORTANT: To use the same verified OAuth app as BV project (recommended):

Option 1: Copy client_secret.json from BV project (RECOMMENDED):
  1. Copy the file from: bv/storage/app/client_secret.json
  2. Paste it to: ${clientSecretPath}
  3. Update redirect_uris in the file to: ["http://localhost:3000/api/auth/google/callback"]
  4. This uses the same verified/published OAuth app as BV project

Option 2: Add to .env file (if using different OAuth app):
  GOOGLE_CLIENT_ID=your-client-id-here
  GOOGLE_CLIENT_SECRET=your-client-secret-here
  GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

Option 3: Create client_secret.json file at: ${clientSecretPath}
  {
    "web": {
      "client_id": "your-client-id-here",
      "client_secret": "your-client-secret-here",
      "redirect_uris": ["http://localhost:3000/api/auth/google/callback"]
    }
  }

📝 Note: If you see "Naveen Auth App has not completed the Google verification process":
  - This means your OAuth app is in testing mode
  - Solution: Use the same client_secret.json from BV project (Option 1 above)
  - Or publish your OAuth app in Google Cloud Console`;
        
        console.error('❌', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error loading Google OAuth credentials:', error.message);
      throw error;
    }

    // Ensure redirect URI is set (from file, env, or default)
    if (!redirectUri) {
      const nextJsUri = 'http://localhost:3000/api/auth/google/callback';
      const fileUris = credentials.web?.redirect_uris || [];
      redirectUri = process.env.GOOGLE_REDIRECT_URI || 
                   fileUris.find(uri => uri.includes('localhost:3000') || uri.includes('127.0.0.1:3000')) ||
                   fileUris[0] || 
                   nextJsUri;
    }
    
    console.log('🔗 OAuth2 client redirect URI:', redirectUri);
    
    const oauth2Client = new google.auth.OAuth2(
      credentials.web.client_id,
      credentials.web.client_secret,
      redirectUri
    );

    return oauth2Client;
  }

  /**
   * Redirect to Google OAuth
   * GET /api/auth/google/redirect
   */
  static async redirect(req, res) {
    try {
      console.log('🔐 Google OAuth redirect initiated');
      
      const oauth2Client = this.setupGoogleClient();
      
      // Generate state for CSRF protection
      const crypto = require('crypto');
      const state = crypto.randomBytes(16).toString('hex');
      
      // Get user_id from authenticated user (set by authMiddleware in redirect.js)
      // authMiddleware returns string user_id (e.g., "USR_ADMIN_001")
      const userId = req.user?.user_id || null;
      if (!userId) {
        return res.status(401).json({
          status: false,
          title: 'Authentication Error',
          message: 'User authentication required to add Google account.'
        });
      }
      
      // Validate that userId is a string (not empty)
      if (typeof userId !== 'string' || userId.trim() === '') {
        console.error('❌ Invalid user_id format in redirect - must be string:', userId, 'req.user:', req.user);
        return res.status(400).json({
          status: false,
          title: 'Authentication Error',
          message: 'Invalid user ID format. Please log in again.'
        });
      }
      
      console.log('✅ OAuth redirect - Storing user_id in cookie:', userId);
      
      // Store state and user_id in cookies (Next.js API routes use setHeader for cookies)
      const cookieOptions = [
        `google_auth_state=${state}`,
        `HttpOnly`,
        `SameSite=Lax`,
        `Max-Age=600`, // 10 minutes in seconds
        `Path=/`
      ];
      
      const userIdCookieOptions = [
        `google_auth_user_id=${userId}`,
        `HttpOnly`,
        `SameSite=Lax`,
        `Max-Age=600`, // 10 minutes in seconds
        `Path=/`
      ];
      
      if (process.env.NODE_ENV === 'production') {
        cookieOptions.push('Secure');
        userIdCookieOptions.push('Secure');
      }
      
      res.setHeader('Set-Cookie', [
        cookieOptions.join('; '),
        userIdCookieOptions.join('; ')
      ]);

      // Scopes for Gmail access and user info (matching BV project exactly)
      // BV project uses:
      //   'https://www.googleapis.com/auth/gmail.readonly',
      //   'https://www.googleapis.com/auth/gmail.send',
      //   'https://www.googleapis.com/auth/userinfo.email',
      //   'https://www.googleapis.com/auth/userinfo.profile',
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid', // Additional: Required for ID token which contains email (fallback method)
      ];

      // Generate auth URL (matching BV project: setAccessType('offline'), setPrompt('consent'))
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // BV: $client->setAccessType('offline')
        prompt: 'consent', // BV: $client->setPrompt('consent')
        scope: scopes,
        state: state // CSRF protection (BV: $client->setState($state))
      });

      // Log the OAuth URL to help debug redirect_uri_mismatch
      const urlObj = new URL(authUrl);
      const redirectUriParam = urlObj.searchParams.get('redirect_uri');
      console.log('✅ Generated Google OAuth URL');
      console.log('🔍 OAuth URL redirect_uri parameter:', redirectUriParam);
      console.log('⚠️ If you see redirect_uri_mismatch, add this EXACT URI to Google Cloud Console:');
      console.log('   Project: alien-craft-450504-r8');
      console.log('   OAuth Client ID: 899697859107-vnh4lrjashlql1o95qrcqmdirg10i2k4');
      console.log('   Add URI:', redirectUriParam || redirectUri);
      
      // If request wants JSON (axios call), return JSON with URL
      // Otherwise, redirect (browser navigation)
      const acceptsJson = req.headers.accept && req.headers.accept.includes('application/json');
      if (acceptsJson) {
        return res.status(200).json({
          status: true,
          redirectUrl: authUrl
        });
      }
      
      // Browser redirect
      return res.redirect(authUrl);
    } catch (error) {
      console.error('❌ Google OAuth redirect error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: 'Failed to initiate Google OAuth: ' + error.message
      });
    }
  }

  /**
   * Handle Google OAuth callback
   * GET /api/auth/google/callback
   */
  static async callback(req, res) {
    try {
      console.log('🔐 Google OAuth callback received');
      console.log('🔍 Callback query params:', { 
        hasCode: !!req.query.code, 
        hasState: !!req.query.state, 
        hasError: !!req.query.error,
        state: req.query.state 
      });
      
      const { code, state, error } = req.query;

      if (error) {
        console.error('❌ Google OAuth error:', error);
        return res.redirect('/#/central/emailsystem/mailconfig?error=' + encodeURIComponent(error));
      }

      if (!code) {
        return res.redirect('/#/central/emailsystem/mailconfig?error=' + encodeURIComponent('No authorization code received'));
      }

      // Verify state (CSRF protection) and get user_id from cookie
      // Parse cookies from request headers (Next.js API routes don't parse cookies automatically)
      const cookies = {};
      if (req.headers.cookie) {
        req.headers.cookie.split(';').forEach(cookie => {
          const parts = cookie.trim().split('=');
          if (parts.length === 2) {
            cookies[parts[0]] = decodeURIComponent(parts[1]);
          }
        });
      }
      
      const storedState = cookies.google_auth_state;
      const storedUserId = cookies.google_auth_user_id;
      
      if (!storedState || state !== storedState) {
        console.error('❌ State mismatch - possible CSRF attack', { state, storedState, cookies: Object.keys(cookies) });
        return res.redirect('/#/central/emailsystem/mailconfig?error=' + encodeURIComponent('Invalid state parameter'));
      }
      
      if (!storedUserId || typeof storedUserId !== 'string' || storedUserId.trim() === '') {
        console.error('❌ User ID not found in cookie or invalid format - OAuth flow may have been initiated by different user');
        return res.redirect('/#/central/emailsystem/mailconfig?error=' + encodeURIComponent('User session expired. Please try again.'));
      }
      
      // storedUserId is now a string (e.g., "USR_ADMIN_001") - no conversion needed
      console.log('✅ Verified OAuth callback for user_id:', storedUserId);

      const oauth2Client = this.setupGoogleClient();
      
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      // Get user email - try multiple methods
      let email = null;
      
      // Method 1: Try to get email from ID token (if available)
      if (tokens.id_token) {
        try {
          // Decode ID token (it's a JWT)
          const jwt = require('jsonwebtoken');
          // ID tokens are not signed with our secret, they're signed by Google
          // We can decode without verification to get the payload
          const decoded = jwt.decode(tokens.id_token);
          if (decoded && decoded.email) {
            email = decoded.email;
            console.log('✅ Got email from ID token:', email);
          }
        } catch (idTokenError) {
          console.warn('⚠️ Failed to decode ID token:', idTokenError.message);
        }
      }
      
      // Method 2: If ID token didn't work, try Gmail API
      if (!email) {
        try {
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          const profile = await gmail.users.getProfile({ userId: 'me' });
          email = profile.data.emailAddress;
          console.log('✅ Got email from Gmail API:', email);
        } catch (gmailError) {
          console.warn('⚠️ Gmail API failed, trying OAuth2 userinfo:', gmailError.message);
          
          // Method 3: Fallback to OAuth2 userinfo endpoint
          try {
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const userInfo = await oauth2.userinfo.get();
            email = userInfo.data.email;
            console.log('✅ Got email from OAuth2 userinfo:', email);
          } catch (userInfoError) {
            console.error('❌ All methods to get email failed:', userInfoError.message);
            throw new Error('Failed to retrieve user email from Google. Please ensure all required scopes are granted.');
          }
        }
      }

      if (!email) {
        throw new Error('Could not retrieve email address from Google OAuth response');
      }

      console.log('✅ Google OAuth successful for email:', email);

      // Store tokens (you might want to encrypt these)
      const tokenData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        token_type: tokens.token_type || 'Bearer'
      };

      // Update the pending email account record in MongoDB
      const collection = await getCollection('email_accounts', 'pluto');
      
      // Log all pending records before update (matching bv project debug logic)
      const allPending = await collection.find(
        { status: 'pending', type: 'google' }
      ).toArray();
      console.log('🔍 DEBUG: All pending records before update:', allPending.length);
      allPending.forEach(r => {
        console.log('  - Pending record:', {
          id: r.id?.toString(),
          _id: r._id,
          user_id: r.user_id?.toString(),
          email: r.email,
          created_at: r.created_at
        });
      });
      
      // Find the last pending record for THIS user (matching the bv project logic: ORDER BY id DESC LIMIT 1)
      // In MongoDB, we sort by id (NumberLong) descending to get the most recent
      // IMPORTANT: Filter by user_id (string) to ensure we update the correct user's pending record
      console.log('🔍 DEBUG: Searching for pending record with user_id:', storedUserId);
      const pendingRecord = await collection.findOne(
        { 
          status: 'pending', 
          type: 'google',
          user_id: storedUserId  // Filter by string user_id (e.g., "USR_ADMIN_001")
        },
        { sort: { id: -1 } } // Sort by id descending (not created_at) to match bv project
      );

      console.log('🔍 DEBUG: Found pending record:', pendingRecord ? {
        id: pendingRecord.id?.toString(),
        _id: pendingRecord._id,
        email: pendingRecord.email,
        user_id: pendingRecord.user_id,
        created_at: pendingRecord.created_at
      } : 'No pending record found for user_id: ' + storedUserId);

      if (pendingRecord) {
        // Update existing pending record with all token data
        const updateResult = await collection.updateOne(
          { _id: pendingRecord._id },
          {
            $set: {
              email: email,
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token || null,
              token_expiry: tokenData.expiry_date ? new Date(tokenData.expiry_date) : null,
              status: 'active', // Set to active after successful OAuth
              updated_at: new Date()
            }
          }
        );
        
        console.log('✅ Update result:', {
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
          recordId: pendingRecord._id,
          recordNumericId: pendingRecord.id
        });
        
        // Verify the update
        const updatedRecord = await collection.findOne({ _id: pendingRecord._id });
        console.log('✅ Verified updated record status:', updatedRecord?.status, 'email:', updatedRecord?.email);
      } else {
        // If no pending record, create new one (fallback)
        // Use storedUserId from cookie (set during OAuth redirect) instead of req.user
        // because callback is called by Google, not by authenticated user
        if (!storedUserId || typeof storedUserId !== 'string') {
          console.error('❌ No pending record found and no valid user_id in cookie - cannot create account');
          return res.redirect('/#/central/emailsystem/mailconfig?error=' + encodeURIComponent('Session expired. Please try adding the account again.'));
        }
        
        // Generate numeric ID (NumberLong)
        let nextId = Long.fromNumber(1);
        const maxDoc = await collection.findOne(
          {},
          { sort: { id: -1 }, projection: { id: 1 } }
        );
        if (maxDoc && maxDoc.id) {
          const maxId = maxDoc.id instanceof Long ? maxDoc.id : Long.fromNumber(Number(maxDoc.id));
          nextId = Long.fromNumber(maxId.toNumber() + 1);
        }
        
        // user_id is now string (e.g., "USR_ADMIN_001") - no conversion needed
        console.log('✅ Creating new email account record with user_id from cookie:', storedUserId);
        
        await collection.insertOne({
          id: nextId, // Required: NumberLong
          user_id: storedUserId, // Required: string (e.g., "USR_ADMIN_001")
          used_quota: 0, // Required: int
          email: email,
          type: 'google',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expiry: tokenData.expiry_date ? new Date(tokenData.expiry_date) : null,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log('✅ Created new email account record');
      }

      // Clear state and user_id from cookies (set to expire immediately)
      res.setHeader('Set-Cookie', [
        'google_auth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
        'google_auth_user_id=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
      ]);

      // Redirect to success page
      return res.redirect('/#/central/emailsystem/mailconfig?success=' + encodeURIComponent(`Google account ${email} authenticated successfully!`));
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      return res.redirect('/#/central/emailsystem/mailconfig?error=' + encodeURIComponent('Authentication failed: ' + error.message));
    }
  }

  /**
   * Pre-save Google account details (before OAuth)
   * POST /api/pre-save-google-account
   */
  static async preSaveGoogleAccount(req, res) {
    try {
      console.log('💾 Pre-saving Google account details');
      
      const allowedRegions = [
        'North America',
        'South America',
        'APJ & APAC',
        'EMEA',
        'MENA',
        'DACH',
        'Oceania',
        'NORDICS',
      ];

      // Validate required fields
      const {
        first_name,
        last_name,
        extension,
        phone_number,
        designation,
        postal_code,
        address,
        fax,
        unsubscribe,
        region,
        daily_send_limit
      } = req.body;

      if (!first_name || !last_name) {
        return res.status(400).json({
          status: false,
          title: 'Validation Error',
          message: 'First name and last name are required.'
        });
      }

      if (!phone_number) {
        return res.status(400).json({
          status: false,
          title: 'Validation Error',
          message: 'Phone number is required.'
        });
      }

      if (!designation || !postal_code || !address) {
        return res.status(400).json({
          status: false,
          title: 'Validation Error',
          message: 'Designation, postal code, and address are required.'
        });
      }

      if (!allowedRegions.includes(region)) {
        return res.status(400).json({
          status: false,
          title: 'Validation Error',
          message: 'Valid region is required.'
        });
      }

      if (!daily_send_limit || isNaN(daily_send_limit) || daily_send_limit < 1) {
        return res.status(400).json({
          status: false,
          title: 'Validation Error',
          message: 'Daily send limit must be a number greater than 0.'
        });
      }

      // Get user ID from authenticated user (set by authMiddleware in pre-save-google-account.js)
      // authMiddleware returns string user_id (e.g., "USR_ADMIN_001")
      const userId = req.user?.user_id || null;
      
      console.log('🔍 Pre-save Google account - req.user:', {
        hasUser: !!req.user,
        userId: userId,
        userObject: req.user ? { user_id: req.user.user_id, username: req.user.username } : null
      });
      
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        console.error('❌ Pre-save Google account - No valid user_id found in req.user:', req.user);
        return res.status(400).json({
          status: false,
          title: 'Validation Error',
          message: 'User ID is required. Please ensure you are logged in.'
        });
      }

      // Get collection
      const collection = await getCollection('email_accounts', 'pluto');
      
      // Generate numeric ID (NumberLong) - get the max id and increment
      let nextId = Long.fromNumber(1);
      const maxDoc = await collection.findOne(
        {},
        { sort: { id: -1 }, projection: { id: 1 } }
      );
      if (maxDoc && maxDoc.id) {
        // If id is already a Long, use it directly; otherwise convert
        const maxId = maxDoc.id instanceof Long ? maxDoc.id : Long.fromNumber(Number(maxDoc.id));
        nextId = Long.fromNumber(maxId.toNumber() + 1);
      }

      // user_id is now string (e.g., "USR_ADMIN_001") - no conversion needed
      console.log('✅ Pre-save Google account - Creating pending record with user_id:', userId);

      // Insert pending record into MongoDB with required schema fields
      const result = await collection.insertOne({
        id: nextId, // Required: NumberLong
        user_id: userId, // Required: string (e.g., "USR_ADMIN_001")
        used_quota: 0, // Required: int (default to 0 for new accounts)
        type: 'google',
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        extension: extension || null,
        phone_number: phone_number.trim(),
        designation: designation.trim(),
        postal_code: postal_code.trim(),
        address: address.trim(),
        fax: fax || null,
        unsubscribe: unsubscribe || null,
        daily_send_limit: parseInt(daily_send_limit) || 100,
        region: region.trim(),
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Store pre-save ID in session (for reference, though we'll find by status)
      if (req.session) {
        req.session.google_pre_save_id = result.insertedId.toString();
      }

      console.log('✅ Pre-saved Google account details, ID:', result.insertedId);

      // Return redirect URL to Google OAuth
      const redirectUrl = '/api/auth/google/redirect';
      return res.status(200).json({
        status: true,
        redirect: redirectUrl
      });
    } catch (error) {
      console.error('❌ Pre-save Google account error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: 'Failed to pre-save account details: ' + error.message
      });
    }
  }
}

