import { getCollection } from '@/lib/mongodb';
import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import GmailUtility from '@/application/Services/GmailUtility';
import { google } from 'googleapis';

/**
 * Email Action API - Handle read/unread, delete, move to spam
 * Syncs actions to both local DB and Gmail
 * 
 * POST /api/engage/email-action
 * Body: { email_id, action: 'read' | 'unread' | 'delete' | 'move_to_spam', active_email }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    // Authenticate user
    let user;
    try {
      user = await authMiddleware(req);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message || 'Unauthorized' });
    }

    if (!user?.user_id || typeof user.user_id !== 'string') {
      return res.status(401).json({ status: false, message: 'User authentication required' });
    }

    const { email_id, action, active_email } = req.body;
    
    if (!email_id || !action) {
      return res.status(400).json({ status: false, message: 'email_id and action are required' });
    }

    if (!active_email) {
      return res.status(400).json({ status: false, message: 'active_email is required' });
    }

    const validActions = ['read', 'unread', 'delete', 'move_to_spam'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ status: false, message: `Invalid action. Must be one of: ${validActions.join(', ')}` });
    }

    const accountsCollection = await getCollection('email_accounts', 'pluto');
    const emailsCollection = await getCollection('emails', 'pluto');

    // Find the account and verify ownership
    const account = await accountsCollection.findOne({
      email: active_email,
      user_id: user.user_id,
      status: 'active'
    });

    if (!account) {
      return res.status(404).json({ status: false, message: 'Account not found or access denied' });
    }

    // Find the email
    const email = await emailsCollection.findOne({ 
      $or: [
        { id: email_id },
        { message_id: email_id }
      ],
      email_account_id: account.id
    });

    if (!email) {
      return res.status(404).json({ status: false, message: 'Email not found' });
    }

    // Handle Google accounts
    if (account.type === 'google') {
      const client = await GmailUtility.getGoogleClient(account);
      const gmail = google.gmail({ version: 'v1', auth: client });
      const messageId = email.message_id || email.id;

      try {
        if (action === 'read' || action === 'unread') {
          // Modify Gmail labels
          await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: {
              removeLabelIds: action === 'read' ? ['UNREAD'] : [],
              addLabelIds: action === 'unread' ? ['UNREAD'] : []
            }
          });

          // Update local database
          await emailsCollection.updateOne(
            { _id: email._id },
            { 
              $set: { 
                read: action === 'read' ? 1 : 0, 
                updated_at: new Date() 
              } 
            }
          );

          console.log(`[email-action] Marked ${messageId} as ${action} for ${active_email}`);
          return res.status(200).json({ 
            status: true, 
            message: `Email marked as ${action}`,
            success: true 
          });
        }

        if (action === 'delete') {
          // Move to trash in Gmail
          await gmail.users.messages.trash({
            userId: 'me',
            id: messageId
          });

          // Update local database - mark as deleted or remove
          await emailsCollection.updateOne(
            { _id: email._id },
            { 
              $set: { 
                category: 'trash',
                deleted_at: new Date(),
                updated_at: new Date() 
              } 
            }
          );

          console.log(`[email-action] Deleted ${messageId} for ${active_email}`);
          return res.status(200).json({ 
            status: true, 
            message: 'Email moved to trash',
            success: true 
          });
        }

        if (action === 'move_to_spam') {
          // Modify Gmail labels - add SPAM, remove INBOX
          await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: {
              removeLabelIds: ['INBOX'],
              addLabelIds: ['SPAM']
            }
          });

          // Update local database
          await emailsCollection.updateOne(
            { _id: email._id },
            { 
              $set: { 
                category: 'spam',
                updated_at: new Date() 
              } 
            }
          );

          console.log(`[email-action] Moved ${messageId} to spam for ${active_email}`);
          return res.status(200).json({ 
            status: true, 
            message: 'Email moved to spam',
            success: true 
          });
        }

      } catch (gmailError) {
        console.error(`[email-action] Gmail API error:`, gmailError.message);
        return res.status(500).json({ 
          status: false, 
          message: `Gmail API error: ${gmailError.message}` 
        });
      }
    }

    // For non-Google accounts, just update local DB
    if (action === 'read' || action === 'unread') {
      await emailsCollection.updateOne(
        { _id: email._id },
        { 
          $set: { 
            read: action === 'read' ? 1 : 0, 
            updated_at: new Date() 
          } 
        }
      );
      return res.status(200).json({ 
        status: true, 
        message: `Email marked as ${action}`,
        success: true 
      });
    }

    return res.status(400).json({ status: false, message: 'Action not supported for this account type' });

  } catch (error) {
    console.error('[email-action] Error:', error);
    return res.status(500).json({ status: false, message: error.message });
  }
}
