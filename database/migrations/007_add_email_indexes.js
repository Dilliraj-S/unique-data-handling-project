module.exports = {
  name: '007_add_email_indexes',
  async up(db) {
    const emails = await db.collection('emails');

    await emails.createIndex(
      { email_account_id: 1, category: 1, received_at: -1 },
      { name: 'email_account_category_received_at_idx' }
    );

    await emails.createIndex(
      { category: 1, status: 1 },
      { name: 'email_category_status_idx' }
    );

    await emails.createIndex(
      { read: 1 },
      { name: 'email_read_idx' }
    );

    await emails.createIndex(
      { account_email: 1, received_at: -1 },
      { name: 'email_account_email_idx', sparse: true }
    );

    await emails.createIndex(
      { subject: 'text', from_email: 'text', from_name: 'text', snippet: 'text' },
      { name: 'email_text_search_idx', default_language: 'none' }
    );
  },

  async down(db) {
    const emails = await db.collection('emails');

    const indexes = [
      'email_account_category_received_at_idx',
      'email_category_status_idx',
      'email_read_idx',
      'email_account_email_idx',
      'email_text_search_idx'
    ];

    for (const indexName of indexes) {
      try {
        await emails.dropIndex(indexName);
      } catch (error) {
        // Ignore missing index
      }
    }
  }
};

