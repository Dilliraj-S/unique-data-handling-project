/**
 * POST /api/central/emailsystem/drift/preview
 * Preview email with placeholder replacement
 */
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const { template_id, subscriber_id, from_email, sequence_id, subject } = params;

    if (!template_id) {
      return res.status(422).json({ error: 'Template ID is required' });
    }

    const templatesCollection = await getCollection('templates');
    const subscribersCollection = await getCollection('subscribers');
    const emailAccountsCollection = await getCollection('email_accounts');

    // Get template
    let templateObjectId;
    try {
      templateObjectId = new ObjectId(template_id);
    } catch (e) {
      return res.status(422).json({ error: 'Invalid template ID format' });
    }

    const template = await templatesCollection.findOne({ _id: templateObjectId });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    let content = template.content || '';
    let emailSubject = subject || template.subject || '';

    // Subscriber placeholders
    let subscriberReplacements = {
      '[first_name]': 'John',
      '[last_name]': 'Doe',
      '[email]': 'subscriber@example.com',
      '[unsubscribe_link]': sequence_id 
        ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/unsubscribe/${subscriber_id || 'preview'}/${sequence_id}`
        : '#unsubscribe'
    };

    if (subscriber_id) {
      try {
        const subscriberObjectId = new ObjectId(subscriber_id);
        const subscriber = await subscribersCollection.findOne({ _id: subscriberObjectId });
        if (subscriber) {
          subscriberReplacements = {
            '[first_name]': subscriber.first_name || 'Subscriber',
            '[last_name]': subscriber.last_name || '',
            '[email]': subscriber.email || 'subscriber@example.com',
            '[unsubscribe_link]': sequence_id 
              ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/unsubscribe/${subscriber._id}/${sequence_id}`
              : '#unsubscribe'
          };
        }
      } catch (e) {
        console.warn('[Drift] Invalid subscriber ID for preview:', subscriber_id);
      }
    }

    // Email account placeholders
    let emailAccountReplacements = {
      '[sender_email]': from_email || 'sender@example.com',
      '[sender_first_name]': 'Sender',
      '[sender_last_name]': ''
    };

    if (from_email) {
      const emailAccount = await emailAccountsCollection.findOne({ 
        email: from_email, 
        status: 'active' 
      });
      if (emailAccount) {
        emailAccountReplacements = {
          '[sender_email]': emailAccount.email,
          '[sender_first_name]': emailAccount.first_name || 'Sender',
          '[sender_last_name]': emailAccount.last_name || ''
        };
      }
    }

    // Apply replacements
    const allReplacements = { ...subscriberReplacements, ...emailAccountReplacements };

    for (const [placeholder, value] of Object.entries(allReplacements)) {
      content = content.split(placeholder).join(value);
      emailSubject = emailSubject.split(placeholder).join(value);
    }

    return res.status(200).json({
      success: true,
      title: template.title || template.name || 'Email Preview',
      subject: emailSubject,
      content: content
    });
  } catch (error) {
    console.error('[Drift] Error generating preview:', error);
    return res.status(500).json({ error: 'Failed to generate preview: ' + error.message });
  }
}
