const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('nextjs_stu');
  const user = await db.collection('users').findOne({ username: 'admin' });
  console.log('User status:', user.account_status, 'hash:', user.password ? user.password.substring(0, 15) : 'no password');
  const match = await bcrypt.compare('password123', user.password);
  console.log('Matches password123?:', match);
  if (!match) {
    const hashed = await bcrypt.hash('password123', 10);
    await db.collection('users').updateOne(
      { username: 'admin' },
      { $set: { password: hashed, account_status: 'active', deleted_at: null } }
    );
    console.log('Updated admin password to password123');
  }
  await client.close();
})();
