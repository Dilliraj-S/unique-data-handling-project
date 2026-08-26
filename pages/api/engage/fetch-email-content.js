import { getCollection } from '@/lib/mongodb';
import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import GmailUtility from '@/application/Services/GmailUtility';
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    // Authenticate user and get user_id
    let user;
    try {
      user = await authMiddleware(req);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message || 'Unauthorized' });
    }

    if (!user || !user.user_id) {
      return res.status(401).json({ status: false, message: 'User authentication required' });
    }

    if (!user.user_id || typeof user.user_id !== 'string') {
      console.error('❌ Invalid user_id format - must be string:', user.user_id);
      return res.status(400).json({ status: false, message: 'Invalid user ID format' });
    }
    
    const { email_id, active_email } = req.query;

    if (!email_id) {
      return res.status(400).json({ status: false, message: 'Email ID is required' });
    }

    const collection = await getCollection('emails', 'pluto');
    const accountsCollection = await getCollection('email_accounts', 'pluto');
    
    // Find email by our internal ID (which we set to message_id in sync)
    let email = await collection.findOne({ id: email_id });
    
    // Verify the email belongs to an account owned by the current user
    let account = null;
    if (email && email.email_account_id) {
      account = await accountsCollection.findOne({ 
        id: email.email_account_id,
        user_id: user.user_id
      });
      
      if (!account) {
        return res.status(403).json({ 
          status: false, 
          message: 'Access denied. This email belongs to an account you do not own.' 
        });
      }
    }
    
    // If not found by id, try _id
    if (!email) {
      try {
        const { ObjectId } = require('mongodb');
        email = await collection.findOne({ _id: new ObjectId(email_id) });
      } catch (e) {
        // Ignore invalid ObjectId
      }
    }

    if (!email) {
      return res.status(404).json({ status: false, message: 'Email not found' });
    }

    // Mark as read - both locally AND on Gmail
    if (!email.read) {
      // Update local DB
      await collection.updateOne(
        { _id: email._id }, 
        { $set: { read: 1, updated_at: new Date() } }
      );

      // Sync to Gmail if it's a Google account
      if (account && account.type === 'google') {
        try {
          const client = await GmailUtility.getGoogleClient(account);
          const gmail = google.gmail({ version: 'v1', auth: client });
          
          await gmail.users.messages.modify({
            userId: 'me',
            id: email.message_id || email.id,
            requestBody: {
              removeLabelIds: ['UNREAD']
            }
          });
          
          console.log(`[fetch-email-content] Marked ${email.id} as read on Gmail`);
        } catch (gmailError) {
          // Log but don't fail - local update succeeded
          console.warn(`[fetch-email-content] Gmail sync failed:`, gmailError.message);
        }
      }
    }

    // Return in thread format (array of messages)
    return res.status(200).json({
      status: true,
      messages: [{
        id: email.id,
        subject: email.subject,
        from: email.from_name || email.from_email,
        to: active_email,
        date: email.received_at,
        body: email.body || email.body_plain,
        read: 1
      }]
    });

  } catch (error) {
    console.error('Error fetching content:', error);
    return res.status(500).json({ status: false, message: error.message });
  }
}

